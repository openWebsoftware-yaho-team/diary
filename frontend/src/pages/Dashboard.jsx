import React, { useEffect, useState } from 'react';
import { request } from '../api';

const categoryColors = {
    '회의': 'badge-회의',
    '공부': 'badge-공부',
    '약속': 'badge-약속',
    '운동': 'badge-운동',
    '기타': 'badge-기타'
};

function Dashboard() {
    const [combinedSchedules, setCombinedSchedules] = useState([]);
    const [stats, setStats] = useState({ todayCount: 0, weekTotal: 0, remainingCount: 0 });
    const [todayStr, setTodayStr] = useState('');
    const [loading, setLoading] = useState(true);
    const days = ['일', '월', '화', '수', '목', '금', '토'];

    useEffect(() => {
        request('/diary')
            .then(data => {
                // 이번 주 월요일 기준 7일간의 날짜 배열 생성 (YYYY-MM-DD 형식)
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

                // 1. 이번 주 일반 일정 목록 로드
                const regular = data.weekSchedules.map(s => ({ ...s, isFixed: false }));

                // 2. 고정 일정을 이번 주 날짜별 요일에 맞춰 맵핑 확장
                const expandedFixed = [];
                weekDates.forEach((date, index) => {
                    // index: 0=월요일, 1=화요일, ..., 6=일요일
                    const matchingFixed = (data.fixedList || []).filter(f => {
                        if (f.dayOfWeek !== index) return false;
                        if (f.endDate && f.endDate < date) return false; // 기한이 만료된 것은 제외
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
                            isFixed: true
                        });
                    });
                });

                // 3. 두 일정 목록을 합치고 [날짜 오름차순 -> 시간 오름차순] 정렬
                const merged = [...regular, ...expandedFixed].sort((a, b) => {
                    const dateCmp = a.date.localeCompare(b.date);
                    if (dateCmp !== 0) return dateCmp;
                    if (!a.startTime) return 1;
                    if (!b.startTime) return -1;
                    return a.startTime.localeCompare(b.startTime);
                });

                // 통계값 재계산
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

    if (loading) return <div className="no-schedule">로딩 중...🌿</div>;

    return (
        <>
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
                            <th style={{ width: '15%' }}>날짜</th>
                            <th style={{ width: '10%' }}>요일</th>
                            <th style={{ width: '15%' }}>시간</th>
                            <th style={{ width: '25%' }}>일정</th>
                            <th style={{ width: '10%' }}>카테고리</th>
                            <th className="col-memo-home" style={{ width: '25%' }}>종료</th>
                        </tr>
                    </thead>
                    <tbody>
                        {combinedSchedules.map((s) => {
                            const isToday = s.date === todayStr;
                            const dayOfWeekStr = days[new Date(s.date).getDay()] + '요일';
                            const badgeClass = categoryColors[s.category] || 'badge-기타';
                            return (
                                <tr key={s.id} className={isToday ? 'is-today' : ''}>
                                    <td>{s.date}</td>
                                    <td>{dayOfWeekStr}</td>
                                    <td>{s.startTime ? s.startTime.substring(0, 5) : '-'}</td>
                                    <td>{s.title}</td>
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