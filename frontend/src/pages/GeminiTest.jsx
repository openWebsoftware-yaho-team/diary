import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../api';

const CATEGORY_COLORS = {
    '회의': 'bg-pastel-blue',
    '공부': 'bg-pastel-green',
    '약속': 'bg-pastel-orange',
    '운동': 'bg-pastel-purple',
    '기타': 'bg-pastel-yellow',
};

const EXAMPLE_PROMPTS = [
    '이번 주 공부·운동·휴식 균형 맞춘 시간표 짜줘',
    '11시에 자면 내일 일정 어떻게 짜면 좋을까?',
    '운동은 오전·공부는 오후로 두 가지 안 비교해줘',
];

function formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${dateStr} (${days[d.getDay()]})`;
}

function ProposalCard({ option, index, onApply, applying, applyIndex }) {
    const items = option?.items || [];
    if (!items.length) return null;

    const byDate = items.reduce((acc, item) => {
        const key = item.date || '날짜 미정';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    const isApplying = applying && applyIndex === index;

    return (
        <div className="gemini-proposal-card">
            <div className="gemini-proposal-title">
                {option.label || `안 ${index + 1}`}
            </div>
            {Object.entries(byDate).map(([date, dayItems]) => (
                <div key={date} className="gemini-proposal-day">
                    <div className="gemini-proposal-date">{formatDateLabel(date)}</div>
                    {dayItems
                        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                        .map((item, i) => (
                            <div
                                key={`${date}-${i}`}
                                className={`gemini-proposal-item ${CATEGORY_COLORS[item.category] || 'bg-pastel-green'}`}
                            >
                                <span className="gemini-proposal-time">
                                    {item.startTime?.substring(0, 5)} ~ {item.endTime?.substring(0, 5)}
                                </span>
                                <span className="gemini-proposal-label">{item.title}</span>
                                <span className="gemini-proposal-cat">{item.category || '기타'}</span>
                            </div>
                        ))}
                </div>
            ))}
            <button
                type="button"
                className="btn-ai gemini-apply-btn"
                onClick={() => onApply(index)}
                disabled={applying}
            >
                {isApplying ? '추가 중...' : `✅ ${option.label || `안 ${index + 1}`} 타임라인에 반영`}
            </button>
        </div>
    );
}

function GeminiTest() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: '일정 고민을 말씀해 주세요. 대화하면서 오른쪽 시간표가 계속 업데이트돼요. 마음에 들면 해당 안의 반영 버튼을 누르세요.',
        },
    ]);
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [applyIndex, setApplyIndex] = useState(null);
    const [error, setError] = useState('');
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, proposals, loading]);

    const sendMessage = async (text) => {
        const trimmed = (text ?? input).trim();
        if (!trimmed || loading) return;

        setError('');
        setInput('');

        const userMsg = { role: 'user', content: trimmed };
        const historyForApi = messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role, content: m.content }));

        setMessages((prev) => [...prev, userMsg]);
        setLoading(true);

        try {
            const data = await request('/gemini/chat', {
                method: 'POST',
                body: {
                    message: trimmed,
                    history: historyForApi,
                    currentProposals: proposals,
                },
            });

            const reply = data.reply || '제안을 업데이트했어요.';
            const nextProposals =
                data.proposals?.length > 0
                    ? data.proposals
                    : data.items?.length
                      ? [{ label: '제안 시간표', items: data.items }]
                      : proposals;

            setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);

            if (data.proposals?.length || data.items?.length) {
                setProposals(nextProposals);
            }
        } catch (err) {
            setError(err.message || 'AI 응답에 실패했습니다.');
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: '응답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.',
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (index) => {
        const option = proposals[index];
        if (!option?.items?.length || applying) return;

        setApplying(true);
        setApplyIndex(index);
        setError('');

        try {
            const result = await request('/gemini/apply', {
                method: 'POST',
                body: { items: option.items },
            });

            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: `✅ 「${option.label || `안 ${index + 1}`}」 ${result.message || '타임라인에 반영했어요.'} /timeline에서 확인해 보세요.`,
                },
            ]);
        } catch (err) {
            setError(err.message || '일정 반영에 실패했습니다.');
        } finally {
            setApplying(false);
            setApplyIndex(null);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="gemini-chat-page">
            <div className="section-title">AI 일정 상담</div>
            <p className="gemini-chat-desc">
                대화할수록 <strong>오른쪽 시간표가 갱신</strong>됩니다. 두 가지 안이 나오면 각각 반영 버튼이 있어요.
            </p>

            <div className="gemini-chat-layout">
                <div className="gemini-chat-panel">
                    <div className="gemini-messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`gemini-bubble gemini-bubble-${msg.role}`}>
                                <div className="gemini-bubble-role">{msg.role === 'user' ? '나' : 'AI'}</div>
                                <div className="gemini-bubble-text">{msg.content}</div>
                            </div>
                        ))}
                        {loading && (
                            <div className="gemini-bubble gemini-bubble-assistant">
                                <div className="gemini-bubble-role">AI</div>
                                <div className="gemini-bubble-text gemini-typing">시간표를 업데이트하고 있어요...</div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="gemini-examples">
                        {EXAMPLE_PROMPTS.map((ex) => (
                            <button
                                key={ex}
                                type="button"
                                className="gemini-example-chip"
                                onClick={() => sendMessage(ex)}
                                disabled={loading}
                            >
                                {ex}
                            </button>
                        ))}
                    </div>

                    <div className="gemini-input-row">
                        <textarea
                            className="gemini-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="예: 운동 시간을 저녁으로 옮겨줘 / 공부 블록을 2시간씩 늘려줘"
                            rows={2}
                            disabled={loading}
                        />
                        <button
                            type="button"
                            className="btn-ai"
                            onClick={() => sendMessage()}
                            disabled={loading || !input.trim()}
                        >
                            보내기
                        </button>
                    </div>

                    {error && <p className="gemini-error">{error}</p>}
                </div>

                <aside className="gemini-draft-panel">
                    <h3 className="gemini-draft-heading">📋 제안 시간표</h3>
                    <p className="gemini-draft-sub">
                        대화로 수정하면 여기만 바뀝니다. 채팅 안에는 중복 표시하지 않아요.
                    </p>

                    {proposals.length === 0 ? (
                        <div className="gemini-draft-empty">
                            아직 제안이 없어요.<br />
                            왼쪽에서 질문해 보세요.
                        </div>
                    ) : (
                        <div className="gemini-proposal-stack">
                            {proposals.map((option, idx) => (
                                <ProposalCard
                                    key={`${option.label}-${idx}`}
                                    option={option}
                                    index={idx}
                                    onApply={handleApply}
                                    applying={applying}
                                    applyIndex={applyIndex}
                                />
                            ))}
                        </div>
                    )}

                    <p className="gemini-side-note">
                        반영 후 <Link to="/timeline">타임라인</Link>에서 확인하세요.
                    </p>
                </aside>
            </div>
        </div>
    );
}

export default GeminiTest;
