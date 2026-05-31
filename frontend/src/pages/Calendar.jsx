import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Save, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { request } from '../api';

const categoryColors = {
    '회의': "bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-blue-500/20",
    '공부': "bg-gradient-to-br from-indigo-500 to-purple-400 text-white shadow-indigo-500/20",
    '약속': "bg-gradient-to-br from-orange-500 to-yellow-400 text-white shadow-orange-500/20",
    '운동': "bg-gradient-to-br from-green-500 to-emerald-400 text-white shadow-green-500/20",
    '기타': "bg-gradient-to-br from-gray-500 to-slate-400 text-white shadow-gray-500/20"
};

function Calendar({ theme }) {
    const isDarkMode = theme === 'dark';
    const [currentDate, setCurrentDate] = useState(new Date());
    const [scheduleList, setScheduleList] = useState([]);
    const [fixedList, setFixedList] = useState([]);
    const [completedFixedKeys, setCompletedFixedKeys] = useState([]);

    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', date: '', startTime: '09:00', endTime: '10:00', category: '기타' });

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState({ id: '', title: '', date: '', startTime: '', endTime: '', category: '기타', isCompleted: false });

    // ✨ 팀원분이 추가한 고정 일정 완료 모달 상태
    const [fixedCheckModalOpen, setFixedCheckModalOpen] = useState(false);
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
        e.stopPropagation(); e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const bgClass = categoryColors[evt.category] || categoryColors['기타'];

        dragRef.current = {
            id: evt.id, title: evt.title, category: evt.category,
            startTime: evt.startTime, endTime: evt.endTime, date: evt.date,
            bgClass, chipWidth: rect.width, chipHeight: rect.height,
            didDrag: false, startMouseX: e.clientX, startMouseY: e.clientY,
        };
        setDraggingId(evt.id);

        const onMouseMove = (ev) => {
            if (!dragRef.current) return;
            const dx = ev.clientX - dragRef.current.startMouseX;
            const dy = ev.clientY - dragRef.current.startMouseY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.didDrag = true;
            setGhost({
                x: ev.clientX + 10, y: ev.clientY + 10,
                width: dragRef.current.chipWidth, height: dragRef.current.chipHeight,
                title: dragRef.current.title, bgClass: dragRef.current.bgClass,
            });
        };

        const onMouseUp = async (ev) => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            setDraggingId(null); setGhost(null);

            if (!dragRef.current?.didDrag) { dragRef.current = null; return; }
            wasClickRef.current = true;
            setTimeout(() => { wasClickRef.current = false; }, 200);

            const calCells = document.querySelectorAll('.cal-cell-target');
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

            try {
                await request('/schedule/update', { method: 'PUT', body: { id, title, category, date: targetDate, startTime, endTime } });
                loadData();
            } catch (err) { alert(err.message); }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
        cells.push(<div key={`empty-${i}`} className={cn("min-h-[120px] p-2", isDarkMode ? "bg-black/10" : "bg-gray-50/50")}></div>);
    }

    const todayDate = new Date();

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
            fixedId: f.id, // ✨ 팀원분 로직 (완료 처리에 필요)
            title: `📌 ${f.title}`,
            startTime: f.startTime, 
            category: f.category, 
            isFixed: true,
            isCompleted: completedFixedKeys.includes(`${f.id}-${dateStr}`),
            date: dateStr
        }));

        const allDayEvents = [...dayEvents, ...dayFixedEvents].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        const isToday = d === todayDate.getDate() && month === todayDate.getMonth() && year === todayDate.getFullYear();

        cells.push(
            <div key={d} data-date={dateStr} onClick={() => handleCellClick(dateStr)}
                className={cn("cal-cell-target min-h-[120px] p-2 border-t border-l transition-colors cursor-pointer group flex flex-col gap-1",
                    isDarkMode ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-white border-gray-100 hover:bg-gray-50"
                )}
            >
                <div className="flex justify-between items-start mb-1">
                    <span className={cn("w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold", 
                        isToday ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md" : 
                        (jsDay === 0 ? "text-red-500" : jsDay === 6 ? "text-blue-500" : (isDarkMode ? "text-white" : "text-gray-700"))
                    )}>
                        {d}
                    </span>
                </div>
                <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar flex-1">
                    {allDayEvents.map((evt) => {
                        const bgClass = categoryColors[evt.category] || categoryColors['기타'];
                        const isDragging = draggingId === evt.id;
                        return (
                            <div key={evt.id} onMouseDown={(e) => handleChipDragStart(e, evt)}
                                onClick={e => {
                                    e.stopPropagation();
                                    
                                    // ✨ 고정 일정을 클릭했을 때 완료 처리 모달 띄우기 (팀원 기능)
                                    if (evt.isFixed) {
                                        setSelectedFixedCheck({ id: evt.fixedId, title: evt.title, date: evt.date });
                                        setFixedCheckModalOpen(true);
                                        return;
                                    }
                                    
                                    // 일반 일정 클릭 시 수정 모달 띄우기
                                    setSelectedEvent({ id: evt.id, title: evt.title, date: evt.date || dateStr, startTime: evt.startTime?.substring(0, 5) || '', endTime: evt.endTime?.substring(0, 5) || '', category: evt.category || '기타', isCompleted: evt.isCompleted || false });
                                    setEditModalOpen(true);
                                }}
                                className={cn("px-2 py-1 rounded-md text-[11px] font-medium truncate shadow-sm transition-all flex items-center gap-1", bgClass, evt.isCompleted && "line-through opacity-50")}
                                style={{ opacity: isDragging ? 0.3 : (evt.isCompleted ? 0.5 : 0.9), cursor: evt.isFixed ? 'pointer' : 'grab' }}
                            >
                                <span className="opacity-75">{evt.startTime?.substring(0, 5)}</span>
                                <span className="truncate">{evt.title}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    const optionClass = isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900";
    
    const timeSelectOptions = Array.from({ length: 24 }, (_, i) => <option key={i} value={`${String(i).padStart(2, '0')}:00`} className={optionClass}>{String(i).padStart(2, '0')}시</option>);
    const endTimeOptions = [<option key="none" value="" className={optionClass}>없음</option>, ...Array.from({ length: 24 }, (_, i) => {
        const h = i + 1; const val = h < 24 ? `${String(h).padStart(2, '0')}:00` : '23:59';
        return <option key={i} value={val} className={optionClass}>{h < 24 ? `${String(h).padStart(2, '0')}시` : '23:59'}</option>;
    })];

    return (
        <div className="animate-in fade-in duration-500 h-full flex flex-col">
            
            {ghost && (
                <div className={cn("fixed rounded-md px-2 py-1 text-[11px] font-semibold shadow-2xl pointer-events-none z-[9999] opacity-80 flex items-center", ghost.bgClass)}
                     style={{ left: ghost.x, top: ghost.y, width: ghost.width, height: ghost.height, transform: 'rotate(2deg) scale(1.05)' }}>
                    {ghost.title}
                </div>
            )}

            {/* Header Controls */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <CalendarIcon className="w-5 h-5 text-white" />
                    </div>
                    <h1 className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>월간 캘린더</h1>
                </div>
                
                <div className={cn("flex items-center gap-4 px-4 py-2 rounded-xl border backdrop-blur-sm shadow-sm", isDarkMode ? "bg-white/5 border-white/10" : "bg-white/80 border-gray-200/50")}>
                    <button onClick={prevMonth} className={cn("p-1.5 rounded-lg hover:bg-purple-500/10 transition-colors", isDarkMode ? "text-white/70 hover:text-purple-400" : "text-gray-600 hover:text-purple-600")}><ChevronLeft className="w-5 h-5" /></button>
                    <h2 className={cn("text-lg font-bold min-w-[120px] text-center", isDarkMode ? "text-white" : "text-gray-800")}>{year}년 {month + 1}월</h2>
                    <button onClick={nextMonth} className={cn("p-1.5 rounded-lg hover:bg-purple-500/10 transition-colors", isDarkMode ? "text-white/70 hover:text-purple-400" : "text-gray-600 hover:text-purple-600")}><ChevronRight className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className={cn("flex-1 rounded-xl border backdrop-blur-sm overflow-hidden flex flex-col shadow-lg", isDarkMode ? "bg-white/5 border-white/10" : "bg-white/80 border-gray-200/50")}>
                <div className={cn("grid grid-cols-7 border-b", isDarkMode ? "border-white/10 bg-black/20" : "border-gray-200 bg-gray-50")}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                        <div key={day} className={cn("py-3 text-center text-sm font-bold", i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : (isDarkMode ? "text-white/70" : "text-gray-600"))}>
                            {day}
                        </div>
                    ))}
                </div>
                <div className={cn("flex-1 grid grid-cols-7 bg-transparent border-l-0 border-t-0", isDarkMode ? "[&>div]:border-white/10" : "[&>div]:border-gray-200")}>
                    {cells}
                </div>
            </div>

            {/* ✨ 팀원분이 추가한 캘린더용 고정 일정 체크 모달창 (디자인 입힘) */}
            {fixedCheckModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className={cn("w-full max-w-sm rounded-2xl p-6 border shadow-2xl animate-in zoom-in-95", isDarkMode ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900")}>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold">{selectedFixedCheck.title}</h3>
                            <button onClick={() => setFixedCheckModalOpen(false)} className="p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-muted"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <label className="flex items-center gap-3 p-4 rounded-xl border bg-background/50 cursor-pointer hover:bg-muted/50 transition-colors">
                            <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                                checked={completedFixedKeys.includes(`${selectedFixedCheck.id}-${selectedFixedCheck.date}`)}
                                onChange={async () => {
                                    try {
                                        await request('/schedule/fixed-complete', {
                                            method: 'PUT',
                                            body: { fixedId: selectedFixedCheck.id, date: selectedFixedCheck.date }
                                        });
                                        await loadData();
                                    } catch (err) { alert(err.message); }
                                }}
                            />
                            <span className="font-medium">일정 완료 처리하기</span>
                        </label>

                        <button type="button" onClick={() => setFixedCheckModalOpen(false)} className="w-full mt-4 py-3 rounded-xl bg-gray-200 text-gray-800 font-bold hover:bg-gray-300 transition-colors dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                            닫기
                        </button>
                    </div>
                </div>
            )}

            {/* Modals (Edit & Add) */}
            {(editModalOpen || addModalOpen) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className={cn("w-full max-w-sm rounded-2xl p-6 border shadow-2xl animate-in zoom-in-95", isDarkMode ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900")}>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold">{editModalOpen ? '일정 수정' : '일정 추가'}</h3>
                            <button onClick={() => editModalOpen ? setEditModalOpen(false) : setAddModalOpen(false)} className="p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-muted"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <form onSubmit={editModalOpen ? handleUpdateSchedule : handleAddSchedule} className="space-y-4">
                            {(() => {
                                const state = editModalOpen ? selectedEvent : newEvent;
                                const setState = editModalOpen ? setSelectedEvent : setNewEvent;
                                const inputClass = cn("w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500/50", isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900");
                                
                                return (
                                    <>
                                        <div><label className="text-xs font-medium text-muted-foreground mb-1 block">제목</label><input type="text" value={state.title} onChange={e => setState({ ...state, title: e.target.value })} className={inputClass} required autoFocus /></div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">시작</label><select value={state.startTime} onChange={e => setState({ ...state, startTime: e.target.value })} className={inputClass} required>{timeSelectOptions}</select></div>
                                            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">종료</label><select value={state.endTime} onChange={e => setState({ ...state, endTime: e.target.value })} className={inputClass}>{endTimeOptions}</select></div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">분류</label>
                                            <select value={state.category} onChange={e => setState({ ...state, category: e.target.value })} className={inputClass} required>
                                                {['회의', '공부', '약속', '운동', '기타'].map(v => <option key={v} value={v} className={optionClass}>{v}</option>)}
                                            </select>
                                        </div>
                                        
                                        {editModalOpen && (
                                            <label className="flex items-center gap-2 mt-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600" checked={state.isCompleted || false} onChange={e => setState({ ...state, isCompleted: e.target.checked })} />
                                                <span className="text-sm">일정 완료 처리</span>
                                            </label>
                                        )}

                                        <div className="flex gap-2 pt-2">
                                            {editModalOpen && <button type="button" onClick={handleDeleteSchedule} className="px-4 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 font-medium transition-colors"><Trash2 className="w-4 h-4" /></button>}
                                            <button type="submit" className="flex-1 flex justify-center items-center gap-2 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all">
                                                <Save className="w-4 h-4" /> 저장하기
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Calendar;