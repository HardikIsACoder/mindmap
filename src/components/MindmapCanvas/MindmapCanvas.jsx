import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useMindmap } from '../../context/MindmapContext';
import { getAncestorIds } from '../../utils/treeUtils';
import './MindmapCanvas.css';

const NODE_COLORS = ['#6eb5ff', '#6abe6a', '#f5a623', '#a78bfa', '#f472b6', '#38bdf8'];

export default function MindmapCanvas() {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const zoomRef = useRef(null);

    // State
    const [tooltip, setTooltip] = useState(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 }); // Start with reasonable defaults

    const {
        treeData,
        isLoading,
        currentTopic,
        drillPath,
        selectedNodeId,
        expandedNodes,
        selectNode,
        toggleExpand,
        setHoveredNodeId,
        getVisibleNodes,
        getVisibleEdges,
        flatNodes
    } = useMindmap();

    // Cache simulation positions to prevent jumping when re-rendering
    const positionsRef = useRef(new Map());
    // Cache zoom transform to prevent zoom glitch on re-render
    const zoomTransformRef = useRef(null);

    // Handle resize
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };

        // Initial size
        updateSize();

        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Main D3 Rendering Effect
    // A human often puts most D3 logic in one big effect for simplicity in small apps
    useEffect(() => {
        if (!treeData || !svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const { width, height } = dimensions;

        // Clear previous content
        svg.selectAll('*').remove();

        // 1. Setup Zoom
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                svg.select('.main-group').attr('transform', event.transform);
                // Cache the current transform
                zoomTransformRef.current = event.transform;
            });

        zoomRef.current = zoom;
        svg.call(zoom);

        // Restore previous zoom transform if exists
        if (zoomTransformRef.current) {
            svg.call(zoom.transform, zoomTransformRef.current);
        }

        // Disable double click zoom
        svg.on("dblclick.zoom", null);

        // 2. Setup Container
        const g = svg.append('g').attr('class', 'main-group');

        // 3. Prepare Data
        const nodes = getVisibleNodes().map(n => ({ ...n })); // Clone to avoid mutation issues
        const links = getVisibleEdges().map(e => ({
            source: e.sourceId,
            target: e.targetId // D3 will convert these to objects
        }));

        // Determine hierarchy level to center logic
        const currentRootId = drillPath.length > 0 ? drillPath[drillPath.length - 1] : treeData.id;
        const rootNode = nodes.find(n => n.id === currentRootId);
        const baseDepth = rootNode ? rootNode.depth : 0;

        // Initialize positions
        nodes.forEach((node, i) => {
            // Restore previous position if exists
            const saved = positionsRef.current.get(node.id);
            if (saved) {
                node.x = saved.x;
                node.y = saved.y;
            } else {
                // Initial spiral layout
                const angle = i * 0.5;
                const dist = 50 + i * 5;
                node.x = width / 2 + Math.cos(angle) * dist;
                node.y = height / 2 + Math.sin(angle) * dist;
            }

            // Assign radius based on relative depth
            const relDepth = Math.max(0, node.depth - baseDepth);
            node.r = relDepth === 0 ? 60 : (relDepth === 1 ? 45 : 35);
            node.color = NODE_COLORS[Math.min(relDepth, NODE_COLORS.length - 1)];
        });

        // 4. Force Simulation - improved for better separation
        const nodeCount = nodes.length;
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id)
                .distance(d => {
                    // Dynamic distance based on node sizes
                    const sourceR = d.source.r || 50;
                    const targetR = d.target.r || 40;
                    return sourceR + targetR + 60;
                })
                .strength(0.5))
            .force('charge', d3.forceManyBody()
                .strength(nodeCount > 15 ? -600 : -400)) // Stronger repulsion for large graphs
            .force('collide', d3.forceCollide(d => d.r + 25).strength(0.8))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('radial', d3.forceRadial(d => {
                const relDepth = d.depth - baseDepth;
                return relDepth * (nodeCount > 15 ? 180 : 150);
            }, width / 2, height / 2).strength(0.4))
            .alphaDecay(0.03)
            .velocityDecay(0.4);

        // 5. Draw Elements

        // Edges
        const link = g.append('g')
            .selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('class', 'edge')
            .style('stroke', '#555')
            .style('stroke-opacity', 0.6)
            .style('stroke-width', 2);

        // Nodes
        const node = g.append('g')
            .selectAll('.node')
            .data(nodes)
            .enter().append('g')
            .attr('class', 'node-group')
            .attr('cursor', 'pointer')
            .on('click', (e, d) => {
                e.stopPropagation();
                selectNode(d.id);
                // Toggle expand/collapse for nodes with children
                if (d.hasChildren) {
                    toggleExpand(d.id);
                }
            });

        // Node Circles
        node.append('circle')
            .attr('r', d => d.r)
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('class', 'node-circle');

        // Selection Ring (Highlighter)
        // A simple human way to handle selection is to re-render or just use a specific class updates
        // Here we just render another circle on top or behind

        // Expand/Collapse Indicators
        node.filter(d => d.hasChildren)
            .append('circle')
            .attr('r', 8)
            .attr('cx', d => d.r - 8)
            .attr('cy', d => -d.r + 8)
            .attr('fill', '#333');

        node.filter(d => d.hasChildren)
            .append('text')
            .text(d => expandedNodes.has(d.id) ? '-' : '+')
            .attr('x', d => d.r - 8)
            .attr('y', d => -d.r + 8)
            .attr('dy', '0.3em')
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .style('font-size', '12px')
            .style('font-weight', 'bold');

        // Labels with proper text wrapping
        node.each(function (d) {
            const nodeGroup = d3.select(this);
            const maxWidth = d.r * 1.6; // Max text width
            const fontSize = d.depth === baseDepth ? 14 : 11;
            const lineHeight = fontSize + 2;

            const text = nodeGroup.append('text')
                .attr('text-anchor', 'middle')
                .style('fill', '#fff')
                .style('font-size', `${fontSize}px`)
                .style('font-weight', '600')
                .style('pointer-events', 'none')
                .style('text-shadow', '0 1px 3px rgba(0,0,0,0.8)');

            const words = d.title.split(/\s+/);
            let line = [];
            let lineNumber = 0;
            let tspan = text.append('tspan').attr('x', 0).attr('dy', 0);

            words.forEach((word, i) => {
                line.push(word);
                tspan.text(line.join(' '));

                // Measure actual text width
                const textLength = tspan.node().getComputedTextLength();

                if (textLength > maxWidth && line.length > 1) {
                    // Remove last word and start new line
                    line.pop();
                    tspan.text(line.join(' '));
                    line = [word];
                    lineNumber++;
                    tspan = text.append('tspan')
                        .attr('x', 0)
                        .attr('dy', lineHeight)
                        .text(word);
                }
            });

            // Center vertically
            const totalHeight = (lineNumber + 1) * lineHeight;
            text.attr('transform', `translate(0, ${-totalHeight / 2 + lineHeight / 2})`);
        });

        // 6. Interaction Logic (Hover)
        node.on('mouseenter', function (e, d) {
            setHoveredNodeId(d.id);
            // Get the bounding rect of the container for relative positioning
            const containerRect = containerRef.current.getBoundingClientRect();
            // Get the position of this node element
            const nodeRect = this.getBoundingClientRect();

            setTooltip({
                // Position tooltip to the right of the node, closer to it
                x: nodeRect.right - containerRect.left + 10,
                y: nodeRect.top - containerRect.top + nodeRect.height / 2 - 30,
                data: d
            });
        }).on('mouseleave', () => {
            setHoveredNodeId(null);
            setTooltip(null);
        });

        // 7. Update Loop
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        // 8. Cleanup and Cache
        return () => {
            simulation.stop();
            // Cache positions for next render
            nodes.forEach(n => positionsRef.current.set(n.id, { x: n.x, y: n.y }));
        };

    }, [treeData, currentTopic, drillPath, expandedNodes, dimensions]); // Re-run when structure changes

    // Separate effect for selection styling only (performance optimization naturally found by devs)
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);

        // Highlight selected node
        svg.selectAll('.node-circle')
            .attr('stroke', d => d.id === selectedNodeId ? '#fff' : 'rgba(255,255,255,0.2)')
            .attr('stroke-width', d => d.id === selectedNodeId ? 4 : 2);

        // Highlight path to selected node
        const ancestorIds = selectedNodeId ? getAncestorIds(selectedNodeId, flatNodes) : [];
        const pathNodeIds = new Set([...ancestorIds, selectedNodeId]);

        svg.selectAll('.edge')
            .style('stroke', d => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                // Highlight if both source and target are in the path
                if (pathNodeIds.has(sourceId) && pathNodeIds.has(targetId)) {
                    return '#6366f1'; // Accent color
                }
                return '#555';
            })
            .style('stroke-width', d => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                if (pathNodeIds.has(sourceId) && pathNodeIds.has(targetId)) {
                    return 3;
                }
                return 2;
            })
            .style('stroke-opacity', d => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                if (pathNodeIds.has(sourceId) && pathNodeIds.has(targetId)) {
                    return 1;
                }
                return 0.5;
            });

    }, [selectedNodeId, flatNodes]);

    // View Controls
    const handleZoom = (scaleInfo) => {
        if (!svgRef.current || !zoomRef.current) return;
        d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, scaleInfo);
    };


    const handleFitView = () => {
        if (!svgRef.current || !zoomRef.current) return;

        const svg = d3.select(svgRef.current);
        const nodeGroups = svg.selectAll('.node-group').nodes();

        if (nodeGroups.length === 0) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        nodeGroups.forEach(nodeEl => {
            const transform = d3.select(nodeEl).attr('transform');
            const match = transform?.match(/translate\(([^,]+),([^)]+)\)/);
            if (match) {
                const x = parseFloat(match[1]);
                const y = parseFloat(match[2]);
                minX = Math.min(minX, x - 80);
                maxX = Math.max(maxX, x + 80);
                minY = Math.min(minY, y - 80);
                maxY = Math.max(maxY, y + 80);
            }
        });

        if (minX === Infinity) return;

        const padding = 100;
        const contentWidth = maxX - minX + 2 * padding;
        const contentHeight = maxY - minY + 2 * padding;
        const scale = Math.min(dimensions.width / contentWidth, dimensions.height / contentHeight, 1.2);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const translateX = dimensions.width / 2 - centerX * scale;
        const translateY = dimensions.height / 2 - centerY * scale;

        svg.transition().duration(750).call(zoomRef.current.transform,
            d3.zoomIdentity.translate(translateX, translateY).scale(scale));
    };


    if (isLoading) return <div className="loading">Loading MindMap...</div>;

    return (
        <div className="mindmap-container" ref={containerRef}>
            <svg ref={svgRef} className="mindmap-svg" />

            <div className="controls">
                <button onClick={() => handleZoom(1.2)}><ZoomIn size={20} /></button>
                <button onClick={() => handleZoom(0.8)}><ZoomOut size={20} /></button>
                <button onClick={handleFitView}><Maximize size={20} /></button>
            </div>

            {tooltip && (
                <div className="tooltip-card" style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}>
                    <strong>{tooltip.data.title}</strong>
                    {tooltip.data.summary && <p>{tooltip.data.summary}</p>}
                    <span className="hint">
                        {tooltip.data.hasChildren ? 'Click to toggle' : 'Leaf node'}
                    </span>
                </div>
            )}
        </div>
    );
}
