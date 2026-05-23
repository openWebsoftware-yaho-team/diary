import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { request } from '../api';

function Signup() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState(''); // ✨ 이메일 상태 추가
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
            // 백엔드로 이메일 데이터도 함께 전송합니다.
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
        <div className="auth-card">
            <h2>회원가입</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <input type="text" placeholder="아이디" value={username} onChange={e => setUsername(e.target.value)} required />
                </div>
                {/* ✨ 이메일 주소 입력 칸 복원 */}
                <div className="form-group">
                    <input type="email" placeholder="이메일 주소" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                    <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <div className="form-group">
                    <input type="password" placeholder="비밀번호 확인" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                </div>
                <button type="submit" className="btn-auth">가입하기</button>
            </form>
            <div className="auth-footer">
                이미 계정이 있으신가요? <Link to="/login">로그인</Link>
            </div>
        </div>
    );
}

export default Signup;