import React, { useState } from 'react';
import { MindmapProvider, useMindmap } from './context/MindmapContext';
import Toolbar from './components/Toolbar/Toolbar';
import MindmapCanvas from './components/MindmapCanvas/MindmapCanvas';
import Sidebar from './components/Sidebar/Sidebar';
import AddNodeModal from './components/AddNodeModal/AddNodeModal';
import './App.css';

function AppContent() {
    const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const { isLoading } = useMindmap();

    if (isLoading) {
        return (
            <div className="app loading-state">
                <div className="spinner-container">
                    <div className="spinner"></div>
                    <p>Loading mindmap...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <Toolbar
                onAddNode={() => setIsAddNodeModalOpen(true)}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            <main className="main-content">
                <MindmapCanvas />
                {isSidebarOpen && <Sidebar />}
            </main>

            <AddNodeModal
                isOpen={isAddNodeModalOpen}
                onClose={() => setIsAddNodeModalOpen(false)}
            />
        </div>
    );
}

function App() {
    return (
        <MindmapProvider>
            <AppContent />
        </MindmapProvider>
    );
}

export default App;
