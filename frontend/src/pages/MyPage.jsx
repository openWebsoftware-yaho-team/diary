import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, BarChart2, Settings, Lock, AlertTriangle, Sun, Moon, Mail } from 'lucide-react';
import { cn } from '../lib/utils';
import { request } from '../api';

const categoryGradients = {
    '회의': "from-blue-500 to-cyan-400",
    '공부': "from-indigo-500 to-purple-400",
    '약속': "from-orange-500 to-yellow-400",
    '운동': "from-green-500 to-emerald-400",
    '기타': "from-gray-500 to-slate-400"
};

function MyPage({ setTheme, theme }) {
    const isDarkMode = theme === 'dark';
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

    useEffect(() => { loadUserData(); }, [navigate]);

    const handleSettingChange = async (key, value) => {
        try {
            await request('/user/settings', { method: 'PUT', body: { [key]: value } });
            if (key === 'theme') setTheme(value);
            loadUserData();
        } catch (err) { alert(err.message); }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert('새 비밀번호가 서로 일치하지 않습니다.');
            return;
        }
        try {
            const data = await request('/user/update-password', { method: 'PUT', body: { currentPassword, newPassword } });
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

    if (!info) return <div className={cn("text-center py-20", isDarkMode ? "text-white/60" : "text-gray-500")}>데이터를 불러오는 중...🌿</div>;

    const inputClass = cn("w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all", isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900");

    const cardClass = cn("rounded-2xl p-6 border backdrop-blur-sm", 
                         isDarkMode ? "bg-white/5 border-white/10 shadow-none" : "bg-white/80 border-gray-200/50 shadow-lg");

    return (
        <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
            <h1 className={cn("text-3xl font-bold mb-8", isDarkMode ? "text-white" : "text-gray-900")}>마이페이지</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left Column */}
                <div className="space-y-6">
                    {/* 1. Profile & Streak */}
                    <div className={cardClass}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                                <Mail className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-gray-900")}>내 계정 정보</h2>
                                <p className={isDarkMode ? "text-white/60" : "text-gray-500"}>{info.email || '등록된 이메일이 없습니다.'}</p>
                            </div>
                        </div>

                        <div className="rounded-xl bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20 p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                                <Flame className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-orange-600 dark:text-orange-400">연속 일정 관리 스트릭</div>
                                <div className="text-2xl font-black text-orange-500">{info.streak}일 연속 달성 중!</div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Category Stats */}
                    <div className={cardClass}>
                        <div className="flex items-center gap-2 mb-6">
                            <BarChart2 className={cn("w-5 h-5", isDarkMode ? "text-purple-400" : "text-purple-600")} />
                            <h3 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-gray-900")}>카테고리별 분석 통계</h3>
                        </div>
                        
                        {info.totalSchedules === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">아직 분석할 일정 데이터가 없습니다. 🌿</div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(info.categoryStats).map(([cat, count]) => {
                                    const pct = Math.round((count / info.totalSchedules) * 100) || 0;
                                    const gradient = categoryGradients[cat] || categoryGradients['기타'];
                                    return (
                                        <div key={cat}>
                                            <div className="flex justify-between text-sm font-medium mb-2">
                                                <span className={isDarkMode ? "text-white/80" : "text-gray-700"}>{cat} <span className="opacity-60 text-xs">({count}회)</span></span>
                                                <span className={isDarkMode ? "text-white" : "text-gray-900"}>{pct}%</span>
                                            </div>
                                            <div className={cn("h-2.5 rounded-full overflow-hidden", isDarkMode ? "bg-white/10" : "bg-gray-100")}>
                                                <div className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000", gradient)} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* 3. Settings */}
                    <div className={cardClass}>
                        <div className="flex items-center gap-2 mb-6">
                            <Settings className={cn("w-5 h-5", isDarkMode ? "text-cyan-400" : "text-cyan-600")} />
                            <h3 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-gray-900")}>서비스 개인화 설정</h3>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-2 block">화면 테마 모드</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => handleSettingChange('theme', 'light')} 
                                            className={cn("flex items-center justify-center gap-2 py-3 rounded-xl border transition-all", info.theme === 'light' ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm" : "bg-transparent border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5")}>
                                        <Sun className="w-4 h-4" /> 라이트 모드
                                    </button>
                                    <button onClick={() => handleSettingChange('theme', 'dark')} 
                                            className={cn("flex items-center justify-center gap-2 py-3 rounded-xl border transition-all", info.theme === 'dark' ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-sm" : "bg-transparent border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5")}>
                                        <Moon className="w-4 h-4" /> 다크 모드
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-2 block">AI 비서 인식 기본 카테고리</label>
                                <select value={info.defaultCategory || '기타'} onChange={(e) => handleSettingChange('defaultCategory', e.target.value)} className={inputClass}>
                                    {['회의', '공부', '약속', '운동', '기타'].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 4. Password Change */}
                    <div className={cardClass}>
                        <div className="flex items-center gap-2 mb-6">
                            <Lock className={cn("w-5 h-5", isDarkMode ? "text-pink-400" : "text-pink-600")} />
                            <h3 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-gray-900")}>비밀번호 수정</h3>
                        </div>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div><label className="text-sm font-medium text-muted-foreground mb-1 block">현재 비밀번호</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} required /></div>
                            <div><label className="text-sm font-medium text-muted-foreground mb-1 block">새 비밀번호</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} required /></div>
                            <div><label className="text-sm font-medium text-muted-foreground mb-1 block">새 비밀번호 확인</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} required /></div>
                            <button type="submit" className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:shadow-lg hover:shadow-purple-500/25 transition-all">
                                비밀번호 변경하기
                            </button>
                        </form>
                    </div>

                    {/* 5. Danger Zone */}
                    <div className={cn("rounded-2xl p-6 border", isDarkMode ? "bg-red-500/5 border-red-500/20" : "bg-red-50 border-red-100")}>
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <h3 className="text-lg font-bold text-red-500">위험 구역</h3>
                        </div>
                        <p className={cn("text-sm mb-4", isDarkMode ? "text-red-400/80" : "text-red-500/80")}>회원 탈퇴 시 모든 정보가 영구 파기되며 되돌릴 수 없습니다.</p>
                        <button onClick={handleWithdraw} className="w-full py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors">
                            회원 탈퇴하기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MyPage;