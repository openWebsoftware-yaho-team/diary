import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Plus, Trash2, X, Save } from 'lucide-react';
import { cn } from '../lib/utils';
import { request } from '../api';

const categoryColors = {
    '회의': "bg-gradient-to-br from-blue-500 to-cyan-400 text-white border-blue-400",
    '공부': "bg-gradient-to-br from-indigo-500 to-purple-400 text-white border-indigo-400",
    '약속': "bg-gradient-to-br from-orange-500 to-yellow-400 text-white border-orange-400",
    '운동': "bg-gradient-to-br from-green-500 to-emerald-400 text-white border-green-400",
    '기타': "bg-gradient-to-br from-gray-500 to-slate-400 text-white border-gray-400"
};

const fixedCategoryColors = {
    '회의': "border-l-4 border-l-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    '공부': "border-l-4 border-l-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    '약속': "border-l-4 border-l-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    '운동': "border-l-4 border-l-green-500 bg-green-500/10 text-green-700 dark:text-green-300",
    '기타': "border-l-4 border-l-gray-500 bg-gray-500/10 text-gray-700 dark:text-gray-300"
};

function Timeline({ theme }) {
    const isDarkMode = theme === 'dark';
    
    const [scheduleList, setScheduleList] = useState([]);
    const [fixedList, setFixedList] = useState([]);
    const [aiMessage, setAiMessage] = useState('');
    const [isFixedFormOpen, setIsFixedFormOpen] = useState(false);
    
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState({ id: '', title: '', date: '', startTime: '', endTime: '', category: '기타', isCompleted: false });
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', date: '', startTime: '', endTime: '', category: '기타' });

    const [fixedCheckModalOpen, setFixedCheckModalOpen] = useState(false);
    const [selectedFixedCheck, setSelectedFixedCheck] = useState({ id: '', title: '', date: '' });

    const [fixedEditModalOpen, setFixedEditModalOpen] = useState(false);
    const [selectedFixedEvent, setSelectedFixedEvent] = useState({ id: '', title: '', startDate: '', endDate: '', dayOfWeek: 0, category: '기타', startTime: '', endTime: '' });

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

    const currentDayOfWeek = new Date().getDay();

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

    // 타임라인의 빈 공간 클릭 시 해당 요일/시간으로 추가
    const handleGridClick = (e, dayIdx, screenIdx) => {
        if (e.target.closest('.timetable-event') || e.target.closest('.fixed-event') || e.target.classList.contains('resize-handle')) return;
        if (dragRef.current?.didDrag || wasResizedRef.current) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const clickedHour = Math.floor(y / PX_PER_HOUR) + startH;
        const clickedTime = `${String(clickedHour).padStart(2, '0')}:00`;
        const endTime = `${String(Math.min(clickedHour + 1, 23)).padStart(2, '0')}:00`;
        const dateStr = dayIdxToDateStr(dayIdx);
        setNewEvent({ title: '', date: dateStr, startTime: clickedTime, endTime, category: '기타' });
        setAddModalOpen(true);
    };

    // ✨ 왼쪽 시간 텍스트 클릭 시 '오늘' 날짜 해당 시간으로 추가
    const handleTimeColumnClick = (hour) => {
        const clickedTime = `${String(hour).padStart(2, '0')}:00`;
        const endTime = `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00`;
        const dateStr = dayIdxToDateStr(currentDayOfWeek);
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

    const handleUpdateFixed = async (e) => {
        e.preventDefault();
        try {
            await request('/fixed/update', { method: 'PUT', body: selectedFixedEvent });
            setFixedEditModalOpen(false);
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
        e.stopPropagation(); e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const bgClass = categoryColors[schedule.category] || categoryColors['기타'];

        dragRef.current = {
            type: 'move', id: schedule.id, title: schedule.title, category: schedule.category,
            startMouseX: e.clientX, startMouseY: e.clientY, offsetY,
            originalStart: schedule.startTime.substring(0, 5),
            originalEnd: schedule.endTime ? schedule.endTime.substring(0, 5) : '',
            originalDate: schedule.date, originalScreenIdx: screenIdx,
            didDrag: false, bgClass, blockWidth: rect.width, blockHeight: rect.height,
        };
        setDraggingId(schedule.id);

        const onMouseMove = (ev) => {
            if (!dragRef.current) return;
            const dx = ev.clientX - dragRef.current.startMouseX;
            const dy = ev.clientY - dragRef.current.startMouseY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.didDrag = true;
            setGhost({
                x: ev.clientX - 10, y: ev.clientY - dragRef.current.offsetY,
                width: dragRef.current.blockWidth, height: dragRef.current.blockHeight,
                title: dragRef.current.title, bgClass: dragRef.current.bgClass,
            });
        };

        const onMouseUp = async (ev) => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            setDraggingId(null); setGhost(null);

            if (!dragRef.current?.didDrag) { dragRef.current = null; return; }
            wasResizedRef.current = true;
            setTimeout(() => { wasResizedRef.current = false; }, 200);

            const dayCols = document.querySelectorAll('.day-col');
            let targetScreenIdx = dragRef.current.originalScreenIdx;
            let targetDayIdx = dayMap[targetScreenIdx];
            dayCols.forEach((col, i) => {
                const r = col.getBoundingClientRect();
                if (ev.clientX >= r.left && ev.clientX <= r.right) {
                    targetScreenIdx = i; targetDayIdx = dayMap[i];
                }
            });

            const gridEls = document.querySelectorAll('.day-grid');
            const gridEl = gridEls[targetScreenIdx];
            if (!gridEl) { dragRef.current = null; return; }

            const gridRect = gridEl.getBoundingClientRect();
            const rawY = ev.clientY - gridRect.top - dragRef.current.offsetY;
            if (ev.clientY < gridRect.top || ev.clientY > gridRect.bottom) { dragRef.current = null; return; }

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

            const payload = {
                id: dragRef.current.id, title: dragRef.current.title, category: dragRef.current.category,
                date: dayIdxToDateStr(targetDayIdx), startTime: newStartTime, endTime: newEndTime === '' ? null : newEndTime,
            };

            try {
                await request('/schedule/update', { method: 'PUT', body: payload });
                await loadData();
            } catch (err) { alert(err.message); }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const handleResizeStart = (e, schedule) => {
        e.stopPropagation(); e.preventDefault();
        const gridEl = e.currentTarget.closest('.day-grid');
        const gridRect = gridEl.getBoundingClientRect();
        const startPx = ((() => {
            const [sh, sm] = schedule.startTime.substring(0, 5).split(':').map(Number);
            return ((sh + sm / 60) - startH) * PX_PER_HOUR;
        })());

        dragRef.current = {
            type: 'resize', id: schedule.id, title: schedule.title, date: schedule.date, category: schedule.category,
            originalStart: schedule.startTime.substring(0, 5), bgClass: categoryColors[schedule.category] || categoryColors['기타'],
            blockLeft: gridRect.left, blockWidth: gridRect.width, blockTop: gridRect.top + startPx, didDrag: false,
        };
        setResizingId(schedule.id);

        const onMouseMove = (ev) => {
            if (!dragRef.current) return;
            dragRef.current.didDrag = true;
            const newHeight = Math.max(15, ev.clientY - dragRef.current.blockTop);
            setGhost({
                x: dragRef.current.blockLeft, y: dragRef.current.blockTop,
                width: dragRef.current.blockWidth - 4, height: newHeight,
                title: dragRef.current.title, bgClass: dragRef.current.bgClass, isResize: true,
            });
        };

        const onMouseUp = async (ev) => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            setResizingId(null); setGhost(null);

            if (!dragRef.current?.didDrag) { dragRef.current = null; return; }
            const { id, title, date, originalStart, category } = dragRef.current;
            wasResizedRef.current = true; dragRef.current = null;
            setTimeout(() => { wasResizedRef.current = false; }, 200);

            const gridRect = gridEl.getBoundingClientRect();
            const clampedY = Math.max(0, ev.clientY - gridRect.top);
            const newEndTime = pxToTime(clampedY);

            const [sh, sm] = originalStart.split(':').map(Number);
            const [eh, em] = newEndTime.split(':').map(Number);
            if (eh * 60 + em <= sh * 60 + sm + 15) return;

            try {
                await request('/schedule/update', { method: 'PUT', body: { id, title, date, category, startTime: originalStart, endTime: newEndTime } });
                loadData();
            } catch (err) { alert(err.message); }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const todayPos = dayMap.indexOf(currentDayOfWeek);

    let start3 = todayPos - 1;
    if (start3 < 0) start3 = 0;
    if (start3 > 4) start3 = 4;
    const end3 = start3 + 2;

    let start5 = todayPos - 2;
    if (start5 < 0) start5 = 0;
    if (start5 > 2) start5 = 2;
    const end5 = start5 + 4;

    const optionClass = isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900";
    
    const timeSelectOptions = Array.from({ length: 24 }, (_, i) => <option key={i} value={`${String(i).padStart(2, '0')}:00`} className={optionClass}>{String(i).padStart(2, '0')}시</option>);
    const endTimeOptions = [<option key="none" value="" className={optionClass}>없음</option>, ...Array.from({ length: 24 }, (_, i) => {
        const h = i + 1; const val = h < 24 ? `${String(h).padStart(2, '0')}:00` : '23:59';
        return <option key={i} value={val} className={optionClass}>{h < 24 ? `${String(h).padStart(2, '0')}시` : '23:59'}</option>;
    })];

    const fixedInputClass = cn("w-full p-1.5 rounded border focus:outline-none", isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900");

    return (
        <div className="animate-in fade-in duration-500">
            <h1 className={cn("text-2xl font-bold mb-6", isDarkMode ? "text-white" : "text-gray-900")}>주간 타임라인</h1>

            {ghost && (
                <div className={cn("fixed rounded-md px-2 py-1 text-xs font-semibold shadow-2xl pointer-events-none z-[9999] opacity-80", ghost.bgClass)}
                     style={{ left: ghost.x, top: ghost.y, width: ghost.width, height: ghost.height, transform: 'rotate(2deg)' }}>
                    {ghost.title}
                </div>
            )}

            {/* AI Assistant Input */}
            <div className={cn("mb-8 p-4 rounded-xl border backdrop-blur-sm", isDarkMode ? "bg-white/5 border-white/10" : "bg-white/80 border-gray-200/50 shadow-lg")}>
                <form onSubmit={handleAiSubmit} className="flex flex-col md:flex-row gap-3">
                    <div className="flex items-center gap-3 flex-1 px-4 py-2 rounded-lg border bg-background/50 focus-within:ring-2 focus-within:ring-purple-500/50 transition-all">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <input type="text" className="w-full bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                            placeholder="이번주 금요일 오후 3시에 미팅 잡아줘"
                            value={aiMessage} onChange={(e) => setAiMessage(e.target.value)} required />
                    </div>
                    <button type="submit" className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-md shadow-purple-500/20 hover:shadow-purple-500/40 transition-all whitespace-nowrap">
                        AI 일정 추가
                    </button>
                </form>
            </div>

            <div className="flex flex-col xl:flex-row gap-6">
                {/* Fixed Schedules Panel */}
                <div className={cn("w-full xl:w-64 flex-shrink-0 rounded-xl border backdrop-blur-sm overflow-hidden h-fit", isDarkMode ? "bg-white/5 border-white/10" : "bg-white/80 border-gray-200/50 shadow-lg")}>
                    <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-purple-500/20 font-bold text-sm flex justify-between items-center">
                        <span className={isDarkMode ? "text-purple-300" : "text-purple-700"}>📌 고정 일정</span>
                        <button onClick={() => setIsFixedFormOpen(!isFixedFormOpen)} className="p-1 rounded-md hover:bg-purple-500/20 transition-colors text-purple-500"><Plus className="w-4 h-4" /></button>
                    </div>
                    <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {isFixedFormOpen && (
                            <form onSubmit={handleAddFixed} className={cn("p-3 rounded-lg border space-y-2 text-xs", isDarkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}>
                                <div><label className="text-muted-foreground mb-1 block">이름</label><input type="text" name="title" className={fixedInputClass} required /></div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <div><label className="text-muted-foreground mb-1 block">시작일</label><input type="date" name="startDate" className={fixedInputClass} required /></div>
                                    <div><label className="text-muted-foreground mb-1 block">종료일</label><input type="date" name="endDate" className={fixedInputClass} required /></div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div><label className="text-muted-foreground mb-1 block">요일</label>
                                        <select name="dayOfWeek" className={fixedInputClass} required>{dayLabels.map((l, i) => <option key={i} value={i} className={optionClass}>{l}</option>)}</select>
                                    </div>
                                    <div><label className="text-muted-foreground mb-1 block">분류</label>
                                        <select name="category" className={fixedInputClass} required defaultValue="기타">{['회의', '공부', '약속', '운동', '기타'].map(v => <option key={v} value={v} className={optionClass}>{v}</option>)}</select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><label className="text-muted-foreground mb-1 block">시작</label><select name="startTime" className={fixedInputClass} required>{timeSelectOptions}</select></div>
                                    <div><label className="text-muted-foreground mb-1 block">종료</label><select name="endTime" className={fixedInputClass} required>{endTimeOptions}</select></div>
                                </div>
                                <button type="submit" className="w-full py-1.5 mt-2 rounded bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors">추가하기</button>
                            </form>
                        )}
                        {fixedList.map(f => (
                            <div key={f.id} 
                                 className={cn("rounded-lg p-3 text-xs relative group border border-transparent transition-all cursor-pointer hover:ring-2 hover:ring-purple-500/30", fixedCategoryColors[f.category || '기타'])}
                                 onClick={() => {
                                     setSelectedFixedEvent({
                                         id: f.id, title: f.title, startDate: f.startDate || '', endDate: f.endDate || '', dayOfWeek: f.dayOfWeek,
                                         category: f.category || '기타', startTime: f.startTime, endTime: f.endTime || ''
                                     });
                                     setFixedEditModalOpen(true);
                                 }}
                            >
                                <div className="font-bold mb-1 pr-6">{f.title}</div>
                                <div className="opacity-80 mb-0.5">{f.startDate} ~ {f.endDate}</div>
                                <div className="opacity-80">{dayLabels[f.dayOfWeek]}요일 {f.startTime} ~ {f.endTime}</div>
                                
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteFixed(f.id); }} className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Timetable Grid */}
                <div className={cn("flex-1 rounded-xl border backdrop-blur-sm overflow-x-auto overflow-y-visible", isDarkMode ? "bg-white/5 border-white/10" : "bg-white/80 border-gray-200/50 shadow-lg")}>
                    <div className="flex w-full min-w-full">
                        {/* Time Column */}
                        <div className={cn("w-14 flex-shrink-0 border-r", isDarkMode ? "border-white/10 bg-black/20" : "border-gray-200 bg-gray-50/50")}>
                            <div className={cn("h-12 border-b", isDarkMode ? "border-white/10" : "border-gray-200")}></div>
                            {/* ✨ 시간 텍스트 부분에 onClick 이벤트와 hover 스타일 추가 */}
                            {Array.from({ length: hours }).map((_, i) => {
                                const currentHour = startH + i;
                                return (
                                    <div key={i} 
                                         className={cn("h-[60px] text-[10px] text-right pr-2 font-medium opacity-50 -translate-y-2 cursor-pointer hover:opacity-100 hover:text-purple-500 transition-colors")} 
                                         onClick={() => handleTimeColumnClick(currentHour)}
                                         title="클릭하여 오늘 일정 추가"
                                    >
                                        {String(currentHour).padStart(2, '0')}:00
                                    </div>
                                );
                            })}
                        </div>

                        {/* Days Columns */}
                        {dayMap.map((dayIdx, idx) => {
                            const isToday = currentDayOfWeek === dayIdx;
                            const is3DayView = idx >= start3 && idx <= end3;
                            const is5DayView = idx >= start5 && idx <= end5;

                            let displayClasses = "hidden";
                            if (isToday) {
                                displayClasses = "flex"; 
                            } else if (is3DayView) {
                                displayClasses = "hidden md:flex"; 
                            } else if (is5DayView) {
                                displayClasses = "hidden lg:flex"; 
                            } else {
                                displayClasses = "hidden xl:flex"; 
                            }

                            const daySchedules = scheduleList.filter(s => new Date(s.date).getDay() === dayIdx);
                            const dayFixed = fixedList.filter(f => {
                                if (f.dayOfWeek !== (dayIdx === 0 ? 6 : dayIdx - 1)) return false;
                                const dateStr = dayIdxToDateStr(dayIdx);
                                if (f.startDate && f.startDate > dateStr) return false;
                                if (f.endDate && f.endDate < dateStr) return false;
                                return true;
                            });

                            return (
                                <div key={dayIdx} className={cn(
                                    "flex-1 border-r day-col flex-col transition-all duration-300", 
                                    isDarkMode ? "border-white/10" : "border-gray-200", 
                                    isToday && (isDarkMode ? "bg-purple-500/10" : "bg-purple-500/5"),
                                    displayClasses
                                )}>
                                    <div className={cn("h-12 flex items-center justify-center font-semibold text-sm border-b", isDarkMode ? "border-white/10" : "border-gray-200", isToday && "text-purple-500")}>
                                        {dayLabels[idx]}
                                    </div>
                                    <div className="relative day-grid cursor-pointer" title="빈 공간을 클릭하여 일정 추가" style={{ height: `${hours * PX_PER_HOUR}px`, backgroundImage: `linear-gradient(to bottom, ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} 1px, transparent 1px)`, backgroundSize: `100% 60px` }} onClick={(e) => handleGridClick(e, dayIdx, idx)}>
                                        
                                        {dayFixed.map((f) => {
                                            const { top, height } = getPos(f.startTime, f.endTime);
                                            const dateStr = dayIdxToDateStr(dayIdx);
                                            const isCompleted = completedFixedKeys.includes(`${f.id}-${dateStr}`);
                                            return (
                                                <div key={f.id} 
                                                     className={cn("absolute left-1 right-1 rounded-md px-2 py-1 text-[10px] font-medium border opacity-60 truncate fixed-event cursor-pointer hover:opacity-80 transition-opacity", fixedCategoryColors[f.category || '기타'], isCompleted && "line-through opacity-30")} 
                                                     style={{ top, height }}
                                                     onClick={(e) => {
                                                         e.stopPropagation();
                                                         setSelectedFixedCheck({ id: f.id, title: f.title, date: dateStr });
                                                         setFixedCheckModalOpen(true);
                                                     }}
                                                >
                                                    📌 {f.title}
                                                </div>
                                            );
                                        })}

                                        {daySchedules.map((s) => {
                                            const { top, height } = getPos(s.startTime, s.endTime);
                                            const isDragging = draggingId === s.id;
                                            return (
                                                <div key={s.id} className={cn("absolute left-1 right-1 rounded-md px-2 py-1 text-[11px] font-semibold shadow-sm overflow-hidden transition-shadow timetable-event", categoryColors[s.category || '기타'], s.isCompleted && "line-through opacity-50")}
                                                    style={{ top, height, cursor: isDragging ? 'grabbing' : 'grab', opacity: isDragging ? 0.3 : (s.isCompleted ? 0.5 : 0.9), zIndex: isDragging ? 10 : 2 }}
                                                    onMouseDown={(e) => handleDragStart(e, s, idx, dayIdx)}
                                                    onClick={(e) => {
                                                        if (dragRef.current?.didDrag || wasResizedRef.current) return;
                                                        e.stopPropagation();
                                                        setSelectedEvent({ id: s.id, title: s.title, date: s.date, startTime: s.startTime.substring(0, 5), endTime: s.endTime ? s.endTime.substring(0, 5) : '', category: s.category || '기타', isCompleted: s.isCompleted || false });
                                                        setModalOpen(true);
                                                    }}
                                                >
                                                    <div className="truncate">{s.title}</div>
                                                    <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/20 rounded-b-md resize-handle transition-colors" onMouseDown={(e) => handleResizeStart(e, s)} />
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

            {/* 고정 일정 체크 모달창 */}
            {fixedCheckModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className={cn("w-full max-w-sm rounded-2xl p-6 border shadow-2xl animate-in zoom-in-95", isDarkMode ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900")}>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold">📌 {selectedFixedCheck.title}</h3>
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

            {/* 고정 일정 수정 전용 모달창 */}
            {fixedEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className={cn("w-full max-w-sm rounded-2xl p-6 border shadow-2xl animate-in zoom-in-95", isDarkMode ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900")}>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold text-purple-500">📌 고정 일정 수정</h3>
                            <button onClick={() => setFixedEditModalOpen(false)} className="p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-muted"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <form onSubmit={handleUpdateFixed} className="space-y-4">
                            {(() => {
                                const state = selectedFixedEvent;
                                const setState = setSelectedFixedEvent;
                                const inputClass = cn("w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500/50", isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900");
                                
                                return (
                                    <>
                                        <div><label className="text-xs font-medium text-muted-foreground mb-1 block">이름</label><input type="text" value={state.title} onChange={e => setState({ ...state, title: e.target.value })} className={inputClass} required autoFocus /></div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">시작일</label><input type="date" value={state.startDate} onChange={e => setState({ ...state, startDate: e.target.value })} className={inputClass} required /></div>
                                            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">종료일</label><input type="date" value={state.endDate} onChange={e => setState({ ...state, endDate: e.target.value })} className={inputClass} required /></div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">요일</label>
                                                <select value={state.dayOfWeek} onChange={e => setState({ ...state, dayOfWeek: Number(e.target.value) })} className={inputClass} required>
                                                    {dayLabels.map((l, i) => <option key={i} value={i} className={optionClass}>{l}</option>)}
                                                </select>
                                            </div>
                                            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">분류</label>
                                                <select value={state.category} onChange={e => setState({ ...state, category: e.target.value })} className={inputClass} required>
                                                    {['회의', '공부', '약속', '운동', '기타'].map(v => <option key={v} value={v} className={optionClass}>{v}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">시작</label><select value={state.startTime} onChange={e => setState({ ...state, startTime: e.target.value })} className={inputClass} required>{timeSelectOptions}</select></div>
                                            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">종료</label><select value={state.endTime} onChange={e => setState({ ...state, endTime: e.target.value })} className={inputClass} required>{endTimeOptions}</select></div>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <button type="button" onClick={() => { handleDeleteFixed(state.id); setFixedEditModalOpen(false); }} className="px-4 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 font-medium transition-colors"><Trash2 className="w-4 h-4" /></button>
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

            {/* 일반 일정 Modals (Edit & Add) */}
            {(modalOpen || addModalOpen) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className={cn("w-full max-w-sm rounded-2xl p-6 border shadow-2xl animate-in zoom-in-95", isDarkMode ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-gray-900")}>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold">{modalOpen ? '일정 수정' : '일정 추가'}</h3>
                            <button onClick={() => modalOpen ? setModalOpen(false) : setAddModalOpen(false)} className="p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-muted"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <form onSubmit={modalOpen ? handleUpdateSchedule : handleAddSchedule} className="space-y-4">
                            {(() => {
                                const state = modalOpen ? selectedEvent : newEvent;
                                const setState = modalOpen ? setSelectedEvent : setNewEvent;
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
                                        
                                        {modalOpen && (
                                            <label className="flex items-center gap-2 mt-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600" checked={state.isCompleted || false} onChange={e => setState({ ...state, isCompleted: e.target.checked })} />
                                                <span className="text-sm">일정 완료 처리</span>
                                            </label>
                                        )}

                                        <div className="flex gap-2 pt-2">
                                            {modalOpen && <button type="button" onClick={handleDeleteSchedule} className="px-4 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 font-medium transition-colors"><Trash2 className="w-4 h-4" /></button>}
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

export default Timeline;