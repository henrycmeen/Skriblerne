import { API_BASE_URL } from './config.js';

const today = new Date();
const EDIT_CODE_STORAGE_KEY = 'skriblerne-edit-code';
const state = {
    view: 'today',
    selectedYear: today.getFullYear(),
    selectedMonthDay: toMonthDay(today),
    calendar: null,
    currentMemory: null,
    dayMemories: [],
    editCode: localStorage.getItem(EDIT_CODE_STORAGE_KEY) || ''
};

const elements = {
    todayButton: document.getElementById('todayButton'),
    todayView: document.getElementById('todayView'),
    overviewView: document.getElementById('overviewView'),
    selectedDateLabel: document.getElementById('selectedDateLabel'),
    todayHeading: document.getElementById('todayHeading'),
    currentImage: document.getElementById('currentImage'),
    emptyMemory: document.getElementById('emptyMemory'),
    photoFrame: document.getElementById('photoFrame'),
    addPhotoButton: document.getElementById('addPhotoButton'),
    replacePhotoButton: document.getElementById('replacePhotoButton'),
    photoInput: document.getElementById('photoInput'),
    statusText: document.getElementById('statusText'),
    yearStrip: document.getElementById('yearStrip'),
    comparison: document.querySelector('.comparison'),
    comparisonList: document.getElementById('comparisonList'),
    yearGrid: document.getElementById('yearGrid'),
    overviewSummary: document.getElementById('overviewSummary'),
    overviewHeading: document.getElementById('overviewHeading'),
    previousYearButton: document.getElementById('previousYearButton'),
    nextYearButton: document.getElementById('nextYearButton'),
    overviewPreviousYearButton: document.getElementById('overviewPreviousYearButton'),
    overviewNextYearButton: document.getElementById('overviewNextYearButton'),
    editCodeDialog: document.getElementById('editCodeDialog'),
    editCodeForm: document.getElementById('editCodeForm'),
    editCodeInput: document.getElementById('editCodeInput'),
    editCodeMessage: document.getElementById('editCodeMessage'),
    cancelEditCodeButton: document.getElementById('cancelEditCodeButton'),
    navButtons: Array.from(document.querySelectorAll('[data-view]'))
};

let editCodeResolver = null;

const dateFormatter = new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit'
});

function toMonthDay(date) {
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateFromMonthDay(year, monthDay) {
    const [month, day] = monthDay.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function isToday(year, monthDay) {
    return year === today.getFullYear() && monthDay === toMonthDay(today);
}

function setStatus(message, tone = 'neutral') {
    elements.statusText.textContent = message;
    elements.statusText.dataset.tone = tone;
}

function selectedDay() {
    return state.calendar?.days.find((day) => day.monthDay === state.selectedMonthDay) || null;
}

async function fetchJson(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        cache: 'no-store',
        ...options
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(payload.error || 'Noe gikk galt.');
        error.status = response.status;
        throw error;
    }

    return payload;
}

function requestEditCode(message = '') {
    return new Promise((resolve) => {
        editCodeResolver = resolve;
        elements.editCodeMessage.textContent = message;
        elements.editCodeInput.value = state.editCode;
        elements.editCodeDialog.hidden = false;
        elements.editCodeInput.focus();
    });
}

function resolveEditCode(code) {
    elements.editCodeDialog.hidden = true;
    editCodeResolver?.(code);
    editCodeResolver = null;
}

async function loadCalendar(year = state.selectedYear) {
    const calendar = await fetchJson(`/api/calendar/${year}`);
    state.calendar = calendar;
    state.selectedYear = calendar.year;
    return calendar;
}

async function loadSelectedMemory() {
    const payload = await fetchJson(`/api/memory/${state.selectedYear}/${state.selectedMonthDay}`);
    state.currentMemory = payload.memory;
}

async function loadDayMemories() {
    const payload = await fetchJson(`/api/memories/day/${state.selectedMonthDay}`);
    state.dayMemories = payload.memories || [];
}

async function refreshAll() {
    setStatus('Laster inn.');
    await loadCalendar();
    await Promise.all([loadSelectedMemory(), loadDayMemories()]);
    render();
    setStatus('');
}

function render() {
    renderView();
    renderDate();
    renderPhoto();
    renderYearStrip();
    renderComparison();
    renderOverview();
}

function renderView() {
    const showToday = state.view === 'today';
    elements.todayView.hidden = !showToday;
    elements.overviewView.hidden = showToday;
    elements.todayView.classList.toggle('view--active', showToday);
    elements.overviewView.classList.toggle('view--active', !showToday);

    elements.navButtons.forEach((button) => {
        const active = button.dataset.view === state.view;
        button.classList.toggle('nav-button--active', active);
        button.setAttribute('aria-pressed', String(active));
    });
}

function renderDate() {
    const day = selectedDay();
    const date = dateFromMonthDay(state.selectedYear, state.selectedMonthDay);
    const label = dateFormatter.format(date);

    elements.selectedDateLabel.textContent = isToday(state.selectedYear, state.selectedMonthDay)
        ? 'Dagens ord'
        : `${label} ${state.selectedYear}`;
    elements.todayHeading.textContent = day?.word || 'Ingen ord';
    elements.overviewHeading.textContent = String(state.selectedYear);
}

function renderPhoto() {
    if (state.currentMemory?.imageData) {
        elements.currentImage.src = state.currentMemory.imageData;
        elements.currentImage.alt = `${state.currentMemory.word}, ${state.currentMemory.year}`;
        elements.currentImage.hidden = false;
        elements.emptyMemory.hidden = true;
        elements.replacePhotoButton.hidden = false;
        elements.photoFrame.classList.add('photo-frame--filled');
        return;
    }

    elements.currentImage.removeAttribute('src');
    elements.currentImage.alt = '';
    elements.currentImage.hidden = true;
    elements.emptyMemory.hidden = false;
    elements.replacePhotoButton.hidden = true;
    elements.photoFrame.classList.remove('photo-frame--filled');
}

function renderYearStrip() {
    elements.yearStrip.replaceChildren();

    const memoriesToShow = state.dayMemories.filter((memory) => (
        memory.year !== state.selectedYear || state.dayMemories.length > 1
    ));

    if (memoriesToShow.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'muted';
        empty.textContent = 'Ingen tidligere bilder på denne datoen.';
        elements.yearStrip.appendChild(empty);
        return;
    }

    memoriesToShow.forEach((memory) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'year-memory';
        button.classList.toggle('year-memory--active', memory.year === state.selectedYear);
        button.setAttribute('aria-label', `Åpne ${memory.word} fra ${memory.year}`);
        button.innerHTML = `
            <img src="${memory.thumbnailData}" alt="">
            <span>${memory.year}</span>
        `;
        button.addEventListener('click', async () => {
            state.selectedYear = memory.year;
            await refreshAll();
        });
        elements.yearStrip.appendChild(button);
    });
}

function renderComparison() {
    elements.comparisonList.replaceChildren();

    const otherMemories = state.dayMemories.filter((memory) => memory.year !== state.selectedYear);
    if (otherMemories.length === 0) {
        elements.comparison.hidden = true;
        return;
    }

    elements.comparison.hidden = false;
    otherMemories.slice(0, 6).forEach((memory) => {
        const figure = document.createElement('figure');
        figure.className = 'comparison-item';
        figure.innerHTML = `
            <img src="${memory.thumbnailData}" alt="${memory.word}, ${memory.year}">
            <figcaption>${memory.year}</figcaption>
        `;
        elements.comparisonList.appendChild(figure);
    });
}

function renderOverview() {
    if (!state.calendar) {
        return;
    }

    elements.yearGrid.replaceChildren();
    let filledDays = 0;
    state.calendar.days.forEach((day) => {
        if (day.memory) {
            filledDays += 1;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'day-dot';
        button.classList.toggle('day-dot--filled', Boolean(day.memory));
        button.classList.toggle('day-dot--today', isToday(state.selectedYear, day.monthDay));
        button.classList.toggle('day-dot--selected', day.monthDay === state.selectedMonthDay);
        button.setAttribute('role', 'listitem');
        button.setAttribute(
            'aria-label',
            `${day.day}.${day.month}. ${day.word}${day.memory ? ', har bilde' : ', mangler bilde'}`
        );

        if (day.memory?.thumbnailData) {
            button.style.setProperty('--dot-image', `url("${day.memory.thumbnailData}")`);
        }

        button.addEventListener('click', async () => {
            state.selectedMonthDay = day.monthDay;
            state.view = 'today';
            await refreshAll();
        });

        elements.yearGrid.appendChild(button);
    });

    elements.overviewSummary.textContent = `${filledDays} bilder i ${state.selectedYear}`;
}

async function changeYear(offset) {
    state.selectedYear += offset;
    await refreshAll();
}

async function goToToday() {
    state.selectedYear = today.getFullYear();
    state.selectedMonthDay = toMonthDay(today);
    state.view = 'today';
    await refreshAll();
}

function switchView(view) {
    state.view = view;
    renderView();
}

async function handlePhotoSelected(event) {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }

    try {
        if (!state.editCode) {
            const code = await requestEditCode();
            if (!code) {
                setStatus('');
                return;
            }
        }

        setStatus('Forbereder bilde.');
        const payload = await buildImagePayload(file);
        setStatus('Lagrer bilde.');

        const response = await fetchJson('/api/memories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Skriblerne-Edit-Code': state.editCode
            },
            body: JSON.stringify({
                year: state.selectedYear,
                monthDay: state.selectedMonthDay,
                originalName: file.name,
                ...payload
            })
        });

        state.currentMemory = response.memory;
        await refreshAll();
        setStatus('Bildet er lagret.', 'success');
    } catch (error) {
        console.error(error);
        if (error.status === 401) {
            state.editCode = '';
            localStorage.removeItem(EDIT_CODE_STORAGE_KEY);
        }
        setStatus(error.message, 'error');
    } finally {
        event.target.value = '';
    }
}

async function buildImagePayload(file) {
    const bitmap = await createImageBitmap(file);
    const imageData = renderCanvas(bitmap, 1600, 0.86);
    const thumbnailData = renderCanvas(bitmap, 420, 0.76);

    return {
        imageData,
        thumbnailData,
        mimeType: 'image/jpeg'
    };
}

function renderCanvas(bitmap, maxSize, quality) {
    const ratio = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;
    context.drawImage(bitmap, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', quality);
}

function bindEvents() {
    elements.todayButton.addEventListener('click', goToToday);
    elements.previousYearButton.addEventListener('click', () => changeYear(-1));
    elements.nextYearButton.addEventListener('click', () => changeYear(1));
    elements.overviewPreviousYearButton.addEventListener('click', () => changeYear(-1));
    elements.overviewNextYearButton.addEventListener('click', () => changeYear(1));
    elements.addPhotoButton.addEventListener('click', () => elements.photoInput.click());
    elements.replacePhotoButton.addEventListener('click', () => elements.photoInput.click());
    elements.photoFrame.addEventListener('click', (event) => {
        if (event.target === elements.photoFrame && state.currentMemory) {
            elements.photoInput.click();
        }
    });
    elements.photoInput.addEventListener('change', handlePhotoSelected);
    elements.editCodeForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const code = elements.editCodeInput.value.trim();
        if (!code) {
            elements.editCodeMessage.textContent = 'Skriv inn kode.';
            return;
        }
        state.editCode = code;
        localStorage.setItem(EDIT_CODE_STORAGE_KEY, code);
        resolveEditCode(code);
    });
    elements.cancelEditCodeButton.addEventListener('click', () => resolveEditCode(null));
    elements.navButtons.forEach((button) => {
        button.addEventListener('click', () => switchView(button.dataset.view));
    });
}

bindEvents();
refreshAll().catch((error) => {
    console.error(error);
    setStatus(error.message, 'error');
});
