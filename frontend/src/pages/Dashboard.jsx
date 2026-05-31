import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '../lib/utils';
import { request } from '../api';

const categoryColors = {
  '회의': "from-blue-500 to-cyan-400",
  '공부': "from-indigo-500 to-purple-400",
  '약속': "from-orange-500 to-yellow-400",
  '운동': "from-green-500 to-emerald-400",
  '기타': "from-gray-500 to-slate-400"
};

const categoryBgColors = {
  '회의': { light: "bg-blue-100 border-blue-200", dark: "bg-blue-500/20 border-blue-500/30" },
  '공부': { light: "bg-indigo-100 border-indigo-200", dark: "bg-indigo-500/20 border-indigo-500/30" },
  '약속': { light: "bg-orange-100 border-orange-200", dark: "bg-orange-500/20 border-orange-500/30" },
  '운동': { light: "bg-green-100 border-green-200", dark: "bg-green-500/20 border-green-500/30" },
  '기타': { light: "bg-gray-100 border-gray-200", dark: "bg-gray-500/20 border-gray-500/30" }
};

const welcomeMessages = [
    "넌 할 수 있어! 오늘도 화이팅~ 💪",
    "오늘 하루도 알차게 보내봐요! ✨",
    "멋진 하루가 될 거예요, 응원합니다! 🍀"
];

