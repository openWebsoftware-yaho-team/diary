import React, { useEffect, useState } from 'react';
import { request } from '../api';

const categoryColors = {
    '회의': 'badge-회의',
    '공부': 'badge-공부',
    '약속': 'badge-약속',
    '운동': 'badge-운동',
    '기타': 'badge-기타'
};

// 랜덤 환영 문구 리스트
const welcomeMessages = [
    "넌 할 수 있어! 오늘도 화이팅~ 💪",
    "오늘 하루도 알차게 보내봐요! ✨",
    "차근차근 하나씩 해나가면 돼요! 🐢",
    "멋진 하루가 될 거예요, 응원합니다! 🍀",
    "오늘도 목표를 향해 한 걸음 전진! 🚀"
];

function Dashboard() {
    const [combinedSchedules, setCombinedSchedules] = useState([]);
    const [stats, setStats] = useState({ todayCount: 0, weekTotal: 0, remainingCount: 0 });
    const [todayStr, setTodayStr] = useState('');
    const [loading, setLoading] = useState(true);
    const [welcomeMessage, setWelcomeMessage] = useState(''); // ✨ 환영 문구 상태
    const days = ['일', '월', '화', '수', '목', '금', '토'];

    useEffect(() => {
        // ✨ 컴포넌트 마운트 시 랜덤 환영 문구 설정
        const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
        setWelcomeMessage(welcomeMessages[randomIndex]);

        request('/diary')
            .then(data => {
                const startOfWeek = new Date(data.mon);
                const weekDates = [];
                for (let i = 0; i < 7; i++) {
                    const d = new Date(startOfWeek);
                    d.setDate(startOfWeek.getDate() + i);
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    weekDates.push(`${year}-${month}-${day}`);
                }

                // ✨ 일반 일정에 isCompleted 상태 추가
                const regular = data.weekSchedules.map(s => ({ 
                    ...s, 
                    isFixed: false, 
                    isCompleted: s.isCompleted || false 
                }));

                // ✨ 고정 일정에 isCompleted 상태 추가
                const completedFixedKeys = new Set(data.completedFixedKeys || []);

                const expandedFixed = [];
                weekDates.forEach((date, index) => {
                const matchingFixed = (data.fixedList || []).filter(f => {
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

                const todayCount = merged.filter(s => s.date === data.today).length;
                const weekTotal = merged.length;

                setCombinedSchedules(merged);
                setStats({
                    todayCount,
                    weekTotal,
                    remainingCount: weekTotal - todayCount
                });
                setTodayStr(data.today);
                setLoading(false);
            })
            .catch(err => {
                alert(err.message);
                setLoading(false);
            });
    }, []);

    // ✨ 체크박스 클릭 시 완료 상태 토글 함수
    const handleToggleComplete = async (id, isFixed, date) => {
        if (isFixed) {
            const fixedId = String(id).split('-')[1]; // "fixed-3-2026-05-29" → "3"
            await request('/schedule/fixed-complete', { method: 'PUT', body: { fixedId, date } });
        } else {
            await request(`/schedule/complete/${id}`, { method: 'PUT' });
        }
        setCombinedSchedules(prevSchedules =>
            prevSchedules.map(schedule =>
                schedule.id === id
                    ? { ...schedule, isCompleted: !schedule.isCompleted }
                    : schedule
            )
        );
    };

    if (loading) return <div className="no-schedule">로딩 중...🌿</div>;

    return (
        <>
            {/* ✨ 환영 문구 표시 영역 */}
            <h2 className="welcome-message">{welcomeMessage}</h2>

            <div className="stat-section">
                <div className="stat-card">
                    <span className="stat-icon">📅</span>
                    <span className="stat-num">{stats.todayCount}</span>
                    <span className="stat-label">오늘 일정</span>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">📋</span>
                    <span className="stat-num">{stats.weekTotal}</span>
                    <span className="stat-label">이번 주 전체</span>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">✅</span>
                    <span className="stat-num">{stats.remainingCount}</span>
                    <span className="stat-label">오늘 이후 남은 일정</span>
                </div>
            </div>

            <div className="section-title">이번 주 일정</div>

            {combinedSchedules.length > 0 ? (
                <table className="week-table">
                    <thead>
                        <tr>
                            {/* ✨ 체크박스용 헤더 추가 및 비율 조정 */}
                            <th style={{ width: '5%', textAlign: 'center' }}>✓</th>
                            <th style={{ width: '15%' }}>날짜</th>
                            <th style={{ width: '10%' }}>요일</th>
                            <th style={{ width: '15%' }}>시간</th>
                            <th style={{ width: '20%' }}>일정</th>
                            <th style={{ width: '10%' }}>카테고리</th>
                            <th className="col-memo-home" style={{ width: '25%' }}>종료</th>
                        </tr>
                    </thead>
                    <tbody>
                        {combinedSchedules.map((s) => {
                            const isToday = s.date === todayStr;
                            const dayOfWeekStr = days[new Date(s.date).getDay()] + '요일';
                            const badgeClass = categoryColors[s.category] || 'badge-기타';
                            
                            // ✨ 완료 상태에 따라 tr 태그에 클래스 동적 부여
                            const rowClass = `${isToday ? 'is-today' : ''} ${s.isCompleted ? 'completed-task' : ''}`.trim();

                            return (
                                <tr key={s.id} className={rowClass}>
                                    {/* ✨ 체크박스 셀 추가 */}
                                    <td style={{ textAlign: 'center' }}>
                                        <input 
                                            type="checkbox" 
                                            className="task-checkbox"
                                            checked={s.isCompleted} 
                                            onChange={() => handleToggleComplete(s.id, s.isFixed, s.date)}
                                        />
                                    </td>
                                    <td>{s.date}</td>
                                    <td>{dayOfWeekStr}</td>
                                    <td>{s.startTime ? s.startTime.substring(0, 5) : '-'}</td>
                                    {/* 취소선 스타일을 위해 span으로 감싸기 */}
                                    <td><span>{s.title}</span></td>
                                    <td>
                                        <span className={`badge ${badgeClass}`}>{s.category}</span>
                                    </td>
                                    <td className="col-memo-home">{s.endTime ? s.endTime.substring(0, 5) : '-'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <div className="no-schedule">이번 주 등록된 일정이 없어요 🌿</div>
            )}
        </>
    );
}

export default Dashboard;