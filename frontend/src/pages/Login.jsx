import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, User, Lock, ArrowRight } from 'lucide-react';

function Login({ setIsAuthenticated }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Spring Security form-login 규격에 맞게 FormData 객체 빌드
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const res = await fetch('http://localhost:8080/api/login', {
                method: 'POST',
                body: formData, 
                credentials: 'include'
            });

            if (res.ok) {   
                setIsAuthenticated(true);
                navigate('/');
            } else {
                alert('로그인에 실패했습니다. 아이디 또는 비밀번호를 확인하세요.');
            }
        } catch (err) {
            alert('서버 통신 오류가 발생했습니다.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#f8f9fc] dark:bg-[#0a0a0f]">
            {/* Animated Background */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/30 dark:bg-purple-600/20 blur-3xl animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-400/30 dark:bg-cyan-600/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="w-full max-w-md p-8 rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-black/40 border border-white/20 dark:border-white/10 shadow-2xl animate-in zoom-in-95 duration-500">
                {/* Logo Section */}
                <div className="flex flex-col items-center gap-3 mb-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">YAHO</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">당신의 스마트한 일정 관리 어시스턴트</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">아이디</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="w-5 h-5 text-gray-400" />
                            </div>
                            <input type="text" placeholder="아이디를 입력하세요" value={username} onChange={e => setUsername(e.target.value)} required 
                                className="w-full pl-11 pr-4 py-3.5 rounded-xl border-0 bg-white/50 dark:bg-black/50 ring-1 ring-gray-200 dark:ring-white/10 focus:ring-2 focus:ring-purple-500/50 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 outline-none" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">비밀번호</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="w-5 h-5 text-gray-400" />
                            </div>
                            <input type="password" placeholder="비밀번호를 입력하세요" value={password} onChange={e => setPassword(e.target.value)} required 
                                className="w-full pl-11 pr-4 py-3.5 rounded-xl border-0 bg-white/50 dark:bg-black/50 ring-1 ring-gray-200 dark:ring-white/10 focus:ring-2 focus:ring-purple-500/50 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 outline-none" />
                        </div>
                    </div>

                    <button type="submit" className="w-full mt-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all">
                        로그인 <ArrowRight className="w-5 h-5" />
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    아직 계정이 없으신가요?{' '}
                    <Link to="/signup" className="font-bold text-purple-600 dark:text-purple-400 hover:underline">
                        회원가입하기
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Login;