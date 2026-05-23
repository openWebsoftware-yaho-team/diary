const BASE_URL = 'http://localhost:8080/api';

export const request = async (url, options = {}) => {
    options.credentials = 'include'; // 세션 쿠키 전달용
    options.headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
    }

    const res = await fetch(`${BASE_URL}${url}`, options);
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || '요청 처리에 실패했습니다.');
    }
    return res.json().catch(() => ({}));
};