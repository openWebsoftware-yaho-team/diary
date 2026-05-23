import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../api';

function MyPage({ setTheme }) { // 부모에게 받은 setTheme 구조 분해 할당
    const [info, setInfo] = useState(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const navigate = useNavigate();

    const loadUserData = () => {
        request('/user/me')
            .then(data => setInfo(data))
            .catch(err => {
                alert(err.message);
                navigate('/login');
            });
    };

    useEffect(() => {
        loadUserData();
    }, [navigate]);

    // 개인설정 (테마 및 기본 카테고리) 변경 핸들러
    const handleSettingChange = async (key, value) => {
        try {
            // 주소 경로 교정: /settings -> /user/settings
            await request('/user/settings', {
                method: 'PUT',
                body: { [key]: value }
            });
            
            if (key === 'theme') {
                setTheme(value); // ✨ 테마 변경 시 상위 App.jsx의 상태를 깨워 온 동네 화면을 실시간 스위칭!
            }
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
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err) { alert(err.message); }
    };

    const handleWithdraw = async () => {
        if (!window.confirm('🚨 정말로 탈퇴하시겠습니까?\n탈퇴 시 계정 및 모든 일정 데이터베이스 기록은 즉시 파기됩니다.')) return;
        try {
            const data = await request('/user/withdraw', { method: 'DELETE' });
            alert(data.message);
            window.location.href = '/login';
        } catch (err) { alert(err.message); }
    };

    if (!info) return <div className="no-schedule">데이터를 불러오는 중...🌿</div>;

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 10px' }}>
            {/* 1. 프로필 및 스트릭 카드 */}
            <div className="auth-card" style={{ maxWidth: '100%', marginBottom: '20px' }}>
                <h2>마이페이지</h2>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>{info.email || '등록된 이메일이 없습니다.'}</p>
                
                <div className="streak-banner" style={{ background: '#fff9e1', padding: '20px', borderRadius: '15px', border: '1px solid #ffe0b2', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '40px' }}>🔥</span>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '13px', color: '#c0621a', fontWeight: 'bold' }}>연속 일정 관리 스트릭</div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#e65100' }}>{info.streak}일 연속 달성 중!</div>
                    </div>
                </div>
            </div>

            {/* 2. 카테고리 비율 통계 카드 */}
            <div className="auth-card" style={{ maxWidth: '100%', marginBottom: '20px', textAlign: 'left' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--text-brown)' }}>📊 카테고리별 분석 통계</h3>
                {info.totalSchedules === 0 ? (
                    <div className="no-schedule" style={{ padding: '20px 0' }}>아직 분석할 일정 데이터가 없습니다. 🌿</div>
                ) : (
                    Object.entries(info.categoryStats).map(([cat, count]) => {
                        const pct = Math.round((count / info.totalSchedules) * 100) || 0;
                        return (
                            <div key={cat} style={{ marginBottom: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold' }}>
                                    <span>{cat} ({count}회)</span>
                                    <span>{pct}%</span>
                                </div>
                                <div style={{ width: '100%', height: '10px', background: '#eee', borderRadius: '5px', overflow: 'hidden' }}>
                                    <div className={`bg-pastel-${cat === '회의' ? 'blue' : cat === '공부' ? 'green' : cat === '약속' ? 'orange' : cat === '운동' ? 'purple' : 'yellow'}`} style={{ width: `${pct}%`, height: '100%' }}></div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* 3. 서비스 개인화 설정 카드 */}
            <div className="auth-card" style={{ maxWidth: '100%', marginBottom: '20px', textAlign: 'left' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--text-brown)' }}>⚙️ 서비스 개인화 설정</h3>
                
                <div className="form-group">
                    <label>화면 테마 모드</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                        <button type="button" className="btn-auth" style={{ margin: 0, background: info.theme === 'light' ? 'var(--point-gold)' : '#bbb' }} onClick={() => handleSettingChange('theme', 'light')}>☀️ 라이트 모드</button>
                        <button type="button" className="btn-auth" style={{ margin: 0, background: info.theme === 'dark' ? '#4a5568' : '#bbb' }} onClick={() => handleSettingChange('theme', 'dark')}>🌙 다크 모드</button>
                    </div>
                </div>

                <div className="form-group" style={{ marginTop: '20px' }}>
                    <label>AI 비서 인식 기본 카테고리</label>
                    <select className="dark-target-input" value={info.defaultCategory} onChange={(e) => handleSettingChange('defaultCategory', e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #eee', background: '#fafafa', fontSize: '14px', marginTop: '5px', outline: 'none' }}>
                        {['회의', '공부', '약속', '운동', '기타'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
            </div>

            {/* 4. 비밀번호 수정 카드 */}
            <div className="auth-card" style={{ maxWidth: '100%', marginBottom: '20px' }}>
                <form onSubmit={handlePasswordChange}>
                    <h3 style={{ marginBottom: '20px', textAlign: 'left', color: 'var(--text-brown)' }}>🔒 비밀번호 수정</h3>
                    <div className="form-group"><label>현재 비밀번호</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></div>
                    <div className="form-group"><label>새 비밀번호</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required /></div>
                    <div className="form-group"><label>새 비밀번호 확인</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div>
                    <button type="submit" className="btn-auth">비밀번호 변경하기</button>
                </form>
            </div>

            {/* 5. 위험 구역 카드 */}
            <div className="auth-card danger-zone" style={{ maxWidth: '100%', marginBottom: '5px', border: '1px solid #ffcdd2', background: '#fff5f5' }}>
                <h3 style={{ textAlign: 'left', color: '#d32f2f', marginBottom: '10px' }}>⚠️ 위험 구역</h3>
                <p style={{ textAlign: 'left', fontSize: '13px', color: '#e53935', marginBottom: '15px' }}>회원 탈퇴 시 모든 정보가 영구 파기되며 되돌릴 수 없습니다.</p>
                <button type="button" className="btn-auth" style={{ background: '#d32f2f', margin: 0 }} onClick={handleWithdraw}>🗑️ 회원 탈퇴하기</button>
            </div>
        </div>
    );
}

export default MyPage;