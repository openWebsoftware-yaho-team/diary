import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../api';

function MyPage({ setTheme }) {
    const [info, setInfo] = useState(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const navigate = useNavigate();

    // 동적 도넛 차트 및 레이블 색상 정의
    const categoryColors = {
        '회의': '#60A5FA', // 파랑
        '공부': '#4ADE80', // 초록
        '약속': '#FB923C', // 주황
        '운동': '#C084FC', // 보라
        '기타': '#FACC15'  // 노랑
    };

    const loadUserData = () => {
        request('/user/me')
            .then(data => setInfo(data))
            .catch(() => navigate('/login'));
    };
    
    useEffect(() => { 
        loadUserData(); 
    }, [navigate]);

    const handleSettingChange = async (key, value) => {
        try {
            await request('/user/settings', { 
                method: 'PUT', 
                body: { [key]: value } 
            });
            if (key === 'theme') setTheme(value);
            loadUserData();
        } catch (err) { 
            alert(err.message); 
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { 
            alert('새 비밀번호가 서로 일치하지 않습니다.'); 
            return; 
        }
        try {
            const data = await request('/user/update-password', { 
                method: 'PUT', 
                body: { currentPassword, newPassword } 
            });
            alert(data.message);
            setCurrentPassword(''); 
            setNewPassword(''); 
            setConfirmPassword('');
        } catch (err) { 
            alert(err.message); 
        }
    };

    const handleWithdraw = async () => {
        if (!window.confirm('🚨 정말로 탈퇴하시겠습니까?\n탈퇴 시 계정 및 모든 일정 데이터베이스 기록은 즉시 파기됩니다.')) return;
        try {
            const data = await request('/user/withdraw', { method: 'DELETE' });
            alert(data.message);
            window.location.href = '/login';
        } catch (err) { 
            alert(err.message); 
        }
    };

    if (!info) return <div className="no-schedule">데이터를 불러오는 중...🌿</div>;

    // conic-gradient를 활용한 유저 실시간 카테고리 비율 원형 계산기
    const stats = info.categoryStats || {};
    const total = info.totalSchedules || 0;
    
    let currentDegree = 0;
    const conicGradientArgs = total > 0 
        ? Object.entries(stats).map(([cat, count]) => {
            const percentage = (count / total) * 360;
            const color = categoryColors[cat] || '#eee';
            const start = currentDegree;
            currentDegree += percentage;
            return `${color} ${start}deg ${currentDegree}deg`;
        }).join(', ')
        : '#eee 0deg 360deg';

    return (
        <div className="mypage-layout-grid-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 1. 최상단 마이페이지 유저 네임태그 카드 (아이디/이메일 연동 완료) */}
            <div className="white-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
                <div style={{ fontSize: '42px', background: 'var(--bg-body)', border: '1px solid var(--border-color)', width: '75px', height: '75px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🐻</div>
                <div style={{ textAlign: 'left' }}>
                    {/* 로그인 시 입력받은 아이디를 바인딩하고, 없으면 기본 문구를 띄웁니다 */}
                    <h2 style={{ fontSize: '20px', fontWeight: '900', margin: '0 0 4px', color: 'var(--text-brown)' }}>
                        {info.username ? `${info.username} 님` : 'YAHO 유저 님'}
                    </h2>
                    {/* 로그인 시 입력받은 이메일을 바인딩합니다 */}
                    <p style={{ color: 'var(--text-light)', fontSize: '14px', margin: 0, fontWeight: '500' }}>
                        {info.email || '오늘도 열심히 하는 사용자님을 응원합니다!'}
                    </p>
                </div>
            </div>

            {/* 하단 2단 레이아웃 스플릿 스크린 */}
            <div className="dashboard-content-flex" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                
                {/* 왼쪽 컬럼 팩 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 나의 기록 대시보드 위젯 */}
                    <div className="white-card" style={{ textAlign: 'left' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-brown)' }}>나의 기록</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 'bold' }}>🔥 이번 주 일정 스트릭</div>
                                <div style={{ fontSize: '22px', fontWeight: '900', marginTop: '6px', color: 'var(--text-brown)' }}>{info.streak || 0}<span style={{fontSize:'14px', fontWeight:'normal', color: 'var(--text-light)', marginLeft:'2px'}}>일 연속</span></div>
                            </div>
                            <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 'bold' }}>📋 누적 데이터 등록량</div>
                                <div style={{ fontSize: '22px', fontWeight: '900', marginTop: '6px', color: 'var(--text-brown)' }}>{total}<span style={{fontSize:'14px', fontWeight:'normal', color: 'var(--text-light)', marginLeft:'2px'}}>건 달성</span></div>
                            </div>
                        </div>
                    </div>

                    {/* AI 비서 제안 설정 조정판 */}
                    <div className="white-card" style={{ textAlign: 'left' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-brown)' }}>AI 비서 제안 설정</h3>
                        
                        {/* 관심 키워드 태그 해시 컴포넌트 */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-light)' }}>관심 키워드</label>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}># 회의</span>
                                <span style={{ background: '#DCFCE7', color: '#15803D', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}># 프로젝트</span>
                            </div>
                        </div>

                        <div className="quick-modal-form" style={{ gap: '14px' }}>
                            <div className="form-group">
                                <label>AI 추천 빈도</label>
                                <select className="dark-target-input" style={{ background: 'var(--bg-body)', color: 'var(--text-brown)', border: '1px solid var(--border-color)' }}>
                                    <option>주 2회 추천 알림</option>
                                    <option>매일 상시 요약 브리핑</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>AI 추천 인식 시간대</label>
                                <select className="dark-target-input" value={info.defaultCategory || '기타'} onChange={(e) => handleSettingChange('defaultCategory', e.target.value)} style={{ background: 'var(--bg-body)', color: 'var(--text-brown)', border: '1px solid var(--border-color)' }}>
                                    {['회의', '공부', '약속', '운동', '기타'].map(v => <option key={v} value={v}>기본 시간 모드 ({v} 우선순위)</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>서비스 인터페이스 테마</label>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                                    <button type="button" className="btn-submit" style={{ margin: 0, padding: '11px', background: info.theme === 'light' ? 'var(--point-gold)' : 'var(--border-color)', color: info.theme === 'light' ? '#fff' : 'var(--text-brown)' }} onClick={() => handleSettingChange('theme', 'light')}>☀️ 라이트 모드</button>
                                    <button type="button" className="btn-submit" style={{ margin: 0, padding: '11px', background: info.theme === 'dark' ? 'var(--point-gold)' : 'var(--border-color)', color: info.theme === 'dark' ? (info.theme === 'dark' ? '#000' : '#fff') : 'var(--text-brown)' }} onClick={() => handleSettingChange('theme', 'dark')}>🌙 다크 모드</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 우측 컬럼 팩 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 카테고리별 분석 통계 동적 도넛 차트 위젯 */}
                    <div className="white-card" style={{ textAlign: 'left' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-brown)' }}>📊 카테고리별 분석 통계</h3>
                        
                        {total === 0 ? (
                            <div style={{ padding: '30px 0', color: 'var(--text-light)', fontSize: '13px', textAlign: 'center' }}>
                                스케줄 분석 데이터가 부족합니다. 일정을 등록해 보세요! 🌿
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                <div style={{ 
                                    width: '100px', height: '100px', borderRadius: '50%', flexShrink: 0,
                                    background: `conic-gradient(${conicGradientArgs})`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <div style={{ width: '64px', height: '64px', background: 'var(--bg-card)', borderRadius: '50%', transition: 'background-color 0.3s' }}></div>
                                </div>
                                
                                <div style={{ flex: 1, fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    {Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                                        const pct = Math.round((count / total) * 100);
                                        return (
                                            <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: categoryColors[cat] || '#eee' }}></span>
                                                    <span style={{ fontWeight: '600', color: 'var(--text-brown)' }}>{cat}</span>
                                                </div>
                                                <span style={{ fontWeight: 'bold', color: 'var(--text-light)' }}>{pct}% ({count}건)</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 비밀번호 변경 보안 입력창 카드 */}
                    <div className="white-card">
                        <form onSubmit={handlePasswordChange} className="quick-modal-form" style={{ textAlign: 'left' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-brown)' }}>🔒 비밀번호 수정</h3>
                            <div className="form-group">
                                <label>현재 비밀번호</label>
                                <input type="password" placeholder="현재 비밀번호 입력" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required style={{ background: 'var(--bg-body)', color: 'var(--text-brown)', border: '1px solid var(--border-color)' }} />
                            </div>
                            <div className="form-group">
                                <label>새 비밀번호</label>
                                <input type="password" placeholder="변경할 새 비밀번호 입력" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ background: 'var(--bg-body)', color: 'var(--text-brown)', border: '1px solid var(--border-color)' }} />
                            </div>
                            <div className="form-group">
                                <label>새 비밀번호 확인</label>
                                <input type="password" placeholder="새 비밀번호 다시 입력" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={{ background: 'var(--bg-body)', color: 'var(--text-brown)', border: '1px solid var(--border-color)' }} />
                            </div>
                            <button type="submit" className="btn-submit" style={{ marginTop: '4px', padding: '12px' }}>비밀번호 변경하기</button>
                        </form>
                    </div>

                    {/* 영구 계정 삭제 위험 구역 경고 알림판 */}
                    <div className="white-card danger-zone" style={{ border: '1px solid #dc2626', background: info.theme === 'dark' ? '#2D1D1D' : '#fff5f5', padding: '20px', textAlign: 'left', transition: 'background-color 0.3s' }}>
                        <h3 style={{ color: '#dc2626', fontSize: '15px', fontWeight: 'bold', marginBottom: '6px' }}>⚠️ 위험 구역</h3>
                        <p style={{ fontSize: '12px', color: '#ef4444', marginBottom: '16px', lineHeight: '1.4', fontWeight: '500' }}>
                            회원 탈퇴 처리 즉시 등록된 사용자 계정 인프라 및 일정 타임라인 데이터베이스 수집 기록 일체가 영구 파기되며 절대 복구할 수 없습니다.
                        </p>
                        <button type="button" className="btn-submit" style={{ background: '#dc2626', margin: 0, padding: '12px', color: '#fff' }} onClick={handleWithdraw}>
                            🗑️ YAHO 서비스 회원 탈퇴하기
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default MyPage;