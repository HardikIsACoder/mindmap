import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useMindmap } from '../../context/MindmapContext';
import './AddNodeModal.css';

export default function AddNodeModal({ isOpen, onClose }) {
    const { selectedNodeId, flatNodes, addNode } = useMindmap();
    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');

    const parentNode = flatNodes.find(n => n.id === selectedNodeId);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setSummary('');
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!title.trim() || !parentNode) return;

        const newNode = {
            id: `node-${Date.now()}`,
            title: title.trim(),
            summary: summary.trim() || undefined
        };

        addNode(parentNode.id, newNode);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Add New Node</h3>
                    <button className="modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {parentNode && (
                            <div className="parent-info">
                                <span className="parent-info-label">Adding child to:</span>
                                <span className="parent-info-value">{parentNode.title}</span>
                            </div>
                        )}

                        <div className="modal-field">
                            <label className="modal-label">Node Title *</label>
                            <input
                                type="text"
                                className="modal-input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter node title..."
                                autoFocus
                            />
                        </div>

                        <div className="modal-field">
                            <label className="modal-label">Summary (Optional)</label>
                            <textarea
                                className="modal-input textarea"
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                placeholder="Enter a brief description..."
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="modal-btn modal-btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="modal-btn modal-btn-primary"
                            disabled={!title.trim()}
                        >
                            Add Node
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
