import React, { useEffect, useState } from 'react';
import { request } from '../api';

const categoryColors = {
    '회의': 'badge-회의',
    '공부': 'badge-공부',
    '약속': 'badge-약속',
    '운동': 'badge-운동',
    '기타': 'badge-기타'
};

const welcomeMessages = [
    "오늘 하루도 알차게 보내봐요! ✨",
    "차근차근 하나씩 해나가면 돼요! 🐢",
    "멋진 하루가 될 거예요, 응원합니다! 🍀",
    "오늘도 목표를 향해 한 걸음 전진! 🚀"
];

function Dashboard() {
    const [combinedSchedules, setCombinedSchedules] = useState([]);
    const [stats, setStats] = useState({ todayCount: 0, weekTotal: 0, completionRate: 0, streak: 0 });
    const [todayStr, setTodayStr] = useState('');
    const [loading, setLoading] = useState(true);
    const [welcomeMessage, setWelcomeMessage] = useState('');

    const loadDashboardData = () => {
        Promise.all([request('/diary'), request('/user/me')])
            .then(([diaryData, userData]) => {
                const startOfWeek = new Date(diaryData.mon);
                const weekDates = [];
                for (let i = 0; i < 7; i++) {
                    const d = new Date(startOfWeek);
                    d.setDate(startOfWeek.getDate() + i);
                    weekDates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                }

                const regular = diaryData.weekSchedules.map(s => ({ 
                    ...s, 
                    isFixed: false, 
                    isCompleted: s.isCompleted || false 
                }));

                const completedFixedKeys = new Set(diaryData.completedFixedKeys || []);
                const expandedFixed = [];
                
                weekDates.forEach((date, index) => {
                    const matchingFixed = (diaryData.fixedList || []).filter(f => {
                        if (f.dayOfWeek !== index) return false;
                        if (f.startDate && f.startDate > date) return false;
                        if (f.endDate && f.endDate < date) return false;
                        return true;
                    });
                    
                    matchingFixed.forEach(f => {
                        expandedFixed.push({
                            id: `fixed-${f.id}-${date}`,
                            date: date,
                            startTime: f.startTime,
                            endTime: f.endTime,
                            title: `📌 ${f.title}`,
                            category: f.category,
                            isFixed: true,
                            isCompleted: completedFixedKeys.has(`${f.id}-${date}`)
                        });
                    });
                });

                const merged = [...regular, ...expandedFixed].sort((a, b) => {
                    const dateCmp = a.date.localeCompare(b.date);
                    if (dateCmp !== 0) return dateCmp;
                    if (!a.startTime) return 1;
                    if (!b.startTime) return -1;
                    return a.startTime.localeCompare(b.startTime);
                });

                const todayCount = merged.filter(s => s.date === diaryData.today).length;
                const weekTotal = merged.length;
                const completedWeekCount = merged.filter(s => s.isCompleted).length;
                const completionRate = weekTotal > 0 ? Math.round((completedWeekCount / weekTotal) * 100) : 0;

                setCombinedSchedules(merged);
                setStats({ todayCount, weekTotal, completionRate, streak: userData.streak || 0 });
                setTodayStr(diaryData.today);
                setLoading(false);
            })
            .catch(err => {
                alert(err.message);
                setLoading(false);
            });
    };

    useEffect(() => {
        setWelcomeMessage(welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]);
        loadDashboardData();
    }, []);

    const handleToggleComplete = async (id, isFixed, date) => {
        try {
            if (isFixed) {
                const fixedId = String(id).split('-')[1];
                await request('/schedule/fixed-complete', { method: 'PUT', body: { fixedId, date } });
            } else {
                await request(`/schedule/complete/${id}`, { method: 'PUT' });
            }
            
            setCombinedSchedules(prevSchedules => {
                const updated = prevSchedules.map(s => s.id === id ? { ...s, isCompleted: !s.isCompleted } : s);
                const weekTotal = updated.length;
                const completedWeekCount = updated.filter(s => s.isCompleted).length;
                
                setStats(prev => ({
                    ...prev,
                    completionRate: weekTotal > 0 ? Math.round((completedWeekCount / weekTotal) * 100) : 0
                }));
                return updated;
            });
        } catch (err) { alert(err.message); }
    };

    if (loading) return <div className="no-schedule">로딩 중...🌿</div>;

    const todayTasks = combinedSchedules.filter(s => s.date === todayStr);
    const upcomingTasks = combinedSchedules.filter(s => s.date >= todayStr && !s.isCompleted).slice(0, 4);

    return (
        <div className="dashboard-container">
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-brown)' }}>오늘의 일정</h2>
            <p style={{ color: 'var(--text-light)', marginBottom: '24px', fontSize: '14px' }}>{welcomeMessage}</p>

            <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                {/* 상단 통계 위젯 테마화 */}
                {[
                    { icon: "🗓️", label: "오늘 일정", val: stats.todayCount, unit: "건" },
                    { icon: "📋", label: "이번 주 일정", val: stats.weekTotal, unit: "건" },
                    { icon: "⏱️", label: "주간 달성률", val: stats.completionRate, unit: "% 달성" },
                    { icon: "🏆", label: "연속 달성", val: stats.streak, unit: "일째" }
                ].map((w, idx) => (
                    <div key={idx} className="white-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                        <span style={{ fontSize: '24px' }}>{w.icon}</span>
                        <div style={{ color: 'var(--text-light)', fontSize: '13px', fontWeight: 'bold' }}>{w.label}</div>
                        <h3 style={{ margin: 0, fontSize: '26px', fontWeight: '900', color: 'var(--text-brown)' }}>
                            {w.val}<span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-light)', marginLeft: '2px' }}>{w.unit}</span>
                        </h3>
                    </div>
                ))}
            </div>

            <div className="dashboard-content-flex" style={{ display: 'flex', gap: '20px' }}>
                {/* 왼쪽 카드: 다가오는 일정 */}
                <div className="white-card" style={{ flex: 1, textAlign: 'left' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-brown)' }}>곧 다가오는 일정</h3>
                    {upcomingTasks.length === 0 ? (
                        <div style={{ padding: '40px 0', color: 'var(--text-light)', fontSize: '13px', textAlign: 'center' }}>남은 일정이 없습니다. 대기 완료! ✨</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {upcomingTasks.map(task => (
                                <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-body)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--point-gold)', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                            {task.startTime ? task.startTime.substring(0, 5) : '하루'}
                                        </span>
                                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-brown)' }}>{task.title}</span>
                                    </div>
                                    <span className={`badge ${categoryColors[task.category] || 'badge-기타'}`} style={{ margin: 0 }}>
                                        {task.category}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 오른쪽 카드: 오늘 할 일 */}
                <div className="white-card" style={{ flex: 1, textAlign: 'left' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-brown)' }}>오늘 할 일 (To-Do)</h3>
                    {todayTasks.length === 0 ? (
                        <div style={{ padding: '40px 0', color: 'var(--text-light)', fontSize: '13px', textAlign: 'center' }}>오늘 등록된 스케줄이 비어있습니다. 🌿</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {todayTasks.map(task => (
                                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--bg-body)', borderRadius: '12px', border: '1px solid var(--border-color)' }} className={task.isCompleted ? 'completed-task' : ''}>
                                    <input type="checkbox" className="task-checkbox" checked={task.isCompleted} onChange={() => handleToggleComplete(task.id, task.isFixed, task.date)} />
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-brown)' }}>{task.title}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;