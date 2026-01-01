import React, { useState, useEffect } from 'react';
import { Pencil, ChevronRight, MousePointer } from 'lucide-react';
import { useMindmap } from '../../context/MindmapContext';
import './Sidebar.css';

// Sub-components for cleaner structure
const NodeMetadata = ({ data }) => {
    if (!data || Object.keys(data).length === 0) return null;

    return (
        <div className="node-section">
            <div className="node-section-label">
                <span>METADATA:</span>
            </div>
            <div className="node-metadata">
                {Object.entries(data).map(([key, value]) => (
                    <div key={key} className="metadata-item">
                        <span className="metadata-label">{key}</span>
                        <span className="metadata-value">{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ChildrenList = ({ children, onSelect }) => {
    if (!children || children.length === 0) return null;

    return (
        <div className="node-section">
            <div className="node-section-label">
                <span>CHILDREN ({children.length}):</span>
            </div>
            <div className="children-list">
                {children.map(child => (
                    <div
                        key={child.id}
                        className="child-item"
                        onClick={() => onSelect(child.id)}
                    >
                        <span className="child-item-dot" />
                        {child.title}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function Sidebar() {
    const {
        selectedNodeId,
        selectNode,
        updateNode,
        flatNodes,
        getBreadcrumbs
    } = useMindmap();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ title: '', summary: '' });

    const selectedNode = flatNodes.find(n => n.id === selectedNodeId);

    useEffect(() => {
        setIsEditing(false);
        if (selectedNode) {
            setFormData({
                title: selectedNode.title,
                summary: selectedNode.summary || ''
            });
        }
    }, [selectedNodeId]);

    if (!selectedNode) {
        return (
            <div className="sidebar">
                <div className="sidebar-header">
                    <h2 className="sidebar-title">Node Inspector</h2>
                </div>
                <div className="sidebar-content empty-state">
                    <MousePointer size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                    <p>Select a node to view details</p>
                </div>
            </div>
        );
    }

    const breadcrumbs = getBreadcrumbs();
    const childrenNodes = flatNodes.filter(n => n.parentId === selectedNode.id);

    const handleSave = () => {
        updateNode(selectedNode.id, formData);
        setIsEditing(false);
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h2 className="sidebar-title">Node Inspector</h2>
            </div>

            {/* Breadcrumbs */}
            <div className="sidebar-breadcrumb">
                {breadcrumbs.map((node, i) => (
                    <React.Fragment key={node.id}>
                        <span
                            className={`breadcrumb-item ${i === breadcrumbs.length - 1 ? 'active' : ''}`}
                            onClick={() => selectNode(node.id)}
                        >
                            {i === 0 ? 'Root' : node.title}
                        </span>
                        {i < breadcrumbs.length - 1 && <ChevronRight size={14} className="separator" />}
                    </React.Fragment>
                ))}
            </div>

            <div className="sidebar-content">
                {isEditing ? (
                    <div className="edit-form">
                        <div className="form-group">
                            <label>Title</label>
                            <input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label>Summary</label>
                            <textarea
                                value={formData.summary}
                                onChange={e => setFormData({ ...formData, summary: e.target.value })}
                                rows={4}
                            />
                        </div>
                        <div className="form-actions">
                            <button className="btn-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
                            <button className="btn-save" onClick={handleSave}>Save</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="node-section">
                            <div className="section-header">
                                <h3>{selectedNode.title}</h3>
                                <button className="btn-icon" onClick={() => setIsEditing(true)} title="Edit Node">
                                    <Pencil size={14} />
                                </button>
                            </div>
                            <p className="summary-text">
                                {selectedNode.summary || <span className="text-muted">No description provided.</span>}
                            </p>
                        </div>

                        <NodeMetadata data={selectedNode.metadata} />

                        <ChildrenList children={childrenNodes} onSelect={selectNode} />

                        <div className="node-section debug-info">
                            <div className="node-section-label">NODE INFO:</div>
                            <div className="node-metadata">
                                <div className="metadata-item">
                                    <span>ID</span>
                                    <code>{selectedNode.id}</code>
                                </div>
                                <div className="metadata-item">
                                    <span>Depth</span>
                                    <code>{selectedNode.depth}</code>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
