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
    const [selectedEvent, setSelectedEvent] = useState({ id: '', title: '', date: '', startTime: '', endTime: '', category: '기타', isCompleted: false });

    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', date: '', startTime: '', endTime: '', category: '기타' });

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
            setScheduleList(data.scheduleList);
            setFixedList(data.fixedList);
            setCompletedFixedKeys(data.completedFixedKeys || []);
        });
    };

    useEffect(() => { loadData(); }, []);

    const dayIdxToDateStr = (dayIdx) => {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
        const target = new Date(monday);
        target.setDate(monday.getDate() + (dayIdx === 0 ? 6 : dayIdx - 1));
        const y = target.getFullYear();
        const m = String(target.getMonth() + 1).padStart(2, '0');
        const d = String(target.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const pxToTime = (px) => {
        const totalMinutes = Math.round((px / PX_PER_HOUR) * 60 / 60) * 60;
        const h = Math.min(Math.floor(totalMinutes / 60) + startH, 23);
        const m = totalMinutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const handleAiSubmit = async (e) => {
        e.preventDefault();
        try {
            await request('/schedule/ai', { method: 'POST', body: { message: aiMessage } });
            setAiMessage('');
            loadData();
        } catch (err) { alert(err.message); }
    };

    const handleUpdateSchedule = async (e) => {
        e.preventDefault();
        try {
            await request('/schedule/update', { method: 'PUT', body: selectedEvent });
            setModalOpen(false);
            loadData();
        } catch (err) { alert(err.message); }
    };

    const handleDeleteSchedule = async () => {
        if (!window.confirm('정말 삭제할까요?')) return;
        try {
            await request(`/schedule/delete/${selectedEvent.id}`, { method: 'DELETE' });
            setModalOpen(false);
            loadData();
        } catch (err) { alert(err.message); }
    };

    const handleGridClick = (e, dayIdx, screenIdx) => {
        if (e.target.classList.contains('timetable-event')) return;
        if (e.target.classList.contains('resize-handle')) return;
        if (dragRef.current?.didDrag) return;
        if (wasResizedRef.current) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const clickedHour = Math.floor(y / PX_PER_HOUR) + startH;
        const clickedTime = `${String(clickedHour).padStart(2, '0')}:00`;
        const endTime = `${String(Math.min(clickedHour + 1, 23)).padStart(2, '0')}:00`;
        const dateStr = dayIdxToDateStr(dayIdx);
        setNewEvent({ title: '', date: dateStr, startTime: clickedTime, endTime, category: '기타' });
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

    const handleAddFixed = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const body = Object.fromEntries(formData.entries());
        try {
            await request('/fixed/add', { method: 'POST', body });
            setIsFixedFormOpen(false);
            loadData();
        } catch (err) { alert(err.message); }
    };

    const handleDeleteFixed = async (id) => {
        if (!window.confirm('정말 삭제할까요?')) return;
        try {
            await request(`/fixed/delete/${id}`, { method: 'DELETE' });
            loadData();
        } catch (err) { alert(err.message); }
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
        e.stopPropagation();
        e.preventDefault();

        const rect = e.currentTarget.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const bgClass = categoryColors[schedule.category] || 'bg-pastel-green';

        dragRef.current = {
            type: 'move',
            id: schedule.id,
            title: schedule.title,
            category: schedule.category,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            offsetY,
            originalStart: schedule.startTime.substring(0, 5),
            originalEnd: schedule.endTime ? schedule.endTime.substring(0, 5) : '',
            originalDate: schedule.date,
            originalScreenIdx: screenIdx,
            didDrag: false,
            bgClass,
            blockWidth: rect.width,
            blockHeight: rect.height,
        };
        setDraggingId(schedule.id);

        const onMouseMove = (ev) => {
            if (!dragRef.current) return;
            const dx = ev.clientX - dragRef.current.startMouseX;
            const dy = ev.clientY - dragRef.current.startMouseY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.didDrag = true;
            setGhost({
                x: ev.clientX - 10,
                y: ev.clientY - dragRef.current.offsetY,
                width: dragRef.current.blockWidth,
                height: dragRef.current.blockHeight,
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

            wasResizedRef.current = true;
            setTimeout(() => { wasResizedRef.current = false; }, 200);

            const dayCols = document.querySelectorAll('.day-col');
            let targetScreenIdx = dragRef.current.originalScreenIdx;
            let targetDayIdx = dayMap[targetScreenIdx];
            dayCols.forEach((col, i) => {
                const r = col.getBoundingClientRect();
                if (ev.clientX >= r.left && ev.clientX <= r.right) {
                    targetScreenIdx = i;
                    targetDayIdx = dayMap[i];
                }
            });

            const gridEls = document.querySelectorAll('.day-grid');
            const gridEl = gridEls[targetScreenIdx];
            if (!gridEl) { dragRef.current = null; return; }

            const gridRect = gridEl.getBoundingClientRect();
            const rawY = ev.clientY - gridRect.top - dragRef.current.offsetY;

            if (ev.clientY < gridRect.top || ev.clientY > gridRect.bottom) {
                dragRef.current = null;
                return;
            }

            const clampedY = Math.max(0, rawY);
            const newStartTime = pxToTime(clampedY);

            let newEndTime = dragRef.current.originalEnd;
            if (dragRef.current.originalEnd) {
                const [sh, sm] = dragRef.current.originalStart.split(':').map(Number);
                const [eh, em] = dragRef.current.originalEnd.split(':').map(Number);
                const duration = (eh * 60 + em) - (sh * 60 + sm);
                const [nsh, nsm] = newStartTime.split(':').map(Number);
                const totalEnd = nsh * 60 + nsm + duration;
                const newEH = Math.min(Math.floor(totalEnd / 60), 23);
                const newEM = totalEnd % 60;
                newEndTime = `${String(newEH).padStart(2, '0')}:${String(newEM).padStart(2, '0')}`;
            }

            const newDate = dayIdxToDateStr(targetDayIdx);

            const payload = {
                id: dragRef.current.id,
                title: dragRef.current.title,
                category: dragRef.current.category,
                date: newDate,
                startTime: newStartTime,
                endTime: newEndTime === '' ? null : newEndTime,
            };

            try {
                await request('/schedule/update', { method: 'PUT', body: payload });
                await loadData();
                setSelectedEvent({
                    id: payload.id,
                    title: payload.title,
                    date: payload.date,
                    startTime: payload.startTime,
                    endTime: payload.endTime || '',
                    category: payload.category,
                    isCompleted: false,
                });
            } catch (err) { alert(err.message); }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const handleResizeStart = (e, schedule) => {
        e.stopPropagation();
        e.preventDefault();

        const gridEl = e.currentTarget.closest('.day-grid');
        const gridRect = gridEl.getBoundingClientRect();
        const startPx = ((() => {
            const [sh, sm] = schedule.startTime.substring(0, 5).split(':').map(Number);
            return ((sh + sm / 60) - startH) * PX_PER_HOUR;
        })());

        dragRef.current = {
            type: 'resize',
            id: schedule.id,
            title: schedule.title,
            date: schedule.date,
            category: schedule.category,
            originalStart: schedule.startTime.substring(0, 5),
            bgClass: categoryColors[schedule.category] || 'bg-pastel-green',
            blockLeft: gridRect.left,
            blockWidth: gridRect.width,
            blockTop: gridRect.top + startPx,
            didDrag: false,
        };
        setResizingId(schedule.id);

        const onMouseMove = (ev) => {
            if (!dragRef.current) return;
            dragRef.current.didDrag = true;
            const newHeight = Math.max(15, ev.clientY - dragRef.current.blockTop);
            setGhost({
                x: dragRef.current.blockLeft,
                y: dragRef.current.blockTop,
                width: dragRef.current.blockWidth - 4,
                height: newHeight,
                title: dragRef.current.title,
                bgClass: dragRef.current.bgClass,
                isResize: true,
            });
        };

        const onMouseUp = async (ev) => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            setResizingId(null);
            setGhost(null);

            if (!dragRef.current?.didDrag) { dragRef.current = null; return; }

            const { id, title, date, originalStart, category } = dragRef.current;

            wasResizedRef.current = true;
            dragRef.current = null;
            setTimeout(() => { wasResizedRef.current = false; }, 200);

            const gridRect = gridEl.getBoundingClientRect();
            const rawY = ev.clientY - gridRect.top;
            const clampedY = Math.max(0, rawY);
            const newEndTime = pxToTime(clampedY);

            const [sh, sm] = originalStart.split(':').map(Number);
            const [eh, em] = newEndTime.split(':').map(Number);
            if (eh * 60 + em <= sh * 60 + sm + 15) return;

            const payload = { id, title, date, category, startTime: originalStart, endTime: newEndTime };
            try {
                await request('/schedule/update', { method: 'PUT', body: payload });
                loadData();
            } catch (err) { alert(err.message); }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const currentDayOfWeek = new Date().getDay();

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
            <div className="section-title">주간 일정 관리 &amp; 시간표</div>

            {ghost && (
                <div
                    className={`timetable-event ${ghost.bgClass}`}
                    style={{
                        position: 'fixed',
                        left: ghost.x,
                        top: ghost.y,
                        width: ghost.width,
                        height: ghost.height,
                        opacity: 0.75,
                        pointerEvents: 'none',
                        zIndex: 9999,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                        transform: 'rotate(2deg)',
                    }}
                >
                    {ghost.title}
                </div>
            )}

            <div className="ai-form-container">
                <form onSubmit={handleAiSubmit} className="ai-form">
                    <input type="text" className="ai-input" placeholder="예: 이번주 금요일 오후 3시에 회의 추가" value={aiMessage} onChange={(e) => setAiMessage(e.target.value)} required />
                    <button type="submit" className="btn-ai">✨ AI 일정 추가</button>
                </form>
            </div>

            <div className="timeline-layout">
                <div className="fixed-panel">
                    <div className="fixed-panel-header">📌 고정 일정</div>
                    <div className="fixed-panel-body">
                        <button className="btn-fixed-add-toggle" onClick={() => setIsFixedFormOpen(!isFixedFormOpen)}>+ 고정 일정 추가</button>
                        {isFixedFormOpen && (
                            <form onSubmit={handleAddFixed} className="fixed-add-form open">
                                <label>일정 이름</label><input type="text" name="title" required />
                                <label>요일</label>
                                <select name="dayOfWeek" required>
                                    {dayLabels.map((l, i) => <option key={i} value={i}>{l}요일</option>)}
                                </select>
                                <label>시작 시간</label>
                                <select name="startTime" required>
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <option key={i} value={`${String(i).padStart(2, '0')}:00`}>{String(i).padStart(2, '0')}시</option>
                                    ))}
                                </select>
                                <label>종료 시간</label>
                                <select name="endTime" required>
                                    {Array.from({ length: 24 }, (_, i) => {
                                        const h = i + 1;
                                        const val = h < 24 ? `${String(h).padStart(2, '0')}:00` : '23:59';
                                        return <option key={i} value={val}>{h < 24 ? `${String(h).padStart(2, '0')}시` : '23:59'}</option>;
                                    })}
                                </select>
                                <label>카테고리</label>
                                <select name="category" required defaultValue="기타">
                                    {['회의', '공부', '약속', '운동', '기타'].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                                <label>시작일 (비워두면 이번주부터)</label><input type="date" name="startDate" />
                                <label>기한 (비워두면 무기한)</label><input type="date" name="endDate" />
                                <button type="submit" className="btn-fixed-submit">✅ 추가</button>
                            </form>
                        )}
                        {fixedList.map(f => (
                            <div key={f.id} className={`fixed-item-card cat-${f.category}`}>
                                <div className="f-title">{f.title}</div>
                                <div className="f-day">{dayLabels[f.dayOfWeek]}요일</div>
                                <div className="f-time">{f.startTime} ~ {f.endTime}</div>
                                <button className="btn-fixed-del" onClick={() => handleDeleteFixed(f.id)}>🗑 삭제</button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="timetable-wrapper">
                    <div className="timetable">
                        <div className="time-col">
                            <div className="time-header"></div>
                            {Array.from({ length: hours }).map((_, i) => (
                                <div key={i} className="time-slot">{String(startH + i).padStart(2, '0')}:00</div>
                            ))}
                        </div>

                        {dayMap.map((dayIdx, idx) => {
                            const isToday = currentDayOfWeek === dayIdx;
                            const daySchedules = scheduleList.filter(s => new Date(s.date).getDay() === dayIdx);
                            const dayFixed = fixedList.filter(f => {
                                if (f.dayOfWeek !== (dayIdx === 0 ? 6 : dayIdx - 1)) return false;
                                const dateStr = dayIdxToDateStr(dayIdx);
                                if (f.startDate && f.startDate > dateStr) return false;
                                if (f.endDate && f.endDate < dateStr) return false;
                                return true;
                            });

                            return (
                                <div key={dayIdx} className={`day-col ${isToday ? 'is-today' : ''}`}>
                                    <div className="day-header">{dayLabels[idx]}</div>
                                    <div
                                        className="day-grid"
                                        style={{ height: `${hours * PX_PER_HOUR}px` }}
                                        onClick={(e) => handleGridClick(e, dayIdx, idx)}
                                    >
                                        {daySchedules.map((s) => {
                                            const { top, height } = getPos(s.startTime, s.endTime);
                                            const bgClass = categoryColors[s.category] || 'bg-pastel-green';
                                            const isDragging = draggingId === s.id;

                                            return (
                                                <div
                                                    key={s.id}
                                                    className={`timetable-event ${bgClass} ${s.isCompleted ? 'is-completed' : ''}`}
                                                    style={{
                                                        top, height,
                                                        cursor: isDragging ? 'grabbing' : 'grab',
                                                        opacity: isDragging ? 0.3 : 0.8,
                                                        userSelect: 'none',
                                                        position: 'absolute',
                                                        zIndex: isDragging ? 10 : 1,
                                                    }}
                                                    onMouseDown={(e) => handleDragStart(e, s, idx, dayIdx)}
                                                    onClick={(e) => {
                                                        if (dragRef.current?.didDrag) { e.stopPropagation(); return; }
                                                        if (wasResizedRef.current) { e.stopPropagation(); return; }
                                                        e.stopPropagation();
                                                        setSelectedEvent({
                                                            id: s.id,
                                                            title: s.title,
                                                            date: s.date,
                                                            startTime: s.startTime.substring(0, 5),
                                                            endTime: s.endTime ? s.endTime.substring(0, 5) : '',
                                                            category: s.category || '기타',
                                                            isCompleted: s.isCompleted || false,
                                                        });
                                                        setModalOpen(true);
                                                    }}
                                                >
                                                    {s.title}
                                                    <div
                                                        className="resize-handle"
                                                        style={{
                                                            position: 'absolute', bottom: 0, left: 0, right: 0,
                                                            height: '8px', cursor: 'ns-resize',
                                                            background: 'rgba(0,0,0,0.15)',
                                                            borderRadius: '0 0 4px 4px',
                                                        }}
                                                        onMouseDown={(e) => handleResizeStart(e, s)}
                                                    />
                                                </div>
                                            );
                                        })}

                                        {dayFixed.map((f) => {
                                            const { top, height } = getPos(f.startTime, f.endTime);
                                            return (
                                                <div key={f.id} className={`timetable-event ${categoryColors[f.category] || 'bg-pastel-yellow'} ${completedFixedKeys.includes(`${f.id}-${dayIdxToDateStr(dayIdx)}`) ? 'is-completed' : ''}`} style={{ top, height, opacity: 0.7, borderLeft: '3px solid #C5A065', fontSize: '11px', position: 'absolute' }}>
                                                    📌 {f.title}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 수정 모달 */}
            {modalOpen && (
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
                            <button type="button" className="btn-fixed-submit" style={{ width: '100%', marginTop: '6px', backgroundColor: '#aaa' }} onClick={() => setModalOpen(false)}>닫기</button>
                        </form>
                    </div>
                </div>
            )}

            {/* 추가 모달 */}
            {addModalOpen && (
                <div className="modal-overlay show">
                    <div className="modal-content">
                        <h3>📅 일정 추가</h3>
                        <form onSubmit={handleAddSchedule} className="fixed-add-form open" style={{ boxShadow: 'none', padding: 0, background: 'none' }}>
                            <label>제목</label>
                            <input type="text" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} required autoFocus />
                            <label>시작 시간</label>
                            <select value={newEvent.startTime} onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })} required>
                                {timeSelectOptions}
                            </select>
                            <label>종료 시간</label>
                            <select value={newEvent.endTime} onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })}>
                                {endTimeOptions}
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

export default Timeline;