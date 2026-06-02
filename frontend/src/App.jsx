import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Timeline from './pages/Timeline';
import Calendar from './pages/Calendar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MyPage from './pages/MyPage';
import GeminiTest from './pages/GeminiTest';
import { request } from './api';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [theme, setTheme] = useState('light');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            request('/user/me')
                .then(data => setTheme(data.theme || 'light'))
                .catch(() => setIsAuthenticated(false));
        } else {
            setTheme('light');
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (theme === 'dark') document.body.classList.add('dark-theme');
        else document.body.classList.remove('dark-theme');
    }, [theme]);

    return (
        <Router>
            {isAuthenticated ? (
                <div className="app-container">
                    {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}
                    <Sidebar isOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                    
                    <div className="main-wrapper">
                        <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} setIsSidebarOpen={setIsSidebarOpen} />
                        <main className="main-content" style={{ padding: '30px 40px', margin: 0, maxWidth: 'none', textAlign: 'left' }}>
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/timeline" element={<Timeline />} />
                                <Route path="/calendar" element={<Calendar />} />
                                <Route path="/mypage" element={<MyPage setTheme={setTheme} />} />
                                <Route path="/gemini" element={<GeminiTest />} />
                            </Routes>
                        </main>
                    </div>
                </div>
            ) : (
                <Routes>
                    <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="*" element={<Navigate to="/login" />} />
                </Routes>
            )}
        </Router>
    );
}

export default App;