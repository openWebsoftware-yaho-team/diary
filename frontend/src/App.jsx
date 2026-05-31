import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, LayoutDashboard, Clock, Calendar as CalendarIcon, User, ChevronRight, LogOut, Settings, Sun, Moon } from 'lucide-react';
import { cn } from './lib/utils';
import { request } from './api';

import Dashboard from './pages/Dashboard';
import Timeline from './pages/Timeline';
import Calendar from './pages/Calendar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MyPage from './pages/MyPage';
import GeminiTest from './pages/GeminiTest';

const NAV_ITEMS = [
    { path: "/", icon: LayoutDashboard, label: "대시보드" },
    { path: "/timeline", icon: Clock, label: "타임라인" },
    { path: "/calendar", icon: CalendarIcon, label: "캘린더" },
    { path: "/gemini", icon: Sparkles, label: "AI 상담" },
    { path: "/mypage", icon: User, label: "마이페이지" },
];

function MainLayout({ children, theme, toggleTheme, handleLogout }) {
    const location = useLocation();
    const isDarkMode = theme === 'dark';
    
    return (
        <div className={cn("min-h-screen text-foreground relative overflow-hidden transition-colors duration-300", isDarkMode ? 'dark bg-background' : 'bg-background')}>
            {/* Animated gradient background */}
            <div className="fixed inset-0 -z-10">
                <div className={cn("absolute top-0 -left-40 w-96 h-96 rounded-full blur-3xl animate-pulse transition-colors duration-300", isDarkMode ? "bg-purple-500/30" : "bg-purple-300/40")} />
                <div className={cn("absolute top-1/3 -right-40 w-96 h-96 rounded-full blur-3xl animate-pulse transition-colors duration-300", isDarkMode ? "bg-cyan-500/20" : "bg-cyan-300/30")} style={{ animationDelay: "1s" }} />
                <div className={cn("absolute bottom-0 left-1/3 w-96 h-96 rounded-full blur-3xl animate-pulse transition-colors duration-300", isDarkMode ? "bg-pink-500/20" : "bg-pink-300/30")} style={{ animationDelay: "0.5s" }} />
                <div className={cn("absolute inset-0 transition-colors duration-300", isDarkMode ? "bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a0a0f_70%)]" : "bg-[radial-gradient(ellipse_at_center,transparent_0%,#f8f9fc_70%)]")} />
            </div>

            {/* 모바일 전용 상단 헤더 */}
            <div className={cn("md:hidden sticky top-0 z-40 flex items-center justify-between p-4 backdrop-blur-xl border-b transition-colors", isDarkMode ? "border-white/10 bg-black/50" : "border-black/5 bg-white/80")}>
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    <span className="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">YAHO</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={toggleTheme} className={cn("p-2 rounded-xl", isDarkMode ? "text-yellow-400" : "text-purple-500")}>
                        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <button onClick={handleLogout} className="p-2 text-red-500 rounded-xl">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row min-h-screen">
                {/* 데스크탑 전용 좌측 사이드바 (모바일에서는 숨김) */}
                <aside className={cn("hidden md:flex w-72 h-screen sticky top-0 p-6 border-r backdrop-blur-xl flex-col transition-colors duration-300 z-40", isDarkMode ? "border-white/10 bg-black/30" : "border-black/5 bg-white/60")}>
                    <div className="flex items-center gap-3 mb-10 cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">YAHO</span>
                    </div>

                    <nav className="space-y-2 flex-1">
                        {NAV_ITEMS.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link key={item.path} to={item.path} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300", isActive ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30" : isDarkMode ? "text-white/60 hover:text-white hover:bg-white/5" : "text-black/60 hover:text-black hover:bg-black/5", isActive && (isDarkMode ? "text-white" : "text-purple-700"))}>
                                    <item.icon className={cn("w-5 h-5", isActive && "text-purple-500")} />
                                    <span className="font-medium">{item.label}</span>
                                    {isActive && <ChevronRight className="w-4 h-4 ml-auto text-purple-500" />}
                                </Link>
                            );
                        })}
                    </nav>

                    <button onClick={handleLogout} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 mt-auto", isDarkMode ? "text-red-400 hover:bg-red-500/10" : "text-red-500 hover:bg-red-50")}>
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">로그아웃</span>
                    </button>
                </aside>

                {/* 메인 콘텐츠 영역 (모바일에서는 하단 여백 추가) */}
                <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 w-full max-w-full overflow-x-hidden">
                    <header className="hidden md:flex items-center justify-end gap-3 mb-8">
                        <button onClick={toggleTheme} className={cn("p-2 rounded-xl transition-colors", isDarkMode ? "hover:bg-white/10 text-yellow-400" : "hover:bg-black/5 text-purple-500")}>
                            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </header>
                    {children}
                </main>

                {/* 모바일 전용 하단 네비게이션 바 */}
                <nav className={cn("md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around p-2 pb-safe backdrop-blur-xl border-t transition-colors", isDarkMode ? "bg-black/80 border-white/10" : "bg-white/90 border-black/5")}>
                    {NAV_ITEMS.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link key={item.path} to={item.path} className={cn("flex flex-col items-center gap-1 p-2 rounded-lg min-w-[64px]", isActive ? (isDarkMode ? "text-purple-400" : "text-purple-600") : (isDarkMode ? "text-white/50" : "text-gray-400"))}>
                                <item.icon className={cn("w-6 h-6", isActive && "fill-purple-500/20")} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [theme, setTheme] = useState('light'); 

    useEffect(() => {
        if (isAuthenticated) {
            request('/user/me').then(data => setTheme(data.theme || 'light')).catch(() => setIsAuthenticated(false));
        } else {
            setTheme('light');
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [theme]);

    const handleLogout = async () => {
        try {
            await request('/logout', { method: 'POST' });
            setIsAuthenticated(false);
        } catch (err) { alert(err.message); }
    };

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    return (
        <Router>
            <Routes>
                <Route path="/login" element={!isAuthenticated ? <Login setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/" />} />
                <Route path="/signup" element={!isAuthenticated ? <Signup /> : <Navigate to="/" />} />
                
                <Route path="*" element={
                    isAuthenticated ? (
                        <MainLayout theme={theme} toggleTheme={toggleTheme} handleLogout={handleLogout}>
                            <Routes>
                                <Route path="/" element={<Dashboard theme={theme} />} />
                                <Route path="/timeline" element={<Timeline theme={theme} />} />
                                <Route path="/calendar" element={<Calendar theme={theme} />} />
                                <Route path="/gemini" element={<GeminiTest theme={theme} />} />
                                <Route path="/mypage" element={<MyPage setTheme={setTheme} theme={theme} />} />
                            </Routes>
                        </MainLayout>
                    ) : <Navigate to="/login" />
                } />
            </Routes>
        </Router>
    );
}

export default App;