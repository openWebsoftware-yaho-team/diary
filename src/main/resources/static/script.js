// 햄버거 버튼 클릭 시 메뉴 열기/닫기
function toggleMenu() {
    const navMenu = document.getElementById('nav-menu');
    navMenu.classList.toggle('show');
}

// 뷰(화면) 전환 및 모바일 메뉴 자동 닫기
function switchView(viewId) {
    const views = document.querySelectorAll('.view-section');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(viewId + '-view').classList.add('active');
    const navMenu = document.getElementById('nav-menu');
    if (navMenu.classList.contains('show')) {
        navMenu.classList.remove('show');
    }
}

// 고정 일정 추가 폼 토글
function toggleFixedForm() {
    const form = document.getElementById('fixed-add-form');
    form.classList.toggle('open');
}

// 모달 닫기 및 삭제
function closeModal() {
    document.getElementById('schedule-modal').classList.remove('show');
}

function deleteSchedule() {
    const id = document.getElementById('modal-id').value;
    if(confirm('정말 이 일정을 삭제하시겠습니까?')) {
        location.href = `/schedule/delete?id=${id}`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const dataContainer = document.getElementById('schedule-data');
    if (!dataContainer) return;

    // 기본 시간 범위
    const DEFAULT_START = 9;
    const DEFAULT_END = 18;
    const PIXELS_PER_HOUR = 60;

    // 모든 일정(일반 + 고정) 시간 수집해서 범위 계산
    let minHour = DEFAULT_START;
    let maxHour = DEFAULT_END;

    const allTimes = [];

    dataContainer.querySelectorAll('.raw-data').forEach(el => {
        const t = el.getAttribute('data-time');
        if (t) allTimes.push(parseInt(t.split(':')[0], 10));
    });

    const fixedContainer2 = document.getElementById('fixed-data');
    if (fixedContainer2) {
        fixedContainer2.querySelectorAll('.fixed-raw').forEach(el => {
            const s = el.getAttribute('data-start');
            const e = el.getAttribute('data-end');
            if (s) allTimes.push(parseInt(s.split(':')[0], 10));
            if (e) allTimes.push(parseInt(e.split(':')[0], 10));
        });
    }

    allTimes.forEach(h => {
        if (h < minHour) minHour = h;
        if (h > maxHour) maxHour = h;
    });

    // 기본값 기준, 넘을 때만 확장
    const START_HOUR = Math.min(DEFAULT_START, minHour);
    const END_HOUR = Math.max(DEFAULT_END, maxHour + 1);
    const TOTAL_HOURS = Math.max(1, END_HOUR - START_HOUR);

    // day-grid 높이 동적 설정
    document.querySelectorAll('.day-grid').forEach(grid => {
        grid.style.height = `${TOTAL_HOURS * PIXELS_PER_HOUR}px`;
    });

    // 타임슬롯 동적 생성
    const timeCol = document.querySelector('.time-col');
    if (timeCol) {
        timeCol.querySelectorAll('.time-slot').forEach(s => s.remove());
        for (let h = START_HOUR; h < END_HOUR; h++) {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.textContent = `${String(h).padStart(2,'0')}:00`;
            timeCol.appendChild(slot);
        }
    }

    const colors = ['bg-pastel-green', 'bg-pastel-yellow', 'bg-pastel-blue', 'bg-pastel-orange', 'bg-pastel-purple'];

    // 오늘 요일 모바일용 클래스
    const todayIndex = new Date().getDay();
    const todayColumn = document.getElementById(`day-${todayIndex}`);
    if (todayColumn) todayColumn.classList.add('is-today');

    // ── 일반 일정 렌더링 ──
    const rawDataElements = dataContainer.querySelectorAll('.raw-data');
    rawDataElements.forEach((el, index) => {
        const id = el.getAttribute('data-id');
        const title = el.getAttribute('data-title');
        const dateStr = el.getAttribute('data-date');
        const timeStr = el.getAttribute('data-time');
        const endStr = el.getAttribute('data-end');
        if (!dateStr || !timeStr) return;

        const dateObj = new Date(dateStr);
        const dayOfWeek = dateObj.getDay();

        const [hourStr, minStr] = timeStr.split(':');
        const hour = parseInt(hourStr, 10);
        const min = parseInt(minStr, 10) || 0;
        const timeInHours = hour + min / 60;

        let topPosition = (timeInHours - START_HOUR) * PIXELS_PER_HOUR;
        if (topPosition < 0) return;

        // endTime 있으면 실제 duration, 없으면 1시간
        let heightPosition = PIXELS_PER_HOUR;
        if (endStr && endStr !== 'null') {
            const [eh, em] = endStr.split(':').map(Number);
            const endInHours = eh + em / 60;
            const duration = endInHours - timeInHours;
            if (duration > 0) heightPosition = duration * PIXELS_PER_HOUR;
        }

        const eventDiv = document.createElement('div');
        eventDiv.className = `timetable-event ${colors[index % colors.length]}`;
        eventDiv.style.top = `${topPosition + 1}px`;
        eventDiv.style.height = `${heightPosition - 2}px`;
        eventDiv.innerHTML = title;
        eventDiv.style.cursor = 'pointer';

        eventDiv.addEventListener('click', () => {
            document.getElementById('modal-id').value = id;
            document.getElementById('modal-title-input').value = title;
            document.getElementById('modal-date-input').value = dateStr;
            const startHHmm = timeStr.substring(0, 5);
            document.getElementById('modal-start-input').value = startHHmm;
            const endRaw = el.getAttribute('data-end');
            if (endRaw && endRaw !== 'null') {
                document.getElementById('modal-end-input').value = endRaw.substring(0, 5);
            } else {
                document.getElementById('modal-end-input').value = '';
            }
            document.getElementById('modal-time').innerText = `${dateStr} ${startHHmm}`;
            document.getElementById('schedule-modal').classList.add('show');
        });

        const dayColumn = document.getElementById(`day-${dayOfWeek}`);
        if (dayColumn) dayColumn.querySelector('.day-grid').appendChild(eventDiv);
    });

    // ── 고정 일정 렌더링 ──
    const fixedContainer = document.getElementById('fixed-data');
    if (fixedContainer) {
        const fixedElements = fixedContainer.querySelectorAll('.fixed-raw');
        fixedElements.forEach((el, index) => {
            const title = el.getAttribute('data-title');
            const dayOfWeek = parseInt(el.getAttribute('data-day'), 10);
            const startTime = el.getAttribute('data-start');
            const endTime = el.getAttribute('data-end');

            if (!startTime || !endTime) return;

            const [sh, sm] = startTime.split(':').map(Number);
            const [eh, em] = endTime.split(':').map(Number);

            const startHours = sh + sm / 60;
            const endHours = eh + em / 60;
            const duration = endHours - startHours;

            let topPosition = (startHours - START_HOUR) * PIXELS_PER_HOUR;
            let heightPosition = duration * PIXELS_PER_HOUR;

            if (topPosition < 0) return;

            const eventDiv = document.createElement('div');
            eventDiv.className = `timetable-event bg-pastel-yellow`;
            eventDiv.style.top = `${topPosition + 1}px`;
            eventDiv.style.height = `${heightPosition - 2}px`;
            eventDiv.style.opacity = '0.7';
            eventDiv.style.borderLeft = '3px solid #C5A065';
            eventDiv.innerHTML = `📌 ${title}`;
            eventDiv.style.fontSize = '11px';

            const dayIdMap = [1, 2, 3, 4, 5, 6, 0];
            const targetDayId = dayIdMap[dayOfWeek];

            const dayColumn = document.getElementById(`day-${targetDayId}`);
            if (dayColumn) dayColumn.querySelector('.day-grid').appendChild(eventDiv);
        });
    }
});