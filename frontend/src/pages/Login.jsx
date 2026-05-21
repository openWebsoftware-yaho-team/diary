import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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
                body: formData, // JSON 형식이 아닌 FormData 전송
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
        <div className="auth-card">
            <h2>로그인</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <input type="text" placeholder="아이디" value={username} onChange={e => setUsername(e.target.value)} required />
                </div>
                <div className="form-group">
                    <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <button type="submit" class="btn-auth">로그인</button>
            </form>
            <div className="auth-footer">
                계정이 없으신가요? <Link to="/signup">회원가입</Link>
            </div>
        </div>
    );
}

export default Login;