import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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

function ProposalCard({ option, index, onApply, applying, applyIndex }) {
    if (!option?.items?.length) return null;
    const byDate = option.items.reduce((acc, item) => {
        const key = item.date || '날짜 미정';
        if (!acc[key]) acc[key] = []; acc[key].push(item); return acc;
    }, {});

    return (
        <div className="white-card" style={{ padding: '16px', marginBottom: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-body)' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--point-gold)', marginBottom: '12px' }}>📋 {option.label || `제안 안 ${index + 1}`}</div>
            {Object.entries(byDate).map(([date, dayItems]) => (
                <div key={date} style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-light)', marginBottom: '6px', borderBottom: '1px dashed var(--border-color)' }}>{formatDateLabel(date)}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {dayItems.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).map((item, i) => (
                            <div key={i} className={`timetable-event ${CATEGORY_COLORS[item.category] || 'bg-pastel-green'}`} style={{ position: 'relative', padding: '8px 10px', borderRadius: '8px', display: 'block', boxShadow: 'none' }}>
                                <div style={{ fontSize: '11px', opacity: 0.8 }}>{item.startTime?.substring(0, 5)} ~ {item.endTime?.substring(0, 5)}</div>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color:'#333' }}>{item.title}</div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            <button type="button" className="btn-submit" style={{ width: '100%', marginTop: '10px', padding: '12px' }} onClick={() => onApply(index)} disabled={applying}>
                {applying && applyIndex === index ? '⏳ 반영 중...' : '✅ 이 스케줄 확정 및 반영'}
            </button>
        </div>
    );
}

function GeminiTest() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([{ role: 'assistant', content: '안녕하세요! YAHO AI 비서입니다. 스케줄 조율 고민을 편하게 말씀해 주세요.' }]);
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [applyIndex, setApplyIndex] = useState(null);
    const chatEndRef = useRef(null);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

    const sendMessage = async (text) => {
        const trimmed = (text ?? input).trim(); if (!trimmed || loading) return;
        setInput(''); setMessages(prev => [...prev, { role: 'user', content: trimmed }]); setLoading(true);
        try {
            const data = await request('/gemini/chat', { method: 'POST', body: { message: trimmed, history: messages.filter(m => m.role==='user'||m.role==='assistant').map(m => ({role:m.role, content:m.content})), currentProposals: proposals } });
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply || '제안 스케줄을 처리 완료했습니다.' }]);
            if (data.proposals?.length) setProposals(data.proposals);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: '통신 실패했습니다.' }]);
        } finally { setLoading(false); }
    };

    return (
        <div className="gemini-page-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'left' }}><h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-brown)' }}>🤖 AI 비서 스마트 스케줄링</h2></div>

            <div className="dashboard-content-flex" style={{ display: 'flex', gap: '24px', alignItems: 'stretch' }}>
                <div className="white-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '600px', padding: 0, overflow: 'hidden' }}>
                    <div className="gemini-messages" style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                                <div className={`gemini-bubble-${msg.role}`} style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', whiteSpace:'pre-wrap' }}>{msg.content}</div>
                            </div>
                        ))}
                        {loading && <div style={{ alignSelf: 'flex-start' }}><div className="gemini-bubble-assistant" style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px' }}>⏳ 최적의 일정을 연산 중입니다...</div></div>}
                        <div ref={chatEndRef} />
                    </div>

                    <div style={{ padding: '12px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', overflowX: 'auto' }}>
                        {EXAMPLE_PROMPTS.map(ex => <button key={ex} type="button" onClick={() => sendMessage(ex)} disabled={loading} style={{ padding: '8px 14px', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-body)', color: 'var(--text-brown)', fontSize: '12px', cursor: 'pointer', whiteSpace:'nowrap' }}>{ex}</button>)}
                    </div>

                    <div style={{ padding: '16px', display: 'flex', gap: '12px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)' }}>
                        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && sendMessage()} placeholder="일정 조정을 지시하세요..." disabled={loading} style={{ flex: 1, padding: '14px 16px', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '14px', background: 'var(--bg-body)', color:'var(--text-brown)', outline: 'none' }} />
                        <button type="button" className="btn-add-regular" style={{ padding: '13px 24px', borderRadius: '12px', margin: 0 }} onClick={() => sendMessage()} disabled={loading || !input.trim()}>보내기</button>
                    </div>
                </div>

                <div style={{ width: '320px', display: 'flex', flexDirection: 'column', flexShrink: 0 }} className="timeline-side-widgets">
                    <div className="white-card" style={{ padding: '20px', flex: 1, maxHeight: '600px', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '12px', color:'var(--text-brown)' }}>📋 제안 시간표 대시보드</h3>
                        {proposals.length === 0 ? <div style={{ color: '#BBB', fontSize: '13px', paddingTop: '100px', textAlign: 'center' }}>제안이 아직 없습니다. 채본에게 질문해 보세요! 🌿</div> : proposals.map((option, idx) => <ProposalCard key={idx} option={option} index={idx} onApply={handleApply} applying={applying} applyIndex={applyIndex} />)}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GeminiTest;