function Dashboard({ theme }) {
    const isDarkMode = theme === 'dark';
    const [combinedSchedules, setCombinedSchedules] = useState([]);
    const [stats, setStats] = useState({ todayCount: 0, weekTotal: 0, remainingCount: 0 });
    const [loading, setLoading] = useState(true);
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [todayStr, setTodayStr] = useState('');
    
    // (이전 Dashboard.jsx의 API 로직과 완벽히 동일합니다)
    useEffect(() => {
        setWelcomeMessage(welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]);
        request('/diary').then(data => {
            const startOfWeek = new Date(data.mon);
            const weekDates = Array.from({length: 7}, (_, i) => {
                const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            });

            const regular = data.weekSchedules.map(s => ({ ...s, isFixed: false }));
            const completedFixedKeys = new Set(data.completedFixedKeys || []);
            const expandedFixed = [];
            
            weekDates.forEach((date, index) => {
                const matchingFixed = (data.fixedList || []).filter(f => {
                    if (f.dayOfWeek !== index) return false;
                    if (f.startDate && f.startDate > date) return false;
                    if (f.endDate && f.endDate < date) return false;
                    return true;
                });
                matchingFixed.forEach(f => expandedFixed.push({
                    id: `fixed-${f.id}-${date}`, date, startTime: f.startTime, endTime: f.endTime,
                    title: `📌 ${f.title}`, category: f.category, isFixed: true, isCompleted: completedFixedKeys.has(`${f.id}-${date}`)
                }));
            });

            const merged = [...regular, ...expandedFixed].sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''));
            const todayCount = merged.filter(s => s.date === data.today).length;
            setCombinedSchedules(merged);
            setStats({ todayCount, weekTotal: merged.length, remainingCount: merged.length - todayCount });
            setTodayStr(data.today);
            setLoading(false);
        }).catch(err => { alert(err.message); setLoading(false); });
    }, []);

    const handleToggleComplete = async (id, isFixed, date) => {
        if (isFixed) {
            await request('/schedule/fixed-complete', { method: 'PUT', body: { fixedId: String(id).split('-')[1], date } });
        } else {
            await request(`/schedule/complete/${id}`, { method: 'PUT' });
        }
        setCombinedSchedules(prev => prev.map(s => s.id === id ? { ...s, isCompleted: !s.isCompleted } : s));
    };

    if (loading) return <div className={cn("text-center py-20", isDarkMode ? "text-white/60" : "text-gray-500")}>일정을 불러오는 중...🌿</div>;

    const todaySchedules = combinedSchedules.filter(s => s.date === todayStr);
    const completedTodayCount = todaySchedules.filter(s => s.isCompleted).length;
    const progressPercent = todaySchedules.length > 0 ? (completedTodayCount / todaySchedules.length) * 100 : 0;

    return (
        <div className="animate-in fade-in duration-500">
            {/* Header Greeting */}
            <div className="mb-8">
                <h1 className={cn("text-3xl font-bold mb-2", isDarkMode ? "text-white" : "text-gray-900")}>
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">YAHO!</span> {welcomeMessage}
                </h1>
                <p className={isDarkMode ? "text-white/60" : "text-gray-600"}>오늘 {todayStr} 의 일정을 확인해보세요.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className={cn("rounded-xl p-6 border backdrop-blur-sm relative overflow-hidden group", isDarkMode ? "bg-white/5 border-white/10" : "bg-white/80 border-gray-200/50 shadow-lg shadow-purple-500/5")}>
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className={cn("text-sm font-medium mb-4", isDarkMode ? "text-white/60" : "text-gray-600")}>오늘의 진행률</h3>
                    <div className={cn("text-4xl font-bold mb-3", isDarkMode ? "text-white" : "text-gray-900")}>{Math.round(progressPercent)}%</div>
                    <div className={cn("h-2 rounded-full overflow-hidden", isDarkMode ? "bg-white/10" : "bg-gray-200")}>
                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <p className={cn("text-sm mt-2", isDarkMode ? "text-white/60" : "text-gray-600")}>{completedTodayCount} / {todaySchedules.length} 완료</p>
                </div>

                <div className={cn("rounded-xl p-6 border backdrop-blur-sm relative overflow-hidden group", isDarkMode ? "bg-white/5 border-white/10" : "bg-white/80 border-gray-200/50 shadow-lg shadow-cyan-500/5")}>
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className={cn("text-sm font-medium mb-4", isDarkMode ? "text-white/60" : "text-gray-600")}>이번 주 전체 일정</h3>
                    <div className={cn("text-4xl font-bold mb-1", isDarkMode ? "text-white" : "text-gray-900")}>{stats.weekTotal}개</div>
                    <p className={cn("text-sm", isDarkMode ? "text-white/60" : "text-gray-600")}>앞으로 남은 일정: {stats.remainingCount}개</p>
                </div>
            </div>

            {/* Today's Schedules List */}
            <div className={cn("rounded-xl p-6 border backdrop-blur-sm", isDarkMode ? "bg-white/5 border-white/10" : "bg-white/80 border-gray-200/50 shadow-lg")}>
                <h2 className={cn("text-xl font-bold mb-6", isDarkMode ? "text-white" : "text-gray-900")}>오늘의 일정 상세</h2>
                
                {todaySchedules.length > 0 ? (
                    <div className="space-y-3">
                        {todaySchedules.map((schedule) => (
                            <div key={schedule.id} onClick={() => handleToggleComplete(schedule.id, schedule.isFixed, schedule.date)} className={cn("flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer group", isDarkMode ? categoryBgColors[schedule.category || '기타'].dark : categoryBgColors[schedule.category || '기타'].light, schedule.isCompleted && "opacity-60")}>
                                <div className={cn("w-1 h-12 rounded-full bg-gradient-to-b", categoryColors[schedule.category || '기타'])} />
                                <div className="flex-1">
                                    <h4 className={cn("font-semibold transition-all", schedule.isCompleted && "line-through", schedule.isCompleted ? (isDarkMode ? "text-white/40" : "text-gray-400") : (isDarkMode ? "text-white" : "text-gray-900"))}>
                                        {schedule.title}
                                    </h4>
                                    <p className={cn("text-sm", isDarkMode ? "text-white/60" : "text-gray-600")}>{schedule.startTime ? schedule.startTime.substring(0,5) : '-'} ~ {schedule.endTime ? schedule.endTime.substring(0,5) : '-'}</p>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    {schedule.isCompleted ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className={cn("w-6 h-6", isDarkMode ? "text-white/40" : "text-gray-400")} />}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className={cn("text-center py-10", isDarkMode ? "text-white/40" : "text-gray-400")}>오늘 등록된 일정이 없어요 🌿</p>
                )}
            </div>
        </div>
    );
}

export default Dashboard;