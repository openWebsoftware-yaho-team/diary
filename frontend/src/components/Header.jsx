import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { request } from '../api';

function Header({ isAuthenticated, setIsAuthenticated }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            await request('/logout', { method: 'POST' });
            setIsAuthenticated(false);
            navigate('/login');
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <header className="header">
            <div className="header-container">
                <div className="logo" onClick={() => navigate('/')}>
                    YAHO<span> 일정 관리 타임테이블</span>
                </div>

                <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
                    <span></span><span></span><span></span>
                </div>

                <nav id="nav-menu" className={`nav ${menuOpen ? 'show' : ''}`}>
                    <Link to="/" className="nav-item" onClick={() => setMenuOpen(false)}>홈</Link>
                    <Link to="/timeline" className="nav-item" onClick={() => setMenuOpen(false)}>타임라인</Link>
                    <Link to="/calendar" className="nav-item" onClick={() => setMenuOpen(false)}>캘린더</Link>
                    {isAuthenticated && (
                        <Link to="/mypage" className="nav-item" onClick={() => setMenuOpen(false)}>마이페이지</Link>
                    )} {/* ✨ 로그인했을 때만 마이페이지 메뉴 등장 */}

                    {!isAuthenticated ? (
                        <>
                            <Link to="/login" className="nav-item" onClick={() => setMenuOpen(false)}>로그인</Link>
                            <Link to="/signup" className="nav-item" onClick={() => setMenuOpen(false)}>회원가입</Link>
                        </>
                    ) : (
                        <button onClick={handleLogout} className="nav-item logout-btn">로그아웃</button>
                    )}
                </nav>
            </div>
        </header>
    );
}

export default Header;