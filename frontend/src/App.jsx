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
import Landing from './pages/Landing'; // Landing 페이지
import { request } from './api';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authChecked, setAuthChecked] = useState(false); 
    const [theme, setTheme] = useState('light');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        request('/user/me')
            .then(data => {
                if (data && data.username) {
                    setIsAuthenticated(true);
                    setTheme(data.theme || 'light');
                } else {
                    setIsAuthenticated(false);
                    setTheme('light');
                }
            })
            .catch(() => {
                setIsAuthenticated(false);
                setTheme('light');
            })
            .finally(() => setAuthChecked(true)); // 추가
    }, []);

    useEffect(() => {
        request('/user/me')
            .then(data => {
                if (data && data.username) {
                    setIsAuthenticated(true);
                    setTheme(data.theme || 'light');
                } else {
                    setIsAuthenticated(false);
                    setTheme('light');
                }
            })
            .catch(() => {
                setIsAuthenticated(false);
                setTheme('light');
            });
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            request('/user/me').then(data => {
                if (data && data.theme) setTheme(data.theme);
            }).catch(() => {});
        } else {
            // 로그아웃하면 라이트 모드로 보이게 / 이렇게 안하면 다크 모드랑 충돌남
            setTheme('light');
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (theme === 'dark') document.body.classList.add('dark-theme');
        else document.body.classList.remove('dark-theme');
    }, [theme]);

    // 랜더링.. 때문에 깜빡이는 거 방지
    if (!authChecked) return null; 

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
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            )}
        </Router>
    );
}

export default App;