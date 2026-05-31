import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Sparkles, Bot, User, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { request } from '../api';

const categoryGradients = {
    '회의': "from-blue-500 to-cyan-400 border-blue-400 text-blue-700 dark:text-blue-300",
    '공부': "from-indigo-500 to-purple-400 border-indigo-400 text-indigo-700 dark:text-indigo-300",
    '약속': "from-orange-500 to-yellow-400 border-orange-400 text-orange-700 dark:text-orange-300",
    '운동': "from-green-500 to-emerald-400 border-green-400 text-green-700 dark:text-green-300",
    '기타': "from-gray-500 to-slate-400 border-gray-400 text-gray-700 dark:text-gray-300",
};

const categoryBgLight = {
    '회의': "bg-blue-50 border-blue-200",
    '공부': "bg-indigo-50 border-indigo-200",
    '약속': "bg-orange-50 border-orange-200",
    '운동': "bg-green-50 border-green-200",
    '기타': "bg-gray-50 border-gray-200",
};

const categoryBgDark = {
    '회의': "bg-blue-500/10 border-blue-500/30",
    '공부': "bg-indigo-500/10 border-indigo-500/30",
    '약속': "bg-orange-500/10 border-orange-500/30",
    '운동': "bg-green-500/10 border-green-500/30",
    '기타': "bg-gray-500/10 border-gray-500/30",
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

function ProposalCard({ option, index, onApply, applying, applyIndex, isDarkMode }) {
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
        <div className={cn("p-4 rounded-xl border flex-shrink-0 transition-colors", isDarkMode ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200")}>
            <div className="font-bold text-sm mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className={isDarkMode ? "text-white" : "text-gray-900"}>{option.label || `안 ${index + 1}`}</span>
            </div>
            
            {Object.entries(byDate).map(([date, dayItems]) => (
                <div key={date} className="mb-4 last:mb-0">
                    <div className="text-xs font-bold text-purple-500 mb-2">{formatDateLabel(date)}</div>
                    <div className="space-y-2">
                        {dayItems.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).map((item, i) => {
                            const bgClasses = isDarkMode ? categoryBgDark[item.category || '기타'] : categoryBgLight[item.category || '기타'];
                            const textClasses = categoryGradients[item.category || '기타'].split(' ').slice(2).join(' '); // 텍스트 색상만 추출
                            
                            return (
                                <div key={`${date}-${i}`} className={cn("p-2.5 rounded-lg border flex flex-col gap-1", bgClasses)}>
                                    <div className="flex justify-between items-start">
                                        <span className={cn("text-xs font-bold", textClasses)}>{item.title}</span>
                                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md border", textClasses, isDarkMode ? "border-white/10" : "border-black/5")}>{item.category || '기타'}</span>
                                    </div>
                                    <div className={cn("text-[11px] flex items-center gap-1 opacity-80", textClasses)}>
                                        <Clock className="w-3 h-3" />
                                        {item.startTime?.substring(0, 5)} ~ {item.endTime?.substring(0, 5)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            
            <button type="button" onClick={() => onApply(index)} disabled={applying}
                className={cn("w-full mt-4 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all shadow-sm",
                    applying ? "bg-gray-300 text-gray-500 cursor-not-allowed border-none" : 
                    "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-md hover:shadow-purple-500/25 border-none"
                )}>
                {isApplying ? (
                    <><span className="animate-pulse">추가 중...</span></>
                ) : (
                    <><CheckCircle2 className="w-4 h-4" /> 타임라인에 반영</>
                )}
            </button>
        </div>
    );
}

function GeminiTest({ theme }) {
    const isDarkMode = theme === 'dark';
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', content: '일정 고민을 말씀해 주세요. 대화하면서 오른쪽 시간표가 계속 업데이트돼요. 마음에 들면 해당 안의 반영 버튼을 누르세요.' },
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

        setError(''); setInput('');

        const userMsg = { role: 'user', content: trimmed };
        const historyForApi = messages.filter((m) => m.role === 'user' || m.role === 'assistant').map((m) => ({ role: m.role, content: m.content }));

        setMessages((prev) => [...prev, userMsg]);
        setLoading(true);

        try {
            const data = await request('/gemini/chat', { method: 'POST', body: { message: trimmed, history: historyForApi, currentProposals: proposals } });
            const reply = data.reply || '제안을 업데이트했어요.';
            const nextProposals = data.proposals?.length > 0 ? data.proposals : data.items?.length ? [{ label: '제안 시간표', items: data.items }] : proposals;

            setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
            if (data.proposals?.length || data.items?.length) setProposals(nextProposals);
        } catch (err) {
            setError(err.message || 'AI 응답에 실패했습니다.');
            setMessages((prev) => [...prev, { role: 'assistant', content: '응답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (index) => {
        const option = proposals[index];
        if (!option?.items?.length || applying) return;

        setApplying(true); setApplyIndex(index); setError('');

        try {
            const result = await request('/gemini/apply', { method: 'POST', body: { items: option.items } });
            setMessages((prev) => [...prev, { role: 'assistant', content: `✅ 「${option.label || `안 ${index + 1}`}」 ${result.message || '타임라인에 반영했어요.'} 타임라인 메뉴에서 확인해 보세요.` }]);
        } catch (err) {
            setError(err.message || '일정 반영에 실패했습니다.');
        } finally {
            setApplying(false); setApplyIndex(null);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className={cn("text-2xl font-bold flex items-center gap-2", isDarkMode ? "text-white" : "text-gray-900")}>
                    <Sparkles className="w-6 h-6 text-purple-500" />
                    AI 일정 상담
                </h1>
                <p className={cn("text-sm mt-1", isDarkMode ? "text-white/60" : "text-gray-500")}>대화할수록 오른쪽 시간표가 갱신됩니다. 원하는 일정을 자유롭게 말씀해 보세요.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                {/* Chat Panel */}
                <div className={cn("flex-1 flex flex-col rounded-2xl border backdrop-blur-sm overflow-hidden", isDarkMode ? "bg-white/5 border-white/10" : "bg-white/80 border-gray-200/50 shadow-lg")}>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={cn("flex flex-col max-w-[85%]", msg.role === 'user' ? "self-end items-end" : "self-start items-start")}>
                                <div className="flex items-center gap-2 mb-1 opacity-70">
                                    {msg.role === 'user' ? <><span className="text-xs font-bold">나</span><User className="w-3.5 h-3.5" /></> : <><Bot className="w-3.5 h-3.5" /><span className="text-xs font-bold text-purple-500">AI 어시스턴트</span></>}
                                </div>
                                <div className={cn("px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap", 
                                    msg.role === 'user' ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-tr-sm" : 
                                    (isDarkMode ? "bg-white/10 text-white rounded-tl-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm")
                                )}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex flex-col self-start max-w-[85%]">
                                <div className="flex items-center gap-2 mb-1 opacity-70"><Bot className="w-3.5 h-3.5" /><span className="text-xs font-bold text-purple-500">AI 어시스턴트</span></div>
                                <div className={cn("px-4 py-3 rounded-2xl rounded-tl-sm text-[15px] flex items-center gap-2", isDarkMode ? "bg-white/10 text-white/70" : "bg-gray-100 text-gray-500")}>
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className={cn("p-4 border-t space-y-3", isDarkMode ? "border-white/10 bg-black/20" : "border-gray-200 bg-white")}>
                        <div className="flex flex-wrap gap-2">
                            {EXAMPLE_PROMPTS.map((ex) => (
                                <button key={ex} type="button" onClick={() => sendMessage(ex)} disabled={loading}
                                    className={cn("text-xs px-3 py-1.5 rounded-full border transition-all text-left", 
                                        isDarkMode ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white" : 
                                        "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-purple-200 hover:text-purple-600"
                                    )}>
                                    {ex}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3 items-end">
                            <textarea className={cn("flex-1 resize-none px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-[15px]", 
                                isDarkMode ? "bg-black/50 border-gray-800 text-white placeholder:text-gray-600" : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400")}
                                value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="예: 운동 시간을 저녁으로 옮겨줘 / 휴식시간도 추가해줘" rows={2} disabled={loading} />
                            <button type="button" onClick={() => sendMessage()} disabled={loading || !input.trim()}
                                className={cn("p-3 h-[52px] w-[52px] flex items-center justify-center rounded-xl transition-all", 
                                    !input.trim() || loading ? (isDarkMode ? "bg-white/10 text-white/30 cursor-not-allowed" : "bg-gray-100 text-gray-400 cursor-not-allowed") : 
                                    "bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25"
                                )}>
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                        {error && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</p>}
                    </div>
                </div>

                {/* Proposals Panel */}
                <div className={cn("w-full lg:w-[400px] flex-shrink-0 flex flex-col rounded-2xl border backdrop-blur-sm", isDarkMode ? "bg-white/5 border-white/10" : "bg-white/80 border-gray-200/50 shadow-lg")}>
                    <div className={cn("p-5 border-b font-bold flex items-center justify-between", isDarkMode ? "border-white/10 text-white" : "border-gray-200 text-gray-900")}>
                        📋 제안 시간표
                    </div>
                    <div className="flex-1 p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                        {proposals.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                                <Bot className="w-12 h-12 mb-3 opacity-20" />
                                <p className="text-sm">아직 제안이 없어요.<br />왼쪽에서 질문해 보세요.</p>
                            </div>
                        ) : (
                            proposals.map((option, idx) => (
                                <ProposalCard key={`${option.label}-${idx}`} option={option} index={idx} onApply={handleApply} applying={applying} applyIndex={applyIndex} isDarkMode={isDarkMode} />
                            ))
                        )}
                    </div>
                    <div className={cn("p-4 border-t text-xs text-center", isDarkMode ? "border-white/10 text-white/50" : "border-gray-200 text-gray-500")}>
                        반영 후 <Link to="/timeline" className="text-purple-500 hover:underline font-bold">타임라인</Link>에서 수정할 수 있습니다.
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GeminiTest;