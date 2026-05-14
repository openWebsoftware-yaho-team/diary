// 햄버거 메뉴
function toggleMenu() {
    document.getElementById('nav-menu').classList.toggle('show');
}

function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId + '-view').classList.add('active');

    const menu = document.getElementById('nav-menu');
    if (menu.classList.contains('show')) menu.classList.remove('show');
}

function toggleFixedForm() {
    document.getElementById('fixed-add-form').classList.toggle('open');
}

function closeModal() {
    document.getElementById('schedule-modal').classList.remove('show');
}

function deleteSchedule() {
    const id = document.getElementById('modal-id').value;
    if (confirm('정말 삭제할까요?')) {
        location.href = `/schedule/delete?id=${id}`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const scheduleBox = document.getElementById('schedule-data');
    if (!scheduleBox) return;

    const PX_PER_HOUR = 60;
    const BASE_START = 9;
    const BASE_END = 18;

    // 일정 시간들 다 모아서 표시 범위 결정
    let earliest = BASE_START;
    let latest = BASE_END;
    const hourList = [];

    scheduleBox.querySelectorAll('.raw-data').forEach(el => {
        const t = el.getAttribute('data-time');
        if (t) hourList.push(parseInt(t.split(':')[0], 10));
    });

    const fixedBox = document.getElementById('fixed-data');
    if (fixedBox) {
        fixedBox.querySelectorAll('.fixed-raw').forEach(el => {
            const s = el.getAttribute('data-start');
            const e = el.getAttribute('data-end');
            if (s) hourList.push(parseInt(s.split(':')[0], 10));
            if (e) hourList.push(parseInt(e.split(':')[0], 10));
        });
    }

    hourList.forEach(h => {
        if (h < earliest) earliest = h;
        if (h > latest) latest = h;
    });

    const startH = Math.min(BASE_START, earliest);
    const endH = Math.max(BASE_END, latest + 1);
    const totalH = Math.max(1, endH - startH);

    document.querySelectorAll('.day-grid').forEach(g => {
        g.style.height = `${totalH * PX_PER_HOUR}px`;
    });

    // 좌측 시간 레이블
    const timeCol = document.querySelector('.time-col');
    if (timeCol) {
        timeCol.querySelectorAll('.time-slot').forEach(s => s.remove());
        for (let h = startH; h < endH; h++) {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.textContent = `${String(h).padStart(2, '0')}:00`;
            timeCol.appendChild(slot);
        }
    }

    const colorPool = ['bg-pastel-green', 'bg-pastel-yellow', 'bg-pastel-blue', 'bg-pastel-orange', 'bg-pastel-purple'];

    // 오늘 컬럼 표시 (모바일용)
    const todayCol = document.getElementById(`day-${new Date().getDay()}`);
    if (todayCol) todayCol.classList.add('is-today');

    // 일반 일정 렌더링
    scheduleBox.querySelectorAll('.raw-data').forEach((el, i) => {
        const id    = el.getAttribute('data-id');
        const title = el.getAttribute('data-title');
        const date  = el.getAttribute('data-date');
        const start = el.getAttribute('data-time');
        const end   = el.getAttribute('data-end');

        if (!date || !start) return;

        const dow = new Date(date).getDay();
        const [hh, mm] = start.split(':');
        const startFloat = parseInt(hh) + (parseInt(mm) || 0) / 60;
        const topPx = (startFloat - startH) * PX_PER_HOUR;
        if (topPx < 0) return;

        let heightPx = PX_PER_HOUR;
        if (end && end !== 'null') {
            const [eh, em] = end.split(':').map(Number);
            const dur = (eh + em / 60) - startFloat;
            if (dur > 0) heightPx = dur * PX_PER_HOUR;
        }

        const block = document.createElement('div');
        block.className = `timetable-event ${colorPool[i % colorPool.length]}`;
        block.style.top    = `${topPx + 1}px`;
        block.style.height = `${heightPx - 2}px`;
        block.style.cursor = 'pointer';
        block.innerHTML    = title;

        block.addEventListener('click', () => {
            document.getElementById('modal-id').value          = id;
            document.getElementById('modal-title-input').value = title;
            document.getElementById('modal-date-input').value  = date;
            document.getElementById('modal-start-input').value = start.substring(0, 5);
            document.getElementById('modal-end-input').value   = (end && end !== 'null') ? end.substring(0, 5) : '';
            document.getElementById('modal-time').innerText    = `${date} ${start.substring(0, 5)}`;
            document.getElementById('schedule-modal').classList.add('show');
        });

        const col = document.getElementById(`day-${dow}`);
        if (col) col.querySelector('.day-grid').appendChild(block);
    });

    // 고정 일정 렌더링
    if (fixedBox) {
        const dowMap = [1, 2, 3, 4, 5, 6, 0]; // 월~일 순서 맞추기용

        fixedBox.querySelectorAll('.fixed-raw').forEach((el) => {
            const title = el.getAttribute('data-title');
            const day   = parseInt(el.getAttribute('data-day'), 10);
            const start = el.getAttribute('data-start');
            const end   = el.getAttribute('data-end');

            if (!start || !end) return;

            const [sh, sm] = start.split(':').map(Number);
            const [eh, em] = end.split(':').map(Number);
            const dur = (eh + em / 60) - (sh + sm / 60);
            const topPx = (sh + sm / 60 - startH) * PX_PER_HOUR;

            if (topPx < 0) return;

            const block = document.createElement('div');
            block.className    = 'timetable-event bg-pastel-yellow';
            block.style.top    = `${topPx + 1}px`;
            block.style.height = `${dur * PX_PER_HOUR - 2}px`;
            block.style.opacity    = '0.7';
            block.style.borderLeft = '3px solid #C5A065';
            block.style.fontSize   = '11px';
            block.innerHTML = `📌 ${title}`;

            const col = document.getElementById(`day-${dowMap[day]}`);
            if (col) col.querySelector('.day-grid').appendChild(block);
        });
    }
});