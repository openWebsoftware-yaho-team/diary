import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Login({ setIsAuthenticated }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        try {
            const res = await fetch('http://localhost:8080/api/login', { method: 'POST', body: formData, credentials: 'include' });
            if (res.ok) { setIsAuthenticated(true); navigate('/'); } 
            else { alert('로그인 정보가 일치하지 않습니다.'); }
        } catch { alert('통신 장애가 발생했습니다.'); }
    };

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#FAF8F5', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0 }}>
            <div className="white-card" style={{ width: '90%', maxWidth: '400px', padding: '40px 30px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#333', marginBottom: '24px' }}>YAHO <span style={{ fontWeight: 'normal', fontSize: '16px', color: '#888' }}>로그인</span></h2>
                <form onSubmit={handleSubmit}>
                    <input type="text" placeholder="아이디" value={username} onChange={e => setUsername(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #eee', marginBottom: '12px', outline: 'none' }} />
                    <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #eee', marginBottom: '20px', outline: 'none' }} />
                    <button type="submit" className="btn-auth" style={{ width: '100%', padding: '14px', borderRadius: '10px', background: 'var(--point-gold)', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>로그인</button>
                </form>
                <div style={{ marginTop: '20px', fontSize: '14px', color: '#888' }}>
                    계정이 없으신가요? <Link to="/signup" style={{ color: 'var(--point-gold)', textDecoration: 'none', fontWeight: 'bold', marginLeft: '6px' }}>회원가입</Link>
                </div>
            </div>
        </div>
    );
}

export default Login;