import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { request } from '../api';

function Signup() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirm) { alert('비밀번호가 일치하지 않습니다.'); return; }
        try {
            const data = await request('/signup', { method: 'POST', body: { username, email, password } });
            alert(data.message);
            navigate('/login');
        } catch (err) { alert(err.message); }
    };

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#FAF8F5', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0 }}>
            <div className="white-card" style={{ width: '90%', maxWidth: '400px', padding: '40px 30px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#333', marginBottom: '24px' }}>YAHO <span style={{ fontWeight: 'normal', fontSize: '16px', color: '#888' }}>회원가입</span></h2>
                <form onSubmit={handleSubmit}>
                    <input type="text" placeholder="사용할 아이디" value={username} onChange={e => setUsername(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '10px' }} />
                    <input type="email" placeholder="이메일 주소" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '10px' }} />
                    <input type="password" placeholder="비밀번호 입력" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '10px' }} />
                    <input type="password" placeholder="비밀번호 확인" value={confirm} onChange={e => setConfirm(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '16px' }} />
                    <button type="submit" className="btn-auth" style={{ width: '100%', padding: '14px', borderRadius: '8px', background: 'var(--point-gold)', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>가입 완료하기</button>
                </form>
                <div style={{ marginTop: '20px', fontSize: '14px', color: '#888' }}>
                    이미 계정이 있으신가요? <Link to="/login" style={{ color: 'var(--point-gold)', textDecoration: 'none', fontWeight: 'bold', marginLeft: '6px' }}>로그인</Link>
                </div>
            </div>
        </div>
    );
}

export default Signup;