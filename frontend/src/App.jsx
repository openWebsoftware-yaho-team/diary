import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import Timeline from './pages/Timeline';
import Calendar from './pages/Calendar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MyPage from './pages/MyPage';
import { request } from './api';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [theme, setTheme] = useState('light'); // 전역 테마 상태 추가

    // 1. 로그인 성공 시 유저가 설정해둔 기존 테마 상태를 DB에서 조회
    useEffect(() => {
        if (isAuthenticated) {
            request('/user/me')
                .then(data => {
                    setTheme(data.theme || 'light');
                })
                .catch(() => {
                    setIsAuthenticated(false);
                });
        } else {
            setTheme('light'); // 로그아웃 상태 시 기본 라이트 모드로 리셋
        }
    }, [isAuthenticated]);

    // 2. 테마 상태가 바뀔 때마다 실제 HTML의 body 태그 클래스를 유연하게 탈부착
    useEffect(() => {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }, [theme]);

    return (
        <Router>
            <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
            <main className="main-content">
                <Routes>
                    <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
                    <Route path="/timeline" element={isAuthenticated ? <Timeline /> : <Navigate to="/login" />} />
                    <Route path="/calendar" element={isAuthenticated ? <Calendar /> : <Navigate to="/login" />} />
                    {/* 마이페이지에 테마 변경 함수(setTheme)를 props로 전달합니다. */}
                    <Route path="/mypage" element={isAuthenticated ? <MyPage setTheme={setTheme} /> : <Navigate to="/login" />} />
                    <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
                    <Route path="/signup" element={<Signup />} />
                </Routes>
            </main>
            <Footer />
        </Router>
    );
}

export default App;