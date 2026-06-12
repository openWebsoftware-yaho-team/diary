import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from '../api';

const CATEGORY_COLORS = {
    '회의': 'bg-pastel-blue', '공부': 'bg-pastel-green', '약속': 'bg-pastel-orange', '운동': 'bg-pastel-purple', '기타': 'bg-pastel-yellow',
};

const EXAMPLE_PROMPTS = [
    ' 내일 오전은 비워두고 오후 위주로 채워줘',
    ' 이번 주 공부·운동·휴식 균형 맞춘 시간표 짜줘',
    ' 운동 스케줄을 저녁 시간대로 다 옮겨줄래?',
];

function formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return `${dateStr} (${['일', '월', '화', '수', '목', '금', '토'][d.getDay()]})`;
}

function parseTimeMinutes(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.substring(0, 5).split(':').map(Number);
    return h * 60 + m;
}

function timesOverlap(start1, end1, start2, end2) {
    return start1 < end2 && start2 < end1;
}

function getItemEndMinutes(item) {
    const start = parseTimeMinutes(item.startTime);
    const end = parseTimeMinutes(item.endTime);
    return end != null ? end : start + 60;
}

function getConflictsForItems(items, scheduleList, fixedList) {
    if (!items?.length) return new Set();

    const conflictKeys = new Set();

    items.forEach((item, idx) => {
        if (!item.date || !item.startTime) return;

        const start = parseTimeMinutes(item.startTime);
        const end = getItemEndMinutes(item);
        const date = item.date;
        const d = new Date(date + 'T12:00:00');
        const dbDay = d.getDay() === 0 ? 6 : d.getDay() - 1;
        const key = `${date}|${item.startTime?.substring(0, 5)}|${item.title}`;

        for (const s of scheduleList) {
            if (s.date !== date) continue;
            const sStart = parseTimeMinutes(s.startTime);
            const sEnd = s.endTime ? parseTimeMinutes(s.endTime) : sStart + 60;
            if (timesOverlap(start, end, sStart, sEnd)) {
                conflictKeys.add(key);
            }
        }

        for (const f of fixedList) {
            if (f.dayOfWeek !== dbDay) continue;
            if (f.startDate && f.startDate > date) continue;
            if (f.endDate && f.endDate < date) continue;
            const fStart = parseTimeMinutes(f.startTime);
            const fEnd = f.endTime ? parseTimeMinutes(f.endTime) : fStart + 60;
            if (timesOverlap(start, end, fStart, fEnd)) {
                conflictKeys.add(key);
            }
        }

        for (let j = 0; j < idx; j++) {
            const other = items[j];
            if (other.date !== date || !other.startTime) continue;
            const oStart = parseTimeMinutes(other.startTime);
            const oEnd = getItemEndMinutes(other);
            if (timesOverlap(start, end, oStart, oEnd)) {
                conflictKeys.add(key);
            }
        }
    });

    return conflictKeys;
}

function itemKey(item) {
    return `${item.date}|${item.startTime?.substring(0, 5)}|${item.title}`;
}

