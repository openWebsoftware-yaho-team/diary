import React, { useEffect, useState, useRef } from 'react';
import { request } from '../api';

const categoryColors = {
    '회의': 'bg-pastel-blue',
    '공부': 'bg-pastel-green',
    '약속': 'bg-pastel-orange',
    '운동': 'bg-pastel-purple',
    '기타': 'bg-pastel-yellow'
};

function Timeline() {
    const [scheduleList, setScheduleList] = useState([]);
    const [fixedList, setFixedList] = useState([]);
    const [aiMessage, setAiMessage] = useState('');
    const [isFixedFormOpen, setIsFixedFormOpen] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [fixedModalOpen, setFixedModalOpen] = useState(false);
    const [fixedCheckModalOpen, setFixedCheckModalOpen] = useState(false);
    
    const [ddayModalOpen, setDdayModalOpen] = useState(false);
    const [newDday, setNewDday] = useState({ title: '', date: '' });
    const [ddayList, setDdayList] = useState([{ id: 1, title: '프로젝트 발표 평가', date: '2026-06-05' }]);

    const [selectedEvent, setSelectedEvent] = useState({ id: '', title: '', date: '', startTime: '', endTime: '', category: '기타', isCompleted: false });
    const [newEvent, setNewEvent] = useState({ title: '', date: '', startTime: '', endTime: '', category: '기타' });
    const [selectedFixed, setSelectedFixed] = useState({ id: '', title: '', dayOfWeek: 0, startTime: '', endTime: '', category: '기타', startDate: '', endDate: '' });
    const [selectedFixedCheck, setSelectedFixedCheck] = useState({ id: '', title: '', date: '' });

    const dragRef = useRef(null);
    const wasResizedRef = useRef(false);
    const [draggingId, setDraggingId] = useState(null);
    const [resizingId, setResizingId] = useState(null);
    const [ghost, setGhost] = useState(null);
    const [completedFixedKeys, setCompletedFixedKeys] = useState([]);

    const PX_PER_HOUR = 60;
    const dayMap = [1, 2, 3, 4, 5, 6, 0];
    const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];

    const allTimes = [
        ...scheduleList.map(s => s.startTime),
        ...fixedList.map(f => f.startTime),
        ...scheduleList.map(s => s.endTime),
        ...fixedList.map(f => f.endTime),
    ].filter(Boolean).map(t => parseInt(t.split(':')[0]));

    const startH = allTimes.length > 0 ? Math.min(9, Math.min(...allTimes)) : 9;
    const endH = allTimes.length > 0 ? Math.max(19, Math.max(...allTimes) + 1) : 19;
    const hours = endH - startH;

    const loadData = () => {
        return request('/schedule/timeline').then(data => {
            setScheduleList(data.scheduleList || []);
            setFixedList(data.fixedList || []);
            setCompletedFixedKeys(data.completedFixedKeys || []);
        });
    };

    useEffect(() => { loadData(); }, []);

    const calculateDDay = (targetDateStr) => {
        if (!targetDateStr) return '';
        const today = new Date(); today.setHours(0,0,0,0);
        const target = new Date(targetDateStr); target.setHours(0,0,0,0);
        const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'D-Day';
        return diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;
    };

    const handleAddDday = (e) => {
        e.preventDefault();
        if (!newDday.title || !newDday.date) return;
        setDdayList(prev => [...prev, { id: Date.now(), ...newDday }]);
        setNewDday({ title: '', date: '' });
        setDdayModalOpen(false);
    };

    const dayIdxToDateStr = (dayIdx) => {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
        const target = new Date(monday);
        target.setDate(monday.getDate() + (dayIdx === 0 ? 6 : dayIdx - 1));
        return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    };

    const pxToTime = (px) => {
        const totalMinutes = Math.round((px / PX_PER_HOUR) * 60 / 60) * 60;
        return `${String(Math.min(Math.floor(totalMinutes / 60) + startH, 23)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
    };

    const handleAiSubmit = async (e) => {
        e.preventDefault();
        try {
            await request('/schedule/ai', { method: 'POST', body: { message: aiMessage } });
            setAiMessage(''); loadData();
        } catch (err) { alert(err.message); }
    };

    const handleAddSchedule = async (e) => {
        e.preventDefault();
        if (newEvent.endTime && newEvent.endTime <= newEvent.startTime) { alert('⚠️ 종료 시간오류'); return; }
        try { await request('/schedule/add', { method: 'POST', body: newEvent }); setAddModalOpen(false); loadData(); } catch (err) { alert(err.message); }
    };

    const handleUpdateSchedule = async (e) => {
        e.preventDefault();
        if (selectedEvent.endTime && selectedEvent.endTime <= selectedEvent.startTime) { alert('⚠️ 시간오류'); return; }
        try { await request('/schedule/update', { method: 'PUT', body: selectedEvent }); setModalOpen(false); loadData(); } catch (err) { alert(err.message); }
    };

    const handleDeleteSchedule = async () => {
        if (!window.confirm('삭제할까요?')) return;
        try { await request(`/schedule/delete/${selectedEvent.id}`, { method: 'DELETE' }); setModalOpen(false); loadData(); } catch (err) { alert(err.message); }
    };

    const handleAddFixed = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target); const body = Object.fromEntries(formData.entries());
        if (body.endTime && body.endTime <= body.startTime) { alert('⚠️ 시간오류'); return; }
        try { await request('/fixed/add', { method: 'POST', body }); setIsFixedFormOpen(false); loadData(); } catch (err) { alert(err.message); }
    };

    const handleUpdateFixed = async (e) => {
        e.preventDefault();
        if (selectedFixed.endTime && selectedFixed.endTime <= selectedFixed.startTime) { alert('⚠️ 시간오류'); return; }
        try { await request(`/fixed/update/${selectedFixed.id}`, { method: 'PUT', body: selectedFixed }); setFixedModalOpen(false); loadData(); } catch (err) { alert(err.message); }
    };

    const handleDeleteFixed = async (id) => {
        if (!window.confirm('삭제할까요?')) return;
        try { await request(`/fixed/delete/${id}`, { method: 'DELETE' }); setFixedModalOpen(false); loadData(); } catch (err) { alert(err.message); }
    };

    const handleGridClick = (e, dayIdx, screenIdx) => {
        if (e.target.classList.contains('timetable-event') || e.target.classList.contains('fixed-event') || e.target.classList.contains('resize-handle') || dragRef.current?.didDrag || wasResizedRef.current) return;
        const clickedHour = Math.floor((e.clientY - e.currentTarget.getBoundingClientRect().top) / PX_PER_HOUR) + startH;
        setNewEvent({ title: '', date: dayIdxToDateStr(dayIdx), startTime: `${String(clickedHour).padStart(2, '0')}:00`, endTime: `${String(Math.min(clickedHour + 1, 23)).padStart(2, '0')}:00`, category: '기타' });
        setAddModalOpen(true);
    };

    const getPos = (startTimeStr, endTimeStr) => {
        if (!startTimeStr) return { top: 0, height: 60 };
        const [hh, mm] = startTimeStr.split(':').map(Number);
        const startFloat = hh + mm / 60;
        const top = (startFloat - startH) * PX_PER_HOUR + 1;
        let height = PX_PER_HOUR;
        if (endTimeStr) {
            const [eh, em] = endTimeStr.split(':').map(Number);
            const duration = (eh + em / 60) - startFloat;
            if (duration > 0) height = duration * PX_PER_HOUR - 2;
        }
        return { top: `${top}px`, height: `${height}px` };
    };

    const handleDragStart = (e, schedule, screenIdx, dayIdx) => {
        e.stopPropagation(); e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        dragRef.current = { type: 'move', id: schedule.id, title: schedule.title, category: schedule.category, startMouseX: e.clientX, startMouseY: e.clientY, offsetY: e.clientY - rect.top, originalStart: schedule.startTime.substring(0, 5), originalEnd: schedule.endTime ? schedule.endTime.substring(0, 5) : '', originalDate: schedule.date, originalScreenIdx: screenIdx, didDrag: false, bgClass: categoryColors[schedule.category] || 'bg-pastel-green', blockWidth: rect.width, blockHeight: rect.height };
        setDraggingId(schedule.id);
        const onMouseMove = (ev) => {
            if (!dragRef.current) return;
            if (Math.abs(ev.clientX - dragRef.current.startMouseX) > 3 || Math.abs(ev.clientY - dragRef.current.startMouseY) > 3) dragRef.current.didDrag = true;
            setGhost({ x: ev.clientX - 10, y: ev.clientY - dragRef.current.offsetY, width: dragRef.current.blockWidth, height: dragRef.current.blockHeight, title: dragRef.current.title, bgClass: dragRef.current.bgClass });
        };
        const onMouseUp = async (ev) => {
            window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp);
            setDraggingId(null); setGhost(null);
            if (!dragRef.current?.didDrag) { dragRef.current = null; return; }
            wasResizedRef.current = true; setTimeout(() => { wasResizedRef.current = false; }, 200);
            let targetScreenIdx = dragRef.current.originalScreenIdx;
            document.querySelectorAll('.day-col').forEach((col, i) => { if (ev.clientX >= col.getBoundingClientRect().left && ev.clientX <= col.getBoundingClientRect().right) targetScreenIdx = i; });
            const gridEl = document.querySelectorAll('.day-grid')[targetScreenIdx];
            if (!gridEl) { dragRef.current = null; return; }
            const newStartTime = pxToTime(Math.max(0, ev.clientY - gridEl.getBoundingClientRect().top - dragRef.current.offsetY));
            let newEndTime = dragRef.current.originalEnd;
            if (dragRef.current.originalEnd) {
                const [sh, sm] = dragRef.current.originalStart.split(':').map(Number); const [eh, em] = dragRef.current.originalEnd.split(':').map(Number); const duration = (eh * 60 + em) - (sh * 60 + sm); const [nsh, nsm] = newStartTime.split(':').map(Number); const totalEnd = nsh * 60 + nsm + duration;
                newEndTime = `${String(Math.min(Math.floor(totalEnd / 60), 23)).padStart(2, '0')}:${String(totalEnd % 60).padStart(2, '0')}`;
            }
            try { await request('/schedule/update', { method: 'PUT', body: { id: dragRef.current.id, title: dragRef.current.title, category: dragRef.current.category, date: dayIdxToDateStr(dayMap[targetScreenIdx]), startTime: newStartTime, endTime: newEndTime === '' ? null : newEndTime } }); await loadData(); } catch (err) { alert(err.message); }
            dragRef.current = null;
        };
        window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp);
    };

    const handleResizeStart = (e, schedule) => {
        e.stopPropagation(); e.preventDefault();
        const gridEl = e.currentTarget.closest('.day-grid');
        const [sh, sm] = schedule.startTime.substring(0, 5).split(':').map(Number);
        dragRef.current = { type: 'resize', id: schedule.id, title: schedule.title, date: schedule.date, category: schedule.category, originalStart: schedule.startTime.substring(0, 5), bgClass: categoryColors[schedule.category] || 'bg-pastel-green', blockLeft: gridEl.getBoundingClientRect().left, blockWidth: gridEl.getBoundingClientRect().width, blockTop: gridEl.getBoundingClientRect().top + ((sh + sm / 60) - startH) * PX_PER_HOUR, didDrag: false };
        setResizingId(schedule.id);
        const onMouseMove = (ev) => { if (!dragRef.current) return; dragRef.current.didDrag = true; setGhost({ x: dragRef.current.blockLeft, y: dragRef.current.blockTop, width: dragRef.current.blockWidth - 4, height: Math.max(15, ev.clientY - dragRef.current.blockTop), title: dragRef.current.title, bgClass: dragRef.current.bgClass, isResize: true }); };
        const onMouseUp = async (ev) => {
            window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp);
            setResizingId(null); setGhost(null); if (!dragRef.current?.didDrag) { dragRef.current = null; return; }
            wasResizedRef.current = true; setTimeout(() => { wasResizedRef.current = false; }, 200);
            try { await request('/schedule/update', { method: 'PUT', body: { id: dragRef.current.id, title: dragRef.current.title, date: dragRef.current.date, category: dragRef.current.category, startTime: dragRef.current.originalStart, endTime: pxToTime(Math.max(0, ev.clientY - gridEl.getBoundingClientRect().top)) } }); loadData(); } catch (err) { alert(err.message); }
            dragRef.current = null;
        };
        window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp);
    };

    const timeSelectOptions = Array.from({ length: 24 }, (_, i) => (
        <option key={i} value={`${String(i).padStart(2, '0')}:00`}>{String(i).padStart(2, '0')}시</option>
    ));

    return (
        <div className="timeline-page-container">
            {ghost && <div className={`timetable-event ${ghost.bgClass}`} style={{ position: 'fixed', left: ghost.x, top: ghost.y, width: ghost.width, height: ghost.height, opacity: 0.75, pointerEvents: 'none', zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', transform: 'rotate(2deg)' }}>{ghost.title}</div>}

            <div className="timeline-top-bar" style={{ display: 'flex', gap: '15px', marginBottom: '24px', alignItems: 'center' }}>
                <form onSubmit={handleAiSubmit} style={{ flex: 1, display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="✨ AI 비서에게 지시하기 (예: '금요일 오후 3시에 팀 미팅 추가')" value={aiMessage} onChange={(e) => setAiMessage(e.target.value)} required style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-brown)', fontSize: '14px', outline: 'none' }} />
                    <button type="submit" className="btn-ai-submit">AI 생성 지시</button>
                </form>
                <button className="btn-add-regular" onClick={() => { setNewEvent({ title: '', date: dayIdxToDateStr(new Date().getDay()), startTime: '09:00', endTime: '10:00', category: '기타' }); setAddModalOpen(true); }}>+ 일반 일정 추가</button>
            </div>

            <div className="dashboard-content-flex" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                <div className="white-card white-card-scroll" style={{ flex: 1, padding: '20px' }}>
                    <div className="timetable">
                        <div className="time-col">
                            <div className="time-header"></div>
                            {Array.from({ length: hours }).map((_, i) => <div key={i} className="time-slot">{String(startH + i).padStart(2, '0')}:00</div>)}
                        </div>

                        {dayMap.map((dayIdx, idx) => {
                            const isToday = new Date().getDay() === dayIdx; const dateStr = dayIdxToDateStr(dayIdx);
                            return (
                                <div key={dayIdx} className={`day-col ${isToday ? 'is-today' : ''}`}>
                                    <div className="day-header">{dayLabels[idx]}</div>
                                    <div className="day-grid" style={{ height: `${hours * PX_PER_HOUR}px` }} onClick={(e) => handleGridClick(e, dayIdx, idx)}>
                                        {scheduleList.filter(s => s.date === dateStr).map((s) => {
                                            const { top, height } = getPos(s.startTime, s.endTime);
                                            return (
                                                <div key={s.id} className={`timetable-event ${categoryColors[s.category] || 'bg-pastel-green'} ${s.isCompleted ? 'is-completed' : ''}`} style={{ top, height, opacity: draggingId === s.id ? 0.2 : 0.85 }} onMouseDown={(e) => handleDragStart(e, s, idx, dayIdx)} onClick={(e) => { e.stopPropagation(); setSelectedEvent({ id: s.id, title: s.title, date: s.date, startTime: s.startTime.substring(0, 5), endTime: s.endTime ? s.endTime.substring(0, 5) : '', category: s.category || '기타', isCompleted: s.isCompleted || false }); setModalOpen(true); }}>
                                                    <span style={{ fontSize: '10px', opacity: 0.7 }}>{s.startTime.substring(0,5)}</span>{s.title}
                                                    <div className="resize-handle" onMouseDown={(e) => handleResizeStart(e, s)} />
                                                </div>
                                            );
                                        })}
                                        {fixedList.filter(f => f.dayOfWeek === (dayIdx === 0 ? 6 : dayIdx - 1) && !(f.startDate && f.startDate > dateStr) && !(f.endDate && f.endDate < dateStr)).map((f) => {
                                            const { top, height } = getPos(f.startTime, f.endTime);
                                            return (
                                                <div key={f.id} className={`timetable-event fixed-event ${categoryColors[f.category] || 'bg-pastel-yellow'} ${completedFixedKeys.includes(`${f.id}-${dateStr}`) ? 'is-completed' : ''}`} style={{ top, height }} onClick={(e) => { e.stopPropagation(); setSelectedFixedCheck({ id: f.id, title: f.title, date: dateStr }); setFixedCheckModalOpen(true); }}>📌 {f.title}</div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="timeline-side-widgets" style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '20px', flexShrink: 0 }}>
                    <div className="white-card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: 'var(--text-brown)' }}>🎯 주요 D-Day 마일스톤</h3>
                            <button onClick={() => setDdayModalOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--point-gold)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>+ 지정하기</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--text-brown)' }}>
                            {ddayList.length === 0 ? <div style={{ color: 'var(--text-light)', fontSize: '12px', textAlign: 'center' }}>지정된 D-Day가 없습니다.</div> : ddayList.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span><button onClick={() => setDdayList(prev => prev.filter(i => i.id !== item.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '4px' }}>❌</button>{item.title}</span>
                                    <strong style={{ color: 'var(--point-gold)' }}>{calculateDDay(item.date)}</strong>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="white-card" style={{ padding: '20px' }}>
                        <button className="btn-fixed-add-toggle" onClick={() => setIsFixedFormOpen(!isFixedFormOpen)}>{isFixedFormOpen ? '✖ 루틴 설정창 접기' : '⚙️ 고정 반복 루틴 설정'}</button>
                        {isFixedFormOpen && (
                            <form onSubmit={handleAddFixed} className="quick-modal-form" style={{ marginTop: '14px' }}>
                                <div className="form-group"><label>루틴 이름</label><input type="text" name="title" required /></div>
                                <div className="form-group"><label>요일</label><select name="dayOfWeek" required>{dayLabels.map((l, i) => <option key={i} value={i}>{l}요일</option>)}</select></div>
                                <div className="form-row">
                                    <div className="form-group" style={{ flex: 1 }}><label>시작 시간</label><select name="startTime" required>{timeSelectOptions}</select></div>
                                    <div className="form-group" style={{ flex: 1 }}><label>종료 시간</label><select name="endTime" required>{timeSelectOptions}</select></div>
                                </div>
                                <div className="form-group"><label>카테고리</label><select name="category" required defaultValue="기타">{['회의', '공부', '약속', '운동', '기타'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                                <button type="submit" className="btn-submit">루틴 저장</button>
                            </form>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', marginTop: '12px' }}>
                            {fixedList.map(f => <div key={f.id} className="fixed-item-card" onClick={() => { setSelectedFixed({ id: f.id, title: f.title, dayOfWeek: f.dayOfWeek, startTime: f.startTime, endTime: f.endTime, category: f.category }); setFixedModalOpen(true); }}><div style={{ fontWeight: 'bold', fontSize: '12px', color:'var(--text-brown)' }}>{f.title}</div><div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{dayLabels[f.dayOfWeek]}요일 | {f.startTime}~{f.endTime}</div></div>)}
                        </div>
                    </div>
                </div>
            </div>

            {/* 모달 팝업 가두기 기법 양식 적용 */}
            {ddayModalOpen && (
                <div className="modal-overlay show"><div className="modal-content"><h3>🎯 신규 D-Day 마일스톤 지정</h3><form onSubmit={handleAddDday} className="quick-modal-form"><div className="form-group"><label>목표일정 타이틀</label><input type="text" placeholder="예: 시험 시작일" value={newDday.title} onChange={e => setNewDday({ ...newDday, title: e.target.value })} required /></div><div className="form-group"><label>목표 기준 날짜</label><input type="date" value={newDday.date} onChange={e => setNewDday({ ...newDday, date: e.target.value })} required /></div><div className="btn-container"><button type="submit" className="btn-submit">지정 저장</button><button type="button" className="btn-close" onClick={() => setDdayModalOpen(false)}>닫기</button></div></form></div></div>
            )}
            {fixedCheckModalOpen && (
                <div className="modal-overlay show"><div className="modal-content"><h3>📌 {selectedFixedCheck.title}</h3><div className="complete-row"><span style={{ color: 'var(--text-brown)' }}>오늘 루틴 완료 달성</span><input type="checkbox" checked={completedFixedKeys.includes(`${selectedFixedCheck.id}-${selectedFixedCheck.date}`)} onChange={async () => { await request('/schedule/fixed-complete', { method: 'PUT', body: { fixedId: selectedFixedCheck.id, date: selectedFixedCheck.date } }); loadData(); }} /></div><button type="button" onClick={() => setFixedCheckModalOpen(false)} className="btn-close" style={{ width: '100%', marginTop: '16px' }}>닫기</button></div></div>
            )}
            {fixedModalOpen && (
                <div className="modal-overlay show"><div className="modal-content"><h3>📌 고정 루틴 수정</h3><form onSubmit={handleUpdateFixed} className="quick-modal-form"><div className="form-group"><label>이름</label><input type="text" value={selectedFixed.title} onChange={e => setSelectedFixed({ ...selectedFixed, title: e.target.value })} required /></div><div className="form-row"><div className="form-group" style={{flex:1}}><label>시작</label><select value={selectedFixed.startTime} onChange={e => setSelectedFixed({...selectedFixed, startTime:e.target.value})}>{timeSelectOptions}</select></div><div className="form-group" style={{flex:1}}><label>종료</label><select value={selectedFixed.endTime} onChange={e => setSelectedFixed({...selectedFixed, endTime:e.target.value})}>{timeSelectOptions}</select></div></div><div className="btn-container"><button type="submit" className="btn-submit">💾 저장</button><button type="button" className="btn-close" style={{ backgroundColor: '#e74c3c', color: '#fff' }} onClick={() => handleDeleteFixed(selectedFixed.id)}>🗑 삭제</button></div><button type="button" className="btn-close" style={{ width: '100%' }} onClick={() => setFixedModalOpen(false)}>닫기</button></form></div></div>
            )}
            {modalOpen && (
                <div className="modal-overlay show"><div className="modal-content"><h3>📅 일정 세부 수정</h3><form onSubmit={handleUpdateSchedule} className="quick-modal-form"><div className="form-group"><label>제목</label><input type="text" value={selectedEvent.title} onChange={e => setSelectedEvent({ ...selectedEvent, title: e.target.value })} required /></div><div className="form-row"><div className="form-group" style={{flex:1}}><label>시작</label><select value={selectedEvent.startTime} onChange={e => setSelectedEvent({...selectedEvent, startTime:e.target.value})}>{timeSelectOptions}</select></div><div className="form-group" style={{flex:1}}><label>종료</label><select value={selectedEvent.endTime} onChange={e => setSelectedEvent({...selectedEvent, endTime:e.target.value})}>{timeSelectOptions}</select></div></div><div className="btn-container"><button type="submit" className="btn-submit">💾 저장</button><button type="button" className="btn-close" style={{ backgroundColor: '#e74c3c', color: '#fff' }} onClick={handleDeleteSchedule}>🗑 삭제</button></div><button type="button" className="btn-close" style={{ width: '100%' }} onClick={() => setModalOpen(false)}>취소</button></form></div></div>
            )}
            {addModalOpen && (
                <div className="modal-overlay show"><div className="modal-content"><h3>📅 일정 신속 등록</h3><form onSubmit={handleAddSchedule} className="quick-modal-form"><div className="form-group"><label>이름</label><input type="text" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} required /></div><div className="form-row"><div className="form-group" style={{flex:1}}><label>시작</label><select value={newEvent.startTime} onChange={e => setNewEvent({...newEvent, startTime:e.target.value})}>{timeSelectOptions}</select></div><div className="form-group" style={{flex:1}}><label>종료</label><select value={newEvent.endTime} onChange={e => setNewEvent({...newEvent, endTime:e.target.value})}>{timeSelectOptions}</select></div></div><div className="btn-container"><button type="submit" className="btn-submit">✅ 등록</button><button type="button" className="btn-close" onClick={() => setAddModalOpen(false)}>닫기</button></div></form></div></div>
            )}
        </div>
    );
}

export default Timeline;