import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { request } from '../api';

function Sidebar({ isOpen, setIsSidebarOpen }) {
    const [streakDays, setStreakDays] = useState(0);
    const [currentDateStr, setCurrentDateStr] = useState('');
    const location = useLocation(); // ✨ 사용자의 현재 활성화 주소 경로 감지 엔진

    useEffect(() => {
        // 사용자가 메뉴를 클릭하여 라우팅 경로가 바뀔 때마다 실시간으로 상시 백엔드 데이터베이스 최신 스트릭 일수 동기화[cite: 3]
        request('/user/me')
            .then(data => {
                setStreakDays(data.streak || 0);
            })
            .catch(() => {
                setStreakDays(0);
            });

        // 오늘 날짜 라벨 실시간 계산 처리
        const today = new Date();
        const mm = today.getMonth() + 1;
        const dd = today.getDate();
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayLabel = days[today.getDay()];
        setCurrentDateStr(`${mm}.${dd} (${dayLabel})`);
    }, [isOpen, location.pathname]); // ✨ 페이지를 이동할 때마다 실시간 리프레시 추적 가동!

    const getMenuClass = ({ isActive }) => isActive ? "menu-item active" : "menu-item";

    const handleMenuClick = () => {
        if(setIsSidebarOpen) setIsSidebarOpen(false);
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-logo">
                <h2>YAHO <span>일정 관리</span></h2>
            </div>
            
            <nav className="sidebar-nav">
                <NavLink to="/" className={getMenuClass} onClick={handleMenuClick}>🏠 홈</NavLink>
                <NavLink to="/timeline" className={getMenuClass} onClick={handleMenuClick}>⏳ 타임라인</NavLink>
                <NavLink to="/calendar" className={getMenuClass} onClick={handleMenuClick}>📆 캘린더</NavLink>
                {/* ✨ 순서 교정: AI 비서가 먼저 등장하고 마이페이지가 그 다음 배치 완료 */}
                <NavLink to="/gemini" className={getMenuClass} onClick={handleMenuClick}>🤖 AI 비서</NavLink>
                <NavLink to="/mypage" className={getMenuClass} onClick={handleMenuClick}>👤 마이페이지</NavLink>
            </nav>

            <div className="sidebar-bottom">
                <div className="streak-card">
                    <span className="icon">🔥</span>
                    <div className="text">연속 일정 달성</div>
                    <div className="days">{streakDays}<span>일</span></div>
                    <div className="date">{currentDateStr}</div>
                </div>
                {/* ✨ 친구 초대 리워드 배너 영역 완전 제거 완료 */}
            </div>
        </aside>
    );
}

export default Sidebar;