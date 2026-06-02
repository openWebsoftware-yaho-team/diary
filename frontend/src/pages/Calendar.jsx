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
    
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [fixedCheckModalOpen, setFixedCheckModalOpen] = useState(false);

    const [newEvent, setNewEvent] = useState({ title: '', date: '', startTime: '09:00', endTime: '10:00', category: '기타' });
    const [selectedEvent, setSelectedEvent] = useState({ id: '', title: '', date: '', startTime: '', endTime: '', category: '기타', isCompleted: false });
    const [selectedFixedCheck, setSelectedFixedCheck] = useState({ id: '', title: '', date: '' });

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
        if (newEvent.endTime && newEvent.endTime <= newEvent.startTime) { alert('⚠️ 종료 시간오류'); return; }
        try { await request('/schedule/add', { method: 'POST', body: newEvent }); setAddModalOpen(false); loadData(); } catch (err) { alert(err.message); } 
    };
    
    const handleUpdateSchedule = async (e) => { 
        e.preventDefault(); 
        if (selectedEvent.endTime && selectedEvent.endTime <= selectedEvent.startTime) { alert('⚠️ 종료 시간오류'); return; }
        try { await request('/schedule/update', { method: 'PUT', body: selectedEvent }); setEditModalOpen(false); loadData(); } catch (err) { alert(err.message); } 
    };
    
    const handleDeleteSchedule = async () => { 
        if (!window.confirm('정말 삭제할까요?')) return; 
        try { await request(`/schedule/delete/${selectedEvent.id}`, { method: 'DELETE' }); setEditModalOpen(false); loadData(); } catch (err) { alert(err.message); } 
    };

    const handleChipDragStart = (e, evt) => { 
        if (evt.isFixed) return; e.stopPropagation(); e.preventDefault(); 
        const rect = e.currentTarget.getBoundingClientRect(); 
        dragRef.current = { id: evt.id, title: evt.title, category: evt.category, startTime: evt.startTime, endTime: evt.endTime, date: evt.date, bgClass: categoryColors[evt.category] || 'bg-pastel-green', chipWidth: rect.width, chipHeight: rect.height, didDrag: false, startMouseX: e.clientX, startMouseY: e.clientY }; 
        setDraggingId(evt.id); 
        const onMouseMove = (ev) => { 
            if (!dragRef.current) return; 
            if (Math.abs(ev.clientX - dragRef.current.startMouseX) > 3 || Math.abs(ev.clientY - dragRef.current.startMouseY) > 3) dragRef.current.didDrag = true; 
            setGhost({ x: ev.clientX + 5, y: ev.clientY + 5, width: dragRef.current.chipWidth, height: dragRef.current.chipHeight, title: dragRef.current.title, bgClass: dragRef.current.bgClass }); 
        }; 
        const onMouseUp = async (ev) => { 
            window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp);
            setDraggingId(null); setGhost(null); 
            if (!dragRef.current?.didDrag) { dragRef.current = null; return; } 
            wasClickRef.current = true; setTimeout(() => { wasClickRef.current = false; }, 200); 
            let targetDate = null; 
            document.querySelectorAll('.cal-cell[data-date]').forEach((cell) => { const r = cell.getBoundingClientRect(); if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) targetDate = cell.getAttribute('data-date'); }); 
            if (!targetDate || targetDate === dragRef.current.date) return; 
            try { await request('/schedule/update', { method: 'PUT', body: { id: dragRef.current.id, title: dragRef.current.title, category: dragRef.current.category, date: targetDate, startTime: dragRef.current.startTime, endTime: dragRef.current.endTime } }); loadData(); } catch (err) { alert(err.message); }
            dragRef.current = null;
        }; 
        window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp); 
    };

    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) cells.push(<div key={`empty-${i}`} className="cal-cell empty"></div>);

    for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayEvents = scheduleList.filter(s => s.date === dateStr);
        const fDayOfWeek = new Date(year, month, d).getDay() === 0 ? 6 : new Date(year, month, d).getDay() - 1;

        const dayFixedEvents = fixedList.filter(f => f.dayOfWeek === fDayOfWeek && !(f.startDate && f.startDate > dateStr) && !(f.endDate && f.endDate < dateStr)).map(f => ({ id: `fixed-${f.id}-${dateStr}`, fixedId: f.id, title: `📌 ${f.title}`, startTime: f.startTime, category: f.category, isFixed: true, isCompleted: completedFixedKeys.includes(`${f.id}-${dateStr}`) }));
        const allDayEvents = [...dayEvents, ...dayFixedEvents].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        const dow = (firstDayIndex + d - 1) % 7;
        let dateClass = 'cal-date';
        if (d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()) dateClass += ' is-today';
        else if (dow === 0) dateClass += ' text-red';
        else if (dow === 6) dateClass += ' text-blue';

        cells.push(
            <div key={d} className="cal-cell" data-date={dateStr} onClick={() => handleCellClick(dateStr)}>
                <div className={dateClass}>{d}</div>
                <div className="cal-events">
                    {allDayEvents.map((evt) => (
                        <div key={evt.id} className={`cal-event-chip ${categoryColors[evt.category] || 'bg-pastel-green'} ${evt.isCompleted ? 'is-completed' : ''}`} style={{ opacity: draggingId === evt.id ? 0.3 : 1, cursor: evt.isFixed ? 'pointer' : 'grab' }} onMouseDown={(e) => handleChipDragStart(e, evt)} onClick={e => { e.stopPropagation(); if (evt.isFixed) { setSelectedFixedCheck({ id: evt.fixedId, title: evt.title, date: dateStr }); setFixedCheckModalOpen(true); return; } setSelectedEvent({ id: evt.id, title: evt.title, date: evt.date || dateStr, startTime: evt.startTime?.substring(0, 5) || '', endTime: evt.endTime?.substring(0, 5) || '', category: evt.category || '기타', isCompleted: evt.isCompleted || false }); setEditModalOpen(true); }}>
                            <span className="time">{evt.startTime?.substring(0, 5)}</span> {evt.title}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const timeSelectOptions = Array.from({ length: 24 }, (_, i) => (
        <option key={i} value={`${String(i).padStart(2, '0')}:00`}>{String(i).padStart(2, '0')}시</option>
    ));

    return (
        <div className="calendar-page-container">
            {ghost && <div className={`cal-event-chip ${ghost.bgClass}`} style={{ position: 'fixed', left: ghost.x, top: ghost.y, width: ghost.width, opacity: 0.9, pointerEvents: 'none', zIndex: 9999, boxShadow: '0 10px 20px rgba(0,0,0,0.2)', transform: 'rotate(3deg) scale(1.05)' }}>{ghost.title}</div>}

            <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-brown)' }}>YAHO 일정 관리 캘린더</h2>
                <div className="calendar-controls" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button className="btn-cal-nav" onClick={prevMonth} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-brown)' }}>◀</button>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, minWidth: '110px', textAlign: 'center', color: 'var(--text-brown)' }}>{year}년 {month + 1}월</h3>
                    <button className="btn-cal-nav" onClick={nextMonth} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-brown)' }}>▶</button>
                </div>
            </div>

            <div className="white-card" style={{ padding: '16px', marginBottom: '24px' }}>
                <div className="calendar-wrapper" style={{ border: 'none' }}>
                    <div className="calendar-header-row">
                        <div className="cal-day-name" style={{ color: '#e53935' }}>일</div>
                        <div className="cal-day-name">월</div><div className="cal-day-name">화</div><div className="cal-day-name">수</div><div className="cal-day-name">목</div><div className="cal-day-name">금</div>
                        <div className="cal-day-name" style={{ color: '#1e88e5' }}>토</div>
                    </div>
                    <div className="calendar-grid">{cells}</div>
                </div>
            </div>

            {fixedCheckModalOpen && (
                <div className="modal-overlay show"><div className="modal-content"><h3>📌 {selectedFixedCheck.title}</h3><div className="complete-row"><span style={{ color:'var(--text-brown)' }}>완료 처리</span><input type="checkbox" checked={completedFixedKeys.includes(`${selectedFixedCheck.id}-${selectedFixedCheck.date}`)} onChange={async () => { await request('/schedule/fixed-complete', { method: 'PUT', body: { fixedId: selectedFixedCheck.id, date: selectedFixedCheck.date } }); loadData(); }} /></div><button type="button" onClick={() => setFixedCheckModalOpen(false)} className="btn-close" style={{ width: '100%', marginTop: '16px' }}>닫기</button></div></div>
            )}
            {editModalOpen && (
                <div className="modal-overlay show"><div className="modal-content"><h3>📅 일정 수정</h3><form onSubmit={handleUpdateSchedule} className="quick-modal-form"><input type="text" value={selectedEvent.title} onChange={e => setSelectedEvent({ ...selectedEvent, title: e.target.value })} required /><select value={selectedEvent.startTime} onChange={e => setSelectedEvent({ ...selectedEvent, startTime: e.target.value })} required>{timeSelectOptions}</select><select value={selectedEvent.endTime} onChange={e => setSelectedEvent({ ...selectedEvent, endTime: e.target.value })}><option value="">종료시간 없음</option>{timeSelectOptions}</select><select value={selectedEvent.category} onChange={e => setSelectedEvent({ ...selectedEvent, category: e.target.value })} required>{['회의', '공부', '약속', '운동', '기타'].map(v => <option key={v} value={v}>{v}</option>)}</select><div style={{ display: 'flex', gap: '10px' }}><button type="submit" className="btn-submit">💾 저장</button><button type="button" className="btn-close" style={{ background: '#e74c3c', color: '#fff' }} onClick={handleDeleteSchedule}>🗑 삭제</button></div><button type="button" className="btn-close" style={{width:'100%'}} onClick={() => setEditModalOpen(false)}>닫기</button></form></div></div>
            )}
            {addModalOpen && (
                <div className="modal-overlay show"><div className="modal-content"><h3>📅 일정 추가</h3><form onSubmit={handleAddSchedule} className="quick-modal-form"><input type="text" placeholder="일정 제목" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} required /><select value={newEvent.startTime} onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })} required>{timeSelectOptions}</select><select value={newEvent.endTime} onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })}><option value="">종료시간 없음</option>{timeSelectOptions}</select><select value={newEvent.category} onChange={e => setNewEvent({ ...newEvent, category: e.target.value })} required>{['회의', '공부', '약속', '운동', '기타'].map(v => <option key={v} value={v}>{v}</option>)}</select><div style={{ display: 'flex', gap: '10px' }}><button type="submit" className="btn-submit">✅ 추가</button><button type="button" className="btn-close" onClick={() => setAddModalOpen(false)}>닫기</button></div></form></div></div>
            )}
        </div>
    );
}

export default Calendar;