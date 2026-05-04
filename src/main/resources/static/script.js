// 햄버거 버튼 클릭 시 메뉴 열기/닫기
function toggleMenu() {
    const navMenu = document.getElementById('nav-menu');
    navMenu.classList.toggle('show');
}

// 뷰(화면) 전환 및 모바일 메뉴 자동 닫기
function switchView(viewId) {
    // 1. 모든 화면 섹션을 숨김 처리
    const views = document.querySelectorAll('.view-section');
    views.forEach(v => v.classList.remove('active'));
    
    // 2. 클릭한 아이디에 해당하는 화면만 활성화
    document.getElementById(viewId + '-view').classList.add('active');
    
    // 3. 모바일에서 메뉴를 눌러서 화면을 이동했다면, 열려있는 메뉴를 닫아줌
    const navMenu = document.getElementById('nav-menu');
    if (navMenu.classList.contains('show')) {
        navMenu.classList.remove('show');
    }
}

// 모바일 햄버거 버튼 클릭 시 메뉴 열기/닫기
function toggleMenu() {
    const navMenu = document.getElementById('nav-menu');
    navMenu.classList.toggle('show');
}