function RemovalList({ removals }) {
    if (!removals?.length) return null;

    return (
        <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#c0392b', marginBottom: '8px', borderBottom: '1px dashed #e8b4b4' }}>
                🗑️ 삭제할 일정
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {removals.map((item, i) => (
                    <div key={i} style={{ padding: '8px 10px', borderRadius: '8px', background: '#fdecea', border: '1px solid #f5c6cb', fontSize: '13px' }}>
                        <div style={{ fontSize: '11px', opacity: 0.8, color: '#c0392b' }}>
                            {formatDateLabel(item.date)} {item.startTime?.substring(0, 5)}
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#922b21' }}>{item.title}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function formatEditChange(edit) {
    const changes = [];
    if (edit.date) changes.push(formatDateLabel(edit.date));
    if (edit.startTime) changes.push(`${edit.startTime?.substring(0, 5)}${edit.endTime ? ` ~ ${edit.endTime.substring(0, 5)}` : ''}`);
    if (edit.title) changes.push(`제목 "${edit.title}"`);
    if (edit.category) changes.push(`${edit.category}`);
    return changes.join(', ');
}

function EditList({ edits }) {
    if (!edits?.length) return null;

    return (
        <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#2c80b4', marginBottom: '8px', borderBottom: '1px dashed #b4d6e8' }}>
                ✏️ 수정할 일정
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {edits.map((edit, i) => (
                    <div key={i} style={{ padding: '8px 10px', borderRadius: '8px', background: '#eaf4fb', border: '1px solid #b4d6e8', fontSize: '13px' }}>
                        <div style={{ fontSize: '11px', opacity: 0.85, color: '#2c80b4', textDecoration: 'line-through' }}>
                            {formatDateLabel(edit.targetDate)} {edit.targetStartTime?.substring(0, 5)} · {edit.targetTitle}
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#1b5e88' }}>→ {formatEditChange(edit) || '변경 없음'}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ProposalCard({ option, index, onApply, applying, applyIndex, scheduleList, fixedList }) {
    if (!option?.items?.length && !option?.removals?.length && !option?.edits?.length) return null;

    const conflictKeys = getConflictsForItems(option.items, scheduleList, fixedList);
    const hasAddConflicts = conflictKeys.size > 0 && option.items?.length > 0;
    const hasChanges = (option.items?.length > 0) || (option.removals?.length > 0) || (option.edits?.length > 0);
    const canApply = hasChanges && !hasAddConflicts;

    const byDate = (option.items || []).reduce((acc, item) => {
        const key = item.date || '날짜 미정';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    return (
        <div className="white-card" style={{ padding: '16px', marginBottom: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-body)' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--point-gold)', marginBottom: '12px' }}>
                📋 {option.label || `제안 안 ${index + 1}`}
            </div>

            <EditList edits={option.edits} />
            <RemovalList removals={option.removals} />

            {Object.entries(byDate).map(([date, dayItems]) => (
                <div key={date} style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-light)', marginBottom: '6px', borderBottom: '1px dashed var(--border-color)' }}>
                        {formatDateLabel(date)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {dayItems.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).map((item, i) => {
                            const isConflict = conflictKeys.has(itemKey(item));
                            return (
                                <div
                                    key={i}
                                    className={`timetable-event ${isConflict ? '' : (CATEGORY_COLORS[item.category] || 'bg-pastel-green')}`}
                                    style={{
                                        position: 'relative', padding: '8px 10px', borderRadius: '8px', display: 'block', boxShadow: 'none',
                                        ...(isConflict ? { background: '#fdecea', border: '1px solid #e74c3c' } : {}),
                                    }}
                                >
                                    <div style={{ fontSize: '11px', opacity: 0.8 }}>
                                        {item.startTime?.substring(0, 5)} ~ {item.endTime?.substring(0, 5)}
                                        {isConflict && <span style={{ color: '#e74c3c', marginLeft: '6px', fontWeight: 'bold' }}>⚠ 겹침</span>}
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: isConflict ? '#922b21' : '#333' }}>{item.title}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {hasAddConflicts && (
                <div style={{ fontSize: '12px', color: '#e74c3c', marginBottom: '8px', padding: '8px', background: '#fdecea', borderRadius: '8px' }}>
                    기존 일정과 겹치는 항목이 있어 추가할 수 없습니다. AI에게 시간을 조정해 달라고 요청해 보세요.
                </div>
            )}

            <button
                type="button"
                className="btn-submit"
                style={{ width: '100%', marginTop: '10px', padding: '12px', opacity: canApply ? 1 : 0.5 }}
                onClick={() => onApply(index)}
                disabled={applying || !canApply}
            >
                {applying && applyIndex === index ? '반영 중...' : '이 변경 사항 반영'}
            </button>
        </div>
    );
}

function StandaloneEditCard({ edits, onApply, applying }) {
    if (!edits?.length) return null;

    return (
        <div className="white-card" style={{ padding: '16px', marginBottom: '16px', border: '1px solid #b4d6e8', background: '#f8fcff' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2c80b4', marginBottom: '12px' }}>✏️ 수정 제안</div>
            <EditList edits={edits} />
            <button
                type="button"
                className="btn-submit"
                style={{ width: '100%', marginTop: '10px', padding: '12px', background: '#2c80b4' }}
                onClick={onApply}
                disabled={applying}
            >
                {applying ? '수정 중...' : '수정 반영'}
            </button>
        </div>
    );
}

function StandaloneRemovalCard({ removals, onApply, applying }) {
    if (!removals?.length) return null;

    return (
        <div className="white-card" style={{ padding: '16px', marginBottom: '16px', border: '1px solid #f5c6cb', background: '#fffafa' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#c0392b', marginBottom: '12px' }}>🗑️ 삭제 제안</div>
            <RemovalList removals={removals} />
            <button
                type="button"
                className="btn-submit"
                style={{ width: '100%', marginTop: '10px', padding: '12px', background: '#c0392b' }}
                onClick={onApply}
                disabled={applying}
            >
                {applying ? '삭제 중...' : '삭제 반영'}
            </button>
        </div>
    );
}

function GeminiTest() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([{ role: 'assistant', content: '안녕하세요! YAHO AI 비서입니다. 스케줄 조율 고민을 편하게 말씀해 주세요.' }]);
    const [proposals, setProposals] = useState([]);
    const [standaloneRemovals, setStandaloneRemovals] = useState([]);
    const [standaloneEdits, setStandaloneEdits] = useState([]);
    const [scheduleList, setScheduleList] = useState([]);
    const [fixedList, setFixedList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [applyIndex, setApplyIndex] = useState(null);
    const [applyingRemovals, setApplyingRemovals] = useState(false);
    const [applyingEdits, setApplyingEdits] = useState(false);
    const chatEndRef = useRef(null);

    const loadTimeline = useCallback(() => {
        request('/schedule/timeline').then(data => {
            setScheduleList(data.scheduleList || []);
            setFixedList(data.fixedList || []);
        }).catch(() => {});
    }, []);

    useEffect(() => { loadTimeline(); }, [loadTimeline]);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

    const sendMessage = async (text) => {
        const trimmed = (text ?? input).trim();
        if (!trimmed || loading) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
        setLoading(true);
        try {
            const data = await request('/gemini/chat', {
                method: 'POST',
                body: {
                    message: trimmed,
                    history: messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content })),
                    currentProposals: proposals,
                },
            });
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply || '제안 스케줄을 처리 완료했습니다.' }]);
            if (data.proposals?.length) setProposals(data.proposals);
            setStandaloneRemovals(data.removals?.length ? data.removals : []);
            setStandaloneEdits(data.edits?.length ? data.edits : []);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: '통신 실패했습니다.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (index) => {
        setApplying(true);
        setApplyIndex(index);

        try {
            const option = proposals[index];
            const data = await request('/gemini/apply', {
                method: 'POST',
                body: {
                    items: option.items || [],
                    removals: option.removals || [],
                    edits: option.edits || [],
                },
            });

            setMessages(prev => [...prev, { role: 'assistant', content: data.message || '스케줄이 반영되었습니다.' }]);
            if (data.success !== false) {
                loadTimeline();
                setProposals(prev => prev.map((p, i) => (
                    i === index ? { ...p, items: [], removals: [], edits: [] } : p
                )).filter(p => p.items?.length || p.removals?.length || p.edits?.length));
            }
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: '스케줄 반영에 실패했습니다.' }]);
        } finally {
            setApplying(false);
            setApplyIndex(null);
        }
    };

    const handleApplyStandaloneRemovals = async () => {
        setApplyingRemovals(true);
        try {
            const data = await request('/gemini/apply', {
                method: 'POST',
                body: { items: [], removals: standaloneRemovals },
            });
            setMessages(prev => [...prev, { role: 'assistant', content: data.message || '삭제가 반영되었습니다.' }]);
            if (data.success !== false) {
                setStandaloneRemovals([]);
                loadTimeline();
            }
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: '삭제 반영에 실패했습니다.' }]);
        } finally {
            setApplyingRemovals(false);
        }
    };

    const handleApplyStandaloneEdits = async () => {
        setApplyingEdits(true);
        try {
            const data = await request('/gemini/apply', {
                method: 'POST',
                body: { items: [], removals: [], edits: standaloneEdits },
            });
            setMessages(prev => [...prev, { role: 'assistant', content: data.message || '수정이 반영되었습니다.' }]);
            if (data.success !== false) {
                setStandaloneEdits([]);
                loadTimeline();
            }
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: '수정 반영에 실패했습니다.' }]);
        } finally {
            setApplyingEdits(false);
        }
    };

    const hasSidebarContent = proposals.length > 0 || standaloneRemovals.length > 0 || standaloneEdits.length > 0;

    return (
        <div className="gemini-page-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-brown)' }}>AI 비서 스마트 스케줄링</h2>
            </div>

            <div className="dashboard-content-flex" style={{ display: 'flex', gap: '24px', alignItems: 'stretch' }}>
                <div className="white-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '600px', padding: 0, overflow: 'hidden' }}>
                    <div className="gemini-messages" style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                                <div className={`gemini-bubble-${msg.role}`} style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ alignSelf: 'flex-start' }}>
                                <div className="gemini-bubble-assistant" style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px' }}>최적의 일정을 연산 중입니다...</div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div style={{ padding: '12px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', overflowX: 'auto' }}>
                        {EXAMPLE_PROMPTS.map(ex => (
                            <button key={ex} type="button" onClick={() => sendMessage(ex)} disabled={loading} style={{ padding: '8px 14px', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-body)', color: 'var(--text-brown)', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>{ex}</button>
                        ))}
                    </div>

                    <div style={{ padding: '16px', display: 'flex', gap: '12px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)' }}>
                        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="일정 조정을 지시하세요..." disabled={loading} style={{ flex: 1, padding: '14px 16px', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '14px', background: 'var(--bg-body)', color: 'var(--text-brown)', outline: 'none' }} />
                        <button type="button" className="btn-add-regular" style={{ padding: '13px 24px', borderRadius: '12px', margin: 0 }} onClick={() => sendMessage()} disabled={loading || !input.trim()}>보내기</button>
                    </div>
                </div>

                <div style={{ width: '320px', display: 'flex', flexDirection: 'column', flexShrink: 0 }} className="timeline-side-widgets">
                    <div className="white-card" style={{ padding: '20px', flex: 1, maxHeight: '600px', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-brown)' }}>📋 제안 시간표 대시보드</h3>
                        {!hasSidebarContent ? (
                            <div style={{ color: '#BBB', fontSize: '13px', paddingTop: '100px', textAlign: 'center' }}>제안이 아직 없습니다. 챗봇에게 질문해 보세요! 🌿</div>
                        ) : (
                            <>
                                <StandaloneEditCard edits={standaloneEdits} onApply={handleApplyStandaloneEdits} applying={applyingEdits} />
                                <StandaloneRemovalCard removals={standaloneRemovals} onApply={handleApplyStandaloneRemovals} applying={applyingRemovals} />
                                {proposals.map((option, idx) => (
                                    <ProposalCard
                                        key={idx}
                                        option={option}
                                        index={idx}
                                        onApply={handleApply}
                                        applying={applying}
                                        applyIndex={applyIndex}
                                        scheduleList={scheduleList}
                                        fixedList={fixedList}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GeminiTest;
