import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, User, Mail, Lock, UserPlus } from 'lucide-react';
import { request } from '../api';

function Signup() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirm) {
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }

        try {
            const data = await request('/signup', {
                method: 'POST',
                body: { username, email, password }
            });
            alert(data.message);
            navigate('/login');
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#f8f9fc] dark:bg-[#0a0a0f] py-12">
            {/* Animated Background */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute top-1/4 right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-400/20 dark:bg-pink-600/10 blur-3xl animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-400/30 dark:bg-cyan-600/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="w-full max-w-md p-8 rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-black/40 border border-white/20 dark:border-white/10 shadow-2xl animate-in zoom-in-95 duration-500">
                
                {/* Header Section */}
                <div className="flex flex-col items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">회원가입</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">YAHO의 새로운 멤버가 되어보세요</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">아이디</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="w-5 h-5 text-gray-400" />
                            </div>
                            <input type="text" placeholder="사용할 아이디" value={username} onChange={e => setUsername(e.target.value)} required 
                                className="w-full pl-11 pr-4 py-3 rounded-xl border-0 bg-white/50 dark:bg-black/50 ring-1 ring-gray-200 dark:ring-white/10 focus:ring-2 focus:ring-cyan-500/50 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 outline-none" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">이메일 주소</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="w-5 h-5 text-gray-400" />
                            </div>
                            <input type="email" placeholder="example@email.com" value={email} onChange={e => setEmail(e.target.value)} required 
                                className="w-full pl-11 pr-4 py-3 rounded-xl border-0 bg-white/50 dark:bg-black/50 ring-1 ring-gray-200 dark:ring-white/10 focus:ring-2 focus:ring-cyan-500/50 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 outline-none" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">비밀번호</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="w-5 h-5 text-gray-400" />
                            </div>
                            <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} required 
                                className="w-full pl-11 pr-4 py-3 rounded-xl border-0 bg-white/50 dark:bg-black/50 ring-1 ring-gray-200 dark:ring-white/10 focus:ring-2 focus:ring-cyan-500/50 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 outline-none" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">비밀번호 확인</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="w-5 h-5 text-gray-400" />
                            </div>
                            <input type="password" placeholder="비밀번호 다시 입력" value={confirm} onChange={e => setConfirm(e.target.value)} required 
                                className="w-full pl-11 pr-4 py-3 rounded-xl border-0 bg-white/50 dark:bg-black/50 ring-1 ring-gray-200 dark:ring-white/10 focus:ring-2 focus:ring-cyan-500/50 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 outline-none" />
                        </div>
                    </div>

                    <button type="submit" className="w-full mt-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-lg flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all">
                        <UserPlus className="w-5 h-5" /> 가입하기
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    이미 계정이 있으신가요?{' '}
                    <Link to="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        로그인하기
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Signup;