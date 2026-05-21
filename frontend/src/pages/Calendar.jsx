import React, { useEffect, useState } from 'react';
import { request } from '../api';

const categoryColors = {
    '회의': 'bg-pastel-blue',
    '공부': 'bg-pastel-green',
    '약속': 'bg-pastel-orange',
    '운동': 'bg-pastel-purple',
    '기타': 'bg-pastel-yellow'
};

function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [scheduleList, setScheduleList] = useState([]);
    const [fixedList, setFixedList] = useState([]);

    // 추가 모달 상태
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', date: '', startTime: '09:00', endTime: '10:00' });

    useEffect(() => {
        request('/schedule/calendar').then(data => {
            setScheduleList(data.scheduleList || []);
            setFixedList(data.fixedList || []);
        });
    }, []);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    // 날짜 셀 클릭 → 추가 모달
    const handleCellClick = (dateStr) => {
        setNewEvent({ title: '', date: dateStr, startTime: '09:00', endTime: '10:00' });
        setAddModalOpen(true);
    };

    // 일정 추가 저장
    const handleAddSchedule = async (e) => {
        e.preventDefault();
        try {
            await request('/schedule/add', { method: 'POST', body: newEvent });
            setAddModalOpen(false);
            // 데이터 새로고침
            request('/schedule/calendar').then(data => {
                setScheduleList(data.scheduleList || []);
                setFixedList(data.fixedList || []);
            });
        } catch (err) { alert(err.message); }
    };

    // 달력 셀(Grid) 생성 로직
    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
        cells.push(<div key={`empty-${i}`} className="cal-cell empty"></div>);
    }

    for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        const dayEvents = scheduleList.filter(s => s.date === dateStr);

        const cellDate = new Date(year, month, d);
        const jsDay = cellDate.getDay();
        const fDayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

        const dayFixedEvents = fixedList.filter(f => {
            if (f.dayOfWeek !== fDayOfWeek) return false;
            if (f.endDate && f.endDate < dateStr) return false;
            return true;
        }).map(f => ({
            id: `fixed-${f.id}-${dateStr}`,
            title: `📌 ${f.title}`,
            startTime: f.startTime,
            category: f.category,
            isFixed: true
        }));

        const allDayEvents = [...dayEvents, ...dayFixedEvents].sort((a, b) => {
            if (!a.startTime) return 1;
            if (!b.startTime) return -1;
            return a.startTime.localeCompare(b.startTime);
        });

        const dow = (firstDayIndex + d - 1) % 7;

        let dateClass = 'cal-date';
        const today = new Date();
        if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dateClass += ' is-today';
        } else if (dow === 0) dateClass += ' text-red';
        else if (dow === 6) dateClass += ' text-blue';

        cells.push(
            <div key={d} className="cal-cell" onClick={() => handleCellClick(dateStr)} style={{ cursor: 'pointer' }}>
                <div className={dateClass}>{d}</div>
                <div className="cal-events">
                    {allDayEvents.map((evt) => {
                        const bgClass = categoryColors[evt.category] || 'bg-pastel-green';
                        return (
                            <div key={evt.id} className={`cal-event-chip ${bgClass}`} onClick={e => e.stopPropagation()}>
                                <span className="time">{evt.startTime?.substring(0, 5)}</span> {evt.title}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="section-title">월간 캘린더</div>
            <div className="calendar-controls">
                <button className="btn-cal-nav" onClick={prevMonth}>◀</button>
                <h2 className="calendar-title">{year}년 {month + 1}월</h2>
                <button className="btn-cal-nav" onClick={nextMonth}>▶</button>
            </div>
            <div className="calendar-wrapper">
                <div className="calendar-header-row">
                    <div className="cal-day-name text-red">일</div>
                    <div className="cal-day-name">월</div>
                    <div className="cal-day-name">화</div>
                    <div className="cal-day-name">수</div>
                    <div className="cal-day-name">목</div>
                    <div className="cal-day-name">금</div>
                    <div className="cal-day-name text-blue">토</div>
                </div>
                <div className="calendar-grid">{cells}</div>
            </div>

            {/* 일정 추가 모달 */}
            {addModalOpen && (
                <div className="modal-overlay show">
                    <div className="modal-content">
                        <h3>📅 일정 추가 ({newEvent.date})</h3>
                        <form onSubmit={handleAddSchedule} className="fixed-add-form open" style={{ boxShadow: 'none', padding: 0, background: 'none' }}>
                            <label>제목</label>
                            <input type="text" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} required autoFocus />
                            <label>시작 시간</label>
                            <select value={newEvent.startTime} onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })} required>
                                {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={`${String(i).padStart(2, '0')}:00`}>{String(i).padStart(2, '0')}시</option>
                                ))}
                            </select>
                            <label>종료 시간</label>
                            <select value={newEvent.endTime} onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })}>
                                <option value="">없음</option>
                                {Array.from({ length: 24 }, (_, i) => {
                                    const h = i + 1;
                                    const val = h < 24 ? `${String(h).padStart(2, '0')}:00` : '23:59';
                                    return <option key={i} value={val}>{h < 24 ? `${String(h).padStart(2, '0')}시` : '23:59'}</option>;
                                })}
                            </select>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" className="btn-fixed-submit" style={{ flex: 1 }}>✅ 추가</button>
                                <button type="button" className="btn-fixed-submit" style={{ flex: 1, backgroundColor: '#aaa' }} onClick={() => setAddModalOpen(false)}>닫기</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

export default Calendar;