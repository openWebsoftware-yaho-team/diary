import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../api';

function Header({ isAuthenticated, setIsAuthenticated, setIsSidebarOpen }) {
    const navigate = useNavigate();
    const [showNoti, setShowNoti] = useState(false); // ✨ 알림 토글 창 활성화 유무 변수
    const notiRef = useRef(null);

    const handleLogout = async () => {
        try {
            await request('/logout', { method: 'POST' });
            setIsAuthenticated(false);
            navigate('/login');
        } catch (err) { 
            alert(err.message); 
        }
    };

    // 알림창이 열려있을 때 다른 빈 화면 영역 마우스 클릭 시 자동으로 슬림 접기 제어
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
            {/* 좌측: 모바일 환경에서만 활성화되는 트리거 버튼 */}
            <div>
                <button className="header-hamburger" onClick={() => setIsSidebarOpen(prev => !prev)}>
                    ☰
                </button>
            </div>

            {/* 우측 아이콘 세션 그룹 콘솔 */}
            <div className="header-icons" style={{ display: 'flex', gap: '15px', alignItems: 'center', position: 'relative' }} ref={notiRef}>
                
                {/* 알림 단추 코어 영역 */}
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button 
                        title="알림 센터 조회" 
                        style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
                        onClick={() => setShowNoti(prev => !prev)}
                    >
                        🔔
                    </button>
                    {/* 신규 알림을 상징하는 고급 레드 미니 닷 알림 인디케이터 배지 */}
                    <span style={{ position: 'absolute', top: '2px', right: '2px', width: '6px', height: '6px', backgroundColor: '#ef4444', borderRadius: '50%' }}></span>
                </div>

                {/* ✨ 상호작용 요소: 알림 버튼을 누르면 부드럽게 펼쳐지는 동적 안내 팝업창 박스 */}
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
                            🤖 <strong>AI 비서 제안</strong><br/>
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