import React, { useEffect, useState, useRef } from 'react';
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
    const [completedFixedKeys, setCompletedFixedKeys] = useState([]);

    // 추가 모달 상태
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', date: '', startTime: '09:00', endTime: '10:00', category: '기타' });

    // 수정 모달 상태
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState({ id: '', title: '', date: '', startTime: '', endTime: '', category: '기타', isCompleted: false });

    // 드래그 상태
    const dragRef = useRef(null);
    const wasClickRef = useRef(false);
    const [draggingId, setDraggingId] = useState(null);
    const [ghost, setGhost] = useState(null);

    const loadData = () => {
        request('/schedule/calendar').then(data => {
            setScheduleList(data.scheduleList || []);
            setFixedList(data.fixedList || []);
            setCompletedFixedKeys(data.completedFixedKeys || []);
        });
    };

    useEffect(() => { loadData(); }, []);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const handleCellClick = (dateStr) => {
        if (wasClickRef.current) return;
        setNewEvent({ title: '', date: dateStr, startTime: '09:00', endTime: '10:00', category: '기타' });
        setAddModalOpen(true);
    };

    const handleAddSchedule = async (e) => {
        e.preventDefault();
        try {
            await request('/schedule/add', { method: 'POST', body: newEvent });
            setAddModalOpen(false);
            loadData();
        } catch (err) { alert(err.message); }
    };

    const handleUpdateSchedule = async (e) => {
        e.preventDefault();
        try {
            await request('/schedule/update', { method: 'PUT', body: selectedEvent });
            setEditModalOpen(false);
            loadData();
        } catch (err) { alert(err.message); }
    };

    const handleDeleteSchedule = async () => {
        if (!window.confirm('정말 삭제할까요?')) return;
        try {
            await request(`/schedule/delete/${selectedEvent.id}`, { method: 'DELETE' });
            setEditModalOpen(false);
            loadData();
        } catch (err) { alert(err.message); }
    };

    const handleChipDragStart = (e, evt) => {
        if (evt.isFixed) return;

        e.stopPropagation();
        e.preventDefault();

        const rect = e.currentTarget.getBoundingClientRect();
        const bgClass = categoryColors[evt.category] || 'bg-pastel-green';

        dragRef.current = {
            id: evt.id,
            title: evt.title,
            category: evt.category,
            startTime: evt.startTime,
            endTime: evt.endTime,
            date: evt.date,
            bgClass,
            chipWidth: rect.width,
            chipHeight: rect.height,
            didDrag: false,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
        };
        setDraggingId(evt.id);

        const onMouseMove = (ev) => {
            if (!dragRef.current) return;
            const dx = ev.clientX - dragRef.current.startMouseX;
            const dy = ev.clientY - dragRef.current.startMouseY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.didDrag = true;

            setGhost({
                x: ev.clientX + 10,
                y: ev.clientY + 10,
                width: dragRef.current.chipWidth,
                height: dragRef.current.chipHeight,
                title: dragRef.current.title,
                bgClass: dragRef.current.bgClass,
            });
        };

        const onMouseUp = async (ev) => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            setDraggingId(null);
            setGhost(null);

            const didDrag = dragRef.current?.didDrag;
            if (!didDrag) { dragRef.current = null; return; }

            wasClickRef.current = true;
            setTimeout(() => { wasClickRef.current = false; }, 200);

            const calCells = document.querySelectorAll('.cal-cell[data-date]');
            let targetDate = null;
            calCells.forEach((cell) => {
                const r = cell.getBoundingClientRect();
                if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
                    targetDate = cell.getAttribute('data-date');
                }
            });

            const { id, title, category, startTime, endTime, date } = dragRef.current;
            dragRef.current = null;

            if (!targetDate || targetDate === date) return;

            const payload = { id, title, category, date: targetDate, startTime, endTime };
            try {
                await request('/schedule/update', { method: 'PUT', body: payload });
                loadData();
            } catch (err) { alert(err.message); }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

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
            if (f.startDate && f.startDate > dateStr) return false;
            if (f.endDate && f.endDate < dateStr) return false;
            return true;
        }).map(f => ({
            id: `fixed-${f.id}-${dateStr}`,
            title: `📌 ${f.title}`,
            startTime: f.startTime,
            category: f.category,
            isFixed: true,
            isCompleted: completedFixedKeys.includes(`${f.id}-${dateStr}`)
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
            <div
                key={d}
                className="cal-cell"
                data-date={dateStr}
                onClick={() => handleCellClick(dateStr)}
                style={{ cursor: 'pointer' }}
            >
                <div className={dateClass}>{d}</div>
                <div className="cal-events">
                    {allDayEvents.map((evt) => {
                        const bgClass = categoryColors[evt.category] || 'bg-pastel-green';
                        const isDragging = draggingId === evt.id;
                        return (
                            <div
                                key={evt.id}
                                className={`cal-event-chip ${bgClass} ${evt.isCompleted ? 'is-completed' : ''}`}
                                style={{
                                    opacity: isDragging ? 0.3 : 1,
                                    cursor: evt.isFixed ? 'default' : 'grab',
                                    userSelect: 'none',
                                }}
                                onMouseDown={(e) => handleChipDragStart(e, evt)}
                                onClick={e => {
                                    e.stopPropagation();
                                    if (evt.isFixed) return;
                                    setSelectedEvent({
                                        id: evt.id,
                                        title: evt.title,
                                        date: evt.date || dateStr,
                                        startTime: evt.startTime?.substring(0, 5) || '',
                                        endTime: evt.endTime?.substring(0, 5) || '',
                                        category: evt.category || '기타',
                                        isCompleted: evt.isCompleted || false,
                                    });
                                    setEditModalOpen(true);
                                }}
                            >
                                <span className="time">{evt.startTime?.substring(0, 5)}</span> {evt.title}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    const timeSelectOptions = Array.from({ length: 24 }, (_, i) => (
        <option key={i} value={`${String(i).padStart(2, '0')}:00`}>{String(i).padStart(2, '0')}시</option>
    ));
    const endTimeOptions = [
        <option key="none" value="">없음</option>,
        ...Array.from({ length: 24 }, (_, i) => {
            const h = i + 1;
            const val = h < 24 ? `${String(h).padStart(2, '0')}:00` : '23:59';
            return <option key={i} value={val}>{h < 24 ? `${String(h).padStart(2, '0')}시` : '23:59'}</option>;
        })
    ];

    return (
        <>
            <div className="section-title">월간 캘린더</div>

            {ghost && (
                <div
                    className={`cal-event-chip ${ghost.bgClass}`}
                    style={{
                        position: 'fixed',
                        left: ghost.x,
                        top: ghost.y,
                        width: ghost.width,
                        opacity: 0.8,
                        pointerEvents: 'none',
                        zIndex: 9999,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                        transform: 'rotate(2deg) scale(1.05)',
                    }}
                >
                    {ghost.title}
                </div>
            )}

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

            {/* 수정 모달 */}
            {editModalOpen && (
                <div className="modal-overlay show">
                    <div className="modal-content">
                        <h3>📅 일정 수정</h3>
                        <form onSubmit={handleUpdateSchedule} className="fixed-add-form open" style={{ boxShadow: 'none', padding: 0, background: 'none' }}>
                            <label>제목</label>
                            <input type="text" value={selectedEvent.title} onChange={e => setSelectedEvent({ ...selectedEvent, title: e.target.value })} required />
                            <label>시작 시간</label>
                            <select value={selectedEvent.startTime} onChange={e => setSelectedEvent({ ...selectedEvent, startTime: e.target.value })} required>
                                {timeSelectOptions}
                            </select>
                            <label>종료 시간</label>
                            <select value={selectedEvent.endTime} onChange={e => setSelectedEvent({ ...selectedEvent, endTime: e.target.value })}>
                                {endTimeOptions}
                            </select>
                            <label>카테고리</label>
                            <select value={selectedEvent.category} onChange={e => setSelectedEvent({ ...selectedEvent, category: e.target.value })} required>
                                {['회의', '공부', '약속', '운동', '기타'].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
<div className="complete-row">
    <span style={{ fontSize: '13px', color: '#888' }}>완료</span>
    <input type="checkbox" className="task-checkbox" checked={selectedEvent.isCompleted || false} onChange={e => setSelectedEvent({ ...selectedEvent, isCompleted: e.target.checked })} />
</div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
<button type="submit" className="btn-fixed-submit" style={{ flex: 1, backgroundColor: '#4caf50' }}>💾 저장</button>
                                <button type="button" className="btn-fixed-submit" style={{ flex: 1, backgroundColor: '#e74c3c' }} onClick={handleDeleteSchedule}>🗑 삭제</button>
                            </div>
                            <button type="button" className="btn-fixed-submit" style={{ width: '100%', marginTop: '6px', backgroundColor: '#aaa' }} onClick={() => setEditModalOpen(false)}>닫기</button>
                        </form>
                    </div>
                </div>
            )}

            {/* 추가 모달 */}
            {addModalOpen && (
                <div className="modal-overlay show">
                    <div className="modal-content">
                        <h3>📅 일정 추가 ({newEvent.date})</h3>
                        <form onSubmit={handleAddSchedule} className="fixed-add-form open" style={{ boxShadow: 'none', padding: 0, background: 'none' }}>
                            <label>제목</label>
                            <input type="text" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} required autoFocus />
                            <label>시작 시간</label>
                            <select value={newEvent.startTime} onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })} required>
                                {timeSelectOptions}
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
                            <label>카테고리</label>
                            <select value={newEvent.category} onChange={e => setNewEvent({ ...newEvent, category: e.target.value })} required>
                                {['회의', '공부', '약속', '운동', '기타'].map(v => <option key={v} value={v}>{v}</option>)}
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