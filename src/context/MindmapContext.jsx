import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    flattenTree,
    getDescendantIds,
    getAncestorIds,
    updateNodeInTree,
    addNodeToTree,
    removeNodeFromTree
} from '../utils/treeUtils';

const MindmapContext = createContext(null);

export function MindmapProvider({ children }) {
    // Core data state
    const [allTopics, setAllTopics] = useState({});
    const [currentTopicKey, setCurrentTopicKey] = useState('vitamins');
    const [isLoading, setIsLoading] = useState(true);

    // UI state
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [drillPath, setDrillPath] = useState([]);
    const [hoveredNodeId, setHoveredNodeId] = useState(null);

    // Initial data load
    useEffect(() => {
        fetch('/mindmap-data.json')
            .then(res => res.json())
            .then(data => {
                setAllTopics(data);
                setIsLoading(false);

                // Initialize view with the default topic
                const defaultTopic = data['vitamins'];
                if (defaultTopic) {
                    setSelectedNodeId(defaultTopic.id);
                    // Expand root by default
                    setExpandedNodes(new Set([defaultTopic.id]));
                }
            })
            .catch(err => {
                console.error("Failed to load mindmap data", err);
                setIsLoading(false);
            });
    }, []);

    // Derived state: Current Tree & Flat List
    // A human often calculates this on the fly or in render if it's not too expensive, 
    // rather than keeping separate synchronized state which causes bugs.
    const currentTree = allTopics[currentTopicKey];
    const flatNodes = currentTree ? flattenTree(currentTree) : [];

    // ACTIONS ----------------------------------------------------------------

    const switchTopic = (topicKey) => {
        if (!allTopics[topicKey]) return;

        setCurrentTopicKey(topicKey);
        setDrillPath([]); // Reset drill down

        const newRootId = allTopics[topicKey].id;
        setSelectedNodeId(newRootId);
        setExpandedNodes(new Set([newRootId]));
    };

    const toggleExpand = (nodeId) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                // Collapse: remove ID
                next.delete(nodeId);
                // Optional: remove descendants too to keep state clean
                const descendants = getDescendantIds(nodeId, flatNodes);
                descendants.forEach(id => next.delete(id));
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    const expandAll = () => {
        const allIds = flatNodes.map(n => n.id);
        setExpandedNodes(new Set(allIds));
    };

    const collapseAll = () => {
        if (currentTree) {
            setExpandedNodes(new Set([currentTree.id]));
        }
    };

    // Navigation
    const drillDown = () => {
        if (!selectedNodeId) return;
        // Only drill down if node has children
        const node = flatNodes.find(n => n.id === selectedNodeId);
        if (node && node.hasChildren) {
            setDrillPath(prev => [...prev, selectedNodeId]);
        }
    };

    const drillUp = () => {
        setDrillPath(prev => prev.slice(0, -1));
    };

    // CRUD Operations
    const handleUpdateNode = (nodeId, updates) => {
        const updatedTree = updateNodeInTree(currentTree, nodeId, updates);

        setAllTopics(prev => ({
            ...prev,
            [currentTopicKey]: updatedTree
        }));
    };

    const handleAddNode = (parentId, newNode) => {
        const updatedTree = addNodeToTree(currentTree, parentId, newNode);

        setAllTopics(prev => ({
            ...prev,
            [currentTopicKey]: updatedTree
        }));

        // UX: Auto-expand parent and select new node
        setExpandedNodes(prev => new Set([...prev, parentId]));
        setSelectedNodeId(newNode.id);
    };

    const handleDeleteNode = (nodeId) => {
        const nodeToDelete = flatNodes.find(n => n.id === nodeId);
        if (!nodeToDelete || !nodeToDelete.parentId) return; // Can't delete root

        const updatedTree = removeNodeFromTree(currentTree, nodeId);

        setAllTopics(prev => ({
            ...prev,
            [currentTopicKey]: updatedTree
        }));

        // Select parent after deletion
        setSelectedNodeId(nodeToDelete.parentId);
    };

    // View Helpers
    const getVisibleNodes = () => {
        if (!currentTree) return [];

        // Determine effective root (based on drill down)
        const viewRootId = drillPath.length > 0
            ? drillPath[drillPath.length - 1]
            : currentTree.id;

        // Traverse down from view root, checking expanded state
        const visibleids = new Set([viewRootId]);

        const traverse = (id) => {
            if (expandedNodes.has(id)) {
                const children = flatNodes.filter(n => n.parentId === id);
                children.forEach(child => {
                    visibleids.add(child.id);
                    traverse(child.id);
                });
            }
        };

        traverse(viewRootId);
        return flatNodes.filter(n => visibleids.has(n.id));
    };

    const getEdges = () => {
        const visible = getVisibleNodes();
        const visibleIds = new Set(visible.map(n => n.id));

        return visible
            .filter(node => node.parentId && visibleIds.has(node.parentId))
            .map(node => ({
                sourceId: node.parentId,
                targetId: node.id
            }));
    };

    const downloadData = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allTopics, null, 2));
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute("download", "mindmap.json");
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    };

    return (
        <MindmapContext.Provider value={{
            // Data
            allTopics,
            currentTopic: currentTopicKey, // Renamed for clarity in consumption
            treeData: currentTree,
            flatNodes,
            isLoading,

            // State
            selectedNodeId,
            expandedNodes,
            drillPath,
            hoveredNodeId,

            // Setters
            setHoveredNodeId, // Exposed raw setter is fine
            selectNode: setSelectedNodeId, // Helper alias

            // Actions
            switchTopic,
            toggleExpand,
            expandAll,
            collapseAll,
            drillDown,
            drillUp,
            updateNode: handleUpdateNode,
            addNode: handleAddNode,
            deleteNode: handleDeleteNode,
            exportData: downloadData,

            // Getters
            getVisibleNodes,
            getVisibleEdges: getEdges,
            getBreadcrumbs: () => getAncestorIds(selectedNodeId, flatNodes).map(id => flatNodes.find(n => n.id === id)).filter(Boolean)
        }}>
            {children}
        </MindmapContext.Provider>
    );
}

export const useMindmap = () => useContext(MindmapContext);
