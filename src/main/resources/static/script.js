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

// 문서가 로드되면 타임테이블 렌더링 실행
document.addEventListener("DOMContentLoaded", () => {
    // 타임라인 페이지가 맞는지 확인 (schedule-data가 있는지)
    const dataContainer = document.getElementById('schedule-data');
    if (!dataContainer) return; 

    const rawDataElements = dataContainer.querySelectorAll('.raw-data');
    const colors = ['bg-pastel-green', 'bg-pastel-yellow', 'bg-pastel-blue', 'bg-pastel-orange', 'bg-pastel-purple'];

    // 타임테이블 기준 시간: 오전 8시
    const START_HOUR = 8;
    // 1시간당 픽셀 높이 (CSS의 background-size와 동일하게 맞춤)
    const PIXELS_PER_HOUR = 60;

    rawDataElements.forEach((el, index) => {
        const title = el.getAttribute('data-title');
        const dateStr = el.getAttribute('data-date'); // ex: '2026-05-11'
        const timeStr = el.getAttribute('data-time'); // ex: '15:00'
        
        if(!dateStr || !timeStr) return;

        // 1. 요일 계산 (0: 일요일, 1: 월요일 ~ 6: 토요일)
        const dateObj = new Date(dateStr);
        const dayOfWeek = dateObj.getDay(); 

        // 2. 시간 계산 (문자열 '15:00'을 숫자 15.0으로 변환)
        const [hourStr, minStr] = timeStr.split(':');
        const hour = parseInt(hourStr, 10);
        const min = parseInt(minStr, 10) || 0;
        const timeInHours = hour + (min / 60);

        // 3. 위치(top) 계산 (8시 기준이므로 8을 뺌)
        // 15:00 이라면 -> (15 - 8) * 60px = 420px 위치에서 시작
        let topPosition = (timeInHours - START_HOUR) * PIXELS_PER_HOUR;

        // 만약 일정이 8시 이전이라면 표를 벗어나므로 숨김 처리
        if(topPosition < 0) return;

    // 4. 높이(height) 계산: 딱 1시간(1칸) 크기로 맞춤
        let heightPosition = 1.0 * PIXELS_PER_HOUR; 

        // 5. 블록 HTML 생성 및 삽입
        const eventDiv = document.createElement('div');
        eventDiv.className = `timetable-event ${colors[index % colors.length]}`;
        
        // 칸의 가로 선(그리드)이 가려지지 않도록 위에서 1px 내리고, 전체 높이에서 2px을 빼서 쏙 들어가게 만듭니다.
        eventDiv.style.top = `${topPosition + 1}px`;
        eventDiv.style.height = `${heightPosition - 2}px`;

        // 해당 요일 컬럼 찾아서 삽입
        const dayColumn = document.getElementById(`day-${dayOfWeek}`);
        if(dayColumn) {
            dayColumn.querySelector('.day-grid').appendChild(eventDiv);
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const dataContainer = document.getElementById('schedule-data');
    if (!dataContainer) return; 

    // [추가] 1. 오늘 무슨 요일인지 찾아서 모바일용 '.is-today' 클래스 붙여주기
    const todayIndex = new Date().getDay(); // 0:일, 1:월 ... 6:토
    const todayColumn = document.getElementById(`day-${todayIndex}`);
    if (todayColumn) {
        todayColumn.classList.add('is-today');
    }

    const rawDataElements = dataContainer.querySelectorAll('.raw-data');
    const colors = ['bg-pastel-green', 'bg-pastel-yellow', 'bg-pastel-blue', 'bg-pastel-orange', 'bg-pastel-purple'];
    const START_HOUR = 8;
    const PIXELS_PER_HOUR = 60;

    rawDataElements.forEach((el, index) => {
        const id = el.getAttribute('data-id'); // [추가] 일정 ID
        const title = el.getAttribute('data-title');
        const dateStr = el.getAttribute('data-date');
        const timeStr = el.getAttribute('data-time');
        
        if(!dateStr || !timeStr) return;

        const dateObj = new Date(dateStr);
        const dayOfWeek = dateObj.getDay(); 

        const [hourStr, minStr] = timeStr.split(':');
        const hour = parseInt(hourStr, 10);
        const min = parseInt(minStr, 10) || 0;
        const timeInHours = hour + (min / 60);

        let topPosition = (timeInHours - START_HOUR) * PIXELS_PER_HOUR;
        if(topPosition < 0) return;

        let heightPosition = 1.0 * PIXELS_PER_HOUR; 

        const eventDiv = document.createElement('div');
        eventDiv.className = `timetable-event ${colors[index % colors.length]}`;
        eventDiv.style.top = `${topPosition + 1}px`;
        eventDiv.style.height = `${heightPosition - 2}px`;
        eventDiv.innerHTML = title;
        eventDiv.style.cursor = 'pointer'; // 클릭할 수 있다는 마우스 표시

        // [추가] 2. 블록을 클릭했을 때 모달창 띄우기
        eventDiv.addEventListener('click', () => {
            document.getElementById('modal-id').value = id;
            document.getElementById('modal-title-input').value = title;
            document.getElementById('modal-title').innerText = title;
            document.getElementById('modal-time').innerText = `${dateStr} ${timeStr}`;
            document.getElementById('schedule-modal').classList.add('show');
        });

        const dayColumn = document.getElementById(`day-${dayOfWeek}`);
        if(dayColumn) {
            dayColumn.querySelector('.day-grid').appendChild(eventDiv);
        }
    });
});

// [추가] 3. 모달 닫기 및 삭제 요청 함수
function closeModal() {
    document.getElementById('schedule-modal').classList.remove('show');
}

function deleteSchedule() {
    const id = document.getElementById('modal-id').value;
    if(confirm('정말 이 일정을 삭제하시겠습니까?')) {
        // 백엔드 삭제 주소로 이동 (백엔드 팀원과 URL 상의 필요)
        location.href = `/schedule/delete?id=${id}`;
    }
}

