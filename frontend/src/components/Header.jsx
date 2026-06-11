import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../api';

function Header({ isAuthenticated, setIsAuthenticated, setIsSidebarOpen }) {
    const navigate = useNavigate();
    const [showNoti, setShowNoti] = useState(false); //알림 토글 창 활성화 유무 변수
    const notiRef = useRef(null);

    const handleLogout = async () => {
        try {
            await request('/logout', { method: 'POST' });
            setIsAuthenticated(false);
            navigate('/');
        } catch (err) { 
            alert(err.message); 
        }
    };

    // 알림창 외 다른 영역 클릭하면 자동으로 접힘
    useEffect(() => {
        function handleClickOutside(event) {
            if (notiRef.current && !notiRef.current.contains(event.target)) {
                setShowNoti(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="top-header" style={{ position: 'relative' }}>
            {/* 좁은 화면용 사이드바 열고닫기 버튼 */}
            <div>
                <button className="header-hamburger" onClick={() => setIsSidebarOpen(prev => !prev)}>
                    ☰
                </button>
            </div>

            <div className="header-icons" style={{ display: 'flex', gap: '15px', alignItems: 'center', position: 'relative' }} ref={notiRef}>
                
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button 
                        title="알림 센터 조회" 
                        style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
                        onClick={() => setShowNoti(prev => !prev)}
                    >
                        🔔
                    </button>
                    {/* 새 알림 뜨면 빨간점 */}
                    <span style={{ position: 'absolute', top: '2px', right: '2px', width: '6px', height: '6px', backgroundColor: '#ef4444', borderRadius: '50%' }}></span>
                </div>

                {/* 일단 대충 채워놓고 나중에 시간나면 마저 구현? 근데 백엔드랑 연동해야할수도.. */}
                {showNoti && (
                    <div className="white-card" style={{ position: 'absolute', top: '42px', right: '0', width: '270px', zIndex: 3000, padding: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', color: 'var(--text-brown)', textAlign: 'left' }}>
                            🔔 최근 브리핑 공지
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-brown)', lineHeight: '1.4', textAlign: 'left' }}>
                            📅 <strong>오늘의 알림</strong><br/>
                            아직 처리되지 않은 오늘 일정이 존재합니다. 대시보드를 확인하세요! 💪
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-brown)', lineHeight: '1.4', borderTop: '1px dashed var(--border-color)', paddingTop: '6px', textAlign: 'left' }}>
                            🤖 <strong>AI 스케줄러의 제안</strong><br/>
                            작성하신 라이프 패턴 분석 결과, 한 단계 고도화된 주간 스케줄 대안 조립이 끝났습니다.
                        </div>
                    </div>
                )}

                <button 
                    title="마이페이지 이동" 
                    onClick={() => navigate('/mypage')} 
                    style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
                >
                    👤
                </button>
                
                {isAuthenticated && (
                    <button 
                        onClick={handleLogout} 
                        style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', color: '#888' }}
                    >
                        로그아웃
                    </button>
                )}
            </div>
        </header>
    );
}

export default Header;