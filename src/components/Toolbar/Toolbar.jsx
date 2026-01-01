import React, { useState } from 'react';
import {
    Maximize2,
    Minimize2,
    ArrowDown,
    ArrowUp,
    Plus,
    Download,
    ChevronDown,
    PanelRight,
    PanelRightClose
} from 'lucide-react';
import { useMindmap } from '../../context/MindmapContext';
import './Toolbar.css';

const TOPIC_LABELS = {
    'vitamins': 'Vitamins in Human Body',
    'software-architecture': 'Software Architecture',
    'machine-learning': 'Machine Learning'
};

export default function Toolbar({ onAddNode, isSidebarOpen, onToggleSidebar }) {
    const {
        allTopics,
        currentTopic,
        switchTopic,
        expandAll,
        collapseAll,
        drillDown,
        drillUp,
        drillPath,
        selectedNodeId,
        flatNodes,
        exportData
    } = useMindmap();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const selectedNode = flatNodes.find(n => n.id === selectedNodeId);
    const canDrillDown = selectedNode && selectedNode.hasChildren;
    const canDrillUp = drillPath.length > 0;

    const handleTopicSelect = (topicKey) => {
        switchTopic(topicKey);
        setIsDropdownOpen(false);
    };

    return (
        <div className="toolbar">
            <div className="toolbar-group">
                <button className="toolbar-btn" onClick={expandAll} title="Expand All">
                    <Maximize2 />
                    <span>Expand All</span>
                </button>

                <button className="toolbar-btn" onClick={collapseAll} title="Collapse All">
                    <Minimize2 />
                    <span>Collapse All</span>
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    className="toolbar-btn"
                    onClick={drillDown}
                    disabled={!canDrillDown}
                    title="Drill Down into selected node"
                >
                    <ArrowDown />
                    <span>Drill Down</span>
                </button>

                <button
                    className="toolbar-btn"
                    onClick={drillUp}
                    disabled={!canDrillUp}
                    title="Drill Up to parent level"
                >
                    <ArrowUp />
                    <span>Drill Up</span>
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button
                    className="toolbar-btn primary"
                    onClick={onAddNode}
                    disabled={!selectedNodeId}
                    title="Add child node to selected"
                >
                    <Plus />
                    <span>Add Node</span>
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-group">
                <button className="toolbar-btn success" onClick={exportData} title="Download mindmap data as JSON">
                    <Download />
                    <span>Download</span>
                </button>
            </div>

            {/* Improved Topic Dropdown with floating label style */}
            <div className="topic-dropdown-wrapper">
                <div
                    className={`topic-dropdown ${isDropdownOpen ? 'open' : ''}`}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                    <span className="topic-dropdown-label">Topic</span>
                    <span className="topic-dropdown-value">
                        {TOPIC_LABELS[currentTopic] || currentTopic}
                    </span>
                    <ChevronDown className={`dropdown-arrow ${isDropdownOpen ? 'rotated' : ''}`} />
                </div>

                {isDropdownOpen && (
                    <div className="topic-dropdown-menu">
                        {Object.keys(allTopics).map(key => (
                            <div
                                key={key}
                                className={`topic-dropdown-item ${key === currentTopic ? 'active' : ''}`}
                                onClick={() => handleTopicSelect(key)}
                            >
                                {TOPIC_LABELS[key] || key}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sidebar Toggle in Toolbar */}
            <button
                className="toolbar-btn sidebar-toggle-btn"
                onClick={onToggleSidebar}
                title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
            >
                {isSidebarOpen ? <PanelRightClose /> : <PanelRight />}
            </button>
        </div>
    );
}
