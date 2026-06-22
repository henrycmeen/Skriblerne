import { API_BASE_URL } from './config.js';
import {
    OWNER_LABELS,
    buildSameDayOwnerOptions,
    buildSameDateHistory,
    formatMemoryCaption,
    getMemoryKey,
    normalizeOwner
} from './history-utils.mjs?v=20260622-20';
import {
    findOwnMemory,
    formatSaveContext,
    IDENTITY_STORAGE_KEY,
    normalizeIdentity,
    readStoredIdentity
} from './identity-utils.mjs';
import {
    buildOverviewSummary,
    createOwnerCounts,
    getOverviewOwnerState
} from './overview-utils.mjs';

const today = new Date();
const EDIT_CODE_STORAGE_KEY = 'skriblerne-edit-code';
const OWNER_STORAGE_KEY = 'skriblerne-owner';
const storedIdentity = readStoredIdentity(localStorage);
const initialOwner = storedIdentity || normalizeOwner(localStorage.getItem(OWNER_STORAGE_KEY));
const state = {
    view: 'today',
    selectedYear: today.getFullYear(),
    selectedMonthDay: toMonthDay(today),
    owner: initialOwner,
    signedInOwner: initialOwner,
    hasIdentity: Boolean(storedIdentity),
    calendar: null,
    currentMemory: null,
    dayMemories: [],
    comparisonMemoryCache: new Map(),
    comparisonLoadingKey: null,
    selectedComparisonKey: null,
    editCode: localStorage.getItem(EDIT_CODE_STORAGE_KEY) || ''
};

const elements = {
    todayButton: document.getElementById('todayButton'),
    identityLabel: document.getElementById('identityLabel'),
    identityButtons: Array.from(document.querySelectorAll('[data-identity]')),
    todayView: document.getElementById('todayView'),
    overviewView: document.getElementById('overviewView'),
    selectedDateLabel: document.getElementById('selectedDateLabel'),
    todayHeading: document.getElementById('todayHeading'),
    datePickerButton: document.getElementById('datePickerButton'),
    datePickerInput: document.getElementById('datePickerInput'),
    currentImage: document.getElementById('currentImage'),
    photoMeta: document.getElementById('photoMeta'),
    emptyMemory: document.getElementById('emptyMemory'),
    emptyMemoryText: document.getElementById('emptyMemoryText'),
    photoFrame: document.getElementById('photoFrame'),
    addPhotoButton: document.getElementById('addPhotoButton'),
    replacePhotoButton: document.getElementById('replacePhotoButton'),
    cameraInput: document.getElementById('cameraInput'),
    libraryInput: document.getElementById('libraryInput'),
    photoSourceDialog: document.getElementById('photoSourceDialog'),
    photoSourceContext: document.getElementById('photoSourceContext'),
    cameraButton: document.getElementById('cameraButton'),
    libraryButton: document.getElementById('libraryButton'),
    cancelPhotoSourceButton: document.getElementById('cancelPhotoSourceButton'),
    statusText: document.getElementById('statusText'),
    yearStrip: document.getElementById('yearStrip'),
    dayOwnerStrip: document.getElementById('dayOwnerStrip'),
    comparison: document.querySelector('.comparison'),
    comparisonList: document.getElementById('comparisonList'),
    comparisonPair: document.getElementById('comparisonPair'),
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
    editCodeContext: document.getElementById('editCodeContext'),
    editCodeMessage: document.getElementById('editCodeMessage'),
    cancelEditCodeButton: document.getElementById('cancelEditCodeButton'),
    loginDialog: document.getElementById('loginDialog'),
    loginButtons: Array.from(document.querySelectorAll('[data-login-owner]')),
    navButtons: Array.from(document.querySelectorAll('[data-view]'))
};

let editCodeResolver = null;

const dateFormatter = new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit'
});
const monthFormatter = new Intl.DateTimeFormat('nb-NO', { month: 'long' });

function toMonthDay(date) {
    return normalizeCycleMonthDay(`${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
}

function normalizeCycleMonthDay(monthDay) {
    return monthDay === '02-29' ? '02-28' : monthDay;
}

function ownerLabel(owner = state.owner) {
    return OWNER_LABELS[normalizeOwner(owner)];
}

function signedInOwnerLabel() {
    return OWNER_LABELS[state.signedInOwner];
}

function memoriesForDay(day) {
    if (Array.isArray(day?.memories)) {
        return day.memories;
    }

    return day?.memory ? [day.memory] : [];
}

function selectedOwnerMemoryForDay(day) {
    const memories = memoriesForDay(day);
    return memories.find((memory) => normalizeOwner(memory.owner) === state.owner) || memories[0] || null;
}

function signedInMemoryForSelectedDate() {
    return findOwnMemory(state.dayMemories, {
        year: state.selectedYear,
        monthDay: state.selectedMonthDay,
        owner: state.signedInOwner
    });
}

function dateFromMonthDay(year, monthDay) {
    const [month, day] = monthDay.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function formatDateInputValue(year, monthDay) {
    return `${year}-${monthDay}`;
}

function parseDateInputValue(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        return null;
    }

    const [, yearPart, monthPart, dayPart] = match;
    const year = Number(yearPart);
    const month = Number(monthPart);
    const day = Number(dayPart);
    const date = new Date(year, month - 1, day);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return {
        monthDay: normalizeCycleMonthDay(`${monthPart}-${dayPart}`),
        year
    };
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

function cacheMemory(memory) {
    if (memory?.imageData) {
        state.comparisonMemoryCache.set(getMemoryKey(memory), memory);
    }
}

function clearMemoryCaches() {
    state.comparisonMemoryCache.clear();
    state.comparisonLoadingKey = null;
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
        elements.editCodeContext.textContent = saveContextText();
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

function openPhotoSourceDialog() {
    elements.photoSourceContext.textContent = saveContextText();
    elements.photoSourceDialog.hidden = false;
    elements.cameraButton.focus();
}

function closePhotoSourceDialog() {
    elements.photoSourceDialog.hidden = true;
}

function openPhotoInput(input) {
    closePhotoSourceDialog();
    input.click();
}

function saveContextText() {
    return formatSaveContext({
        owner: state.signedInOwner,
        year: state.selectedYear,
        monthDay: state.selectedMonthDay,
        word: selectedDay()?.word
    });
}

async function loadCalendar(year = state.selectedYear) {
    const calendar = await fetchJson(`/api/calendar/${year}`);
    state.calendar = calendar;
    state.selectedYear = calendar.year;
    return calendar;
}

async function loadSelectedMemory() {
    const owner = encodeURIComponent(state.owner);
    const payload = await fetchJson(`/api/memory/${state.selectedYear}/${state.selectedMonthDay}?owner=${owner}`);
    state.currentMemory = payload.memory;
    cacheMemory(payload.memory);
}

async function loadDayMemories() {
    const payload = await fetchJson(`/api/memories/day/${state.selectedMonthDay}`);
    state.dayMemories = payload.memories || [];
}

async function loadComparisonMemory(memory) {
    const key = getMemoryKey(memory);
    if (!key || state.comparisonMemoryCache.has(key) || state.comparisonLoadingKey === key) {
        return;
    }

    state.comparisonLoadingKey = key;

    try {
        const owner = encodeURIComponent(memory.owner);
        const payload = await fetchJson(`/api/memory/${memory.year}/${memory.monthDay}?owner=${owner}`);
        cacheMemory(payload.memory);
        if (state.selectedComparisonKey === key) {
            renderComparison();
        }
    } catch (error) {
        console.error(error);
        setStatus(error.message, 'error');
    } finally {
        if (state.comparisonLoadingKey === key) {
            state.comparisonLoadingKey = null;
        }
    }
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
    renderIdentity();
    renderDate();
    renderDayOwnerStrip();
    renderPhoto();
    renderYearStrip();
    renderComparison();
    renderOverview();
}

function renderIdentity() {
    elements.identityLabel.textContent = state.hasIdentity ? 'Jeg er' : 'Velg bruker';
    elements.identityButtons.forEach((button) => {
        const active = button.dataset.identity === state.signedInOwner;
        button.classList.toggle('identity-button--active', active);
        button.setAttribute('aria-pressed', String(active));
    });
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
    elements.datePickerInput.value = formatDateInputValue(state.selectedYear, state.selectedMonthDay);
    elements.overviewHeading.textContent = String(state.selectedYear);
}

function renderPhoto() {
    const ownMemory = signedInMemoryForSelectedDate();
    const uploadLabel = ownMemory
        ? `Bytt bilde som ${signedInOwnerLabel()}`
        : `Legg til bilde som ${signedInOwnerLabel()}`;

    elements.emptyMemoryText.textContent = uploadLabel;
    elements.addPhotoButton.setAttribute('aria-label', `${uploadLabel} for valgt dato`);
    elements.replacePhotoButton.textContent = uploadLabel;
    elements.replacePhotoButton.setAttribute('aria-label', `${uploadLabel} for valgt dato`);

    if (state.currentMemory?.imageData) {
        elements.currentImage.src = state.currentMemory.imageData;
        elements.currentImage.alt = `${state.currentMemory.word}, ${ownerLabel(state.currentMemory.owner)}, ${state.currentMemory.year}`;
        elements.currentImage.hidden = false;
        elements.photoMeta.textContent = formatMemoryCaption(state.currentMemory);
        elements.photoMeta.hidden = false;
        elements.emptyMemory.hidden = true;
        elements.replacePhotoButton.hidden = false;
        elements.photoFrame.classList.add('photo-frame--filled');
        return;
    }

    elements.currentImage.removeAttribute('src');
    elements.currentImage.alt = '';
    elements.currentImage.hidden = true;
    elements.photoMeta.textContent = '';
    elements.photoMeta.hidden = true;
    elements.emptyMemory.hidden = false;
    elements.replacePhotoButton.hidden = true;
    elements.photoFrame.classList.remove('photo-frame--filled');
}

function renderDayOwnerStrip() {
    elements.dayOwnerStrip.replaceChildren();

    buildSameDayOwnerOptions(state.dayMemories, {
        activeOwner: state.owner,
        monthDay: state.selectedMonthDay,
        year: state.selectedYear
    }).forEach((option) => {
        const button = document.createElement('button');
        const label = document.createElement('span');
        const status = document.createElement('span');
        const canSelect = option.hasMemory || option.owner === state.signedInOwner;

        button.type = 'button';
        button.className = 'day-owner-button';
        button.classList.toggle('day-owner-button--active', option.isActive);
        button.classList.toggle('day-owner-button--filled', option.hasMemory);
        button.disabled = !canSelect;
        button.setAttribute('aria-pressed', String(option.isActive));
        button.setAttribute(
            'aria-label',
            option.hasMemory
                ? `Vis bildet til ${option.label} for valgt dato`
                : `${option.label} mangler bilde for valgt dato`
        );

        label.textContent = option.label;
        status.textContent = option.hasMemory ? 'bilde' : 'mangler';

        button.append(label, status);
        button.addEventListener('click', () => switchViewingOwner(option.owner));
        elements.dayOwnerStrip.appendChild(button);
    });
}

function renderYearStrip() {
    elements.yearStrip.replaceChildren();

    const history = buildSameDateHistory(state.dayMemories, {
        activeYear: state.selectedYear,
        activeOwner: state.owner
    });

    if (history.timeline.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'muted';
        empty.textContent = 'Ingen tidligere bilder på denne datoen.';
        elements.yearStrip.appendChild(empty);
        return;
    }

    history.timeline.forEach((memory) => {
        const button = document.createElement('button');
        const image = document.createElement('img');
        const label = document.createElement('span');
        const ownerName = ownerLabel(memory.owner);
        const key = getMemoryKey(memory);

        button.type = 'button';
        button.className = 'year-memory';
        button.classList.toggle('year-memory--active', key === history.activeKey);
        button.setAttribute('aria-label', `Åpne ${memory.word} fra ${ownerName} ${memory.year}`);

        image.src = memory.thumbnailData;
        image.alt = '';
        label.textContent = `${ownerName} ${memory.year}`;

        button.append(image, label);
        button.addEventListener('click', async () => {
            state.selectedYear = memory.year;
            state.owner = normalizeOwner(memory.owner);
            state.selectedComparisonKey = null;
            await refreshAll();
        });
        elements.yearStrip.appendChild(button);
    });
}

function renderComparison() {
    elements.comparisonList.replaceChildren();
    elements.comparisonPair.replaceChildren();

    const history = buildSameDateHistory(state.dayMemories, {
        activeYear: state.selectedYear,
        activeOwner: state.owner
    });

    if (history.comparisonMemories.length === 0) {
        elements.comparison.hidden = true;
        elements.comparisonPair.hidden = true;
        return;
    }

    elements.comparison.hidden = false;
    const selectedComparison = history.comparisonMemories.find((memory) => getMemoryKey(memory) === state.selectedComparisonKey) || history.defaultComparison;
    state.selectedComparisonKey = getMemoryKey(selectedComparison);

    history.comparisonMemories.forEach((memory) => {
        const button = document.createElement('button');
        const image = document.createElement('img');
        const label = document.createElement('span');
        const key = getMemoryKey(memory);
        const ownerName = ownerLabel(memory.owner);

        button.type = 'button';
        button.className = 'comparison-item';
        button.classList.toggle('comparison-item--active', key === state.selectedComparisonKey);
        button.setAttribute('aria-pressed', String(key === state.selectedComparisonKey));
        button.setAttribute('aria-label', `Sammenlign med ${ownerName} ${memory.year}`);

        image.src = memory.thumbnailData;
        image.alt = '';
        label.textContent = `${ownerName} ${memory.year}`;

        button.append(image, label);
        button.addEventListener('click', () => {
            state.selectedComparisonKey = key;
            renderComparison();
        });
        elements.comparisonList.appendChild(button);
    });

    const selectedComparisonKey = getMemoryKey(selectedComparison);
    const comparisonMemory = selectedComparison?.imageData
        ? selectedComparison
        : state.comparisonMemoryCache.get(selectedComparisonKey);

    if (!state.currentMemory?.imageData || !comparisonMemory?.imageData) {
        elements.comparisonPair.hidden = true;
        loadComparisonMemory(selectedComparison);
        return;
    }

    elements.comparisonPair.hidden = false;
    elements.comparisonPair.append(
        createComparisonFigure(state.currentMemory, 'Valgt'),
        createComparisonFigure(comparisonMemory, 'Mot')
    );
}

function createComparisonFigure(memory, label) {
    const figure = document.createElement('figure');
    const image = document.createElement('img');
    const caption = document.createElement('figcaption');

    figure.className = 'comparison-panel';
    image.src = memory.imageData;
    image.alt = `${memory.word}, ${ownerLabel(memory.owner)}, ${memory.year}`;
    caption.textContent = `${label}: ${formatMemoryCaption(memory)}`;

    figure.append(image, caption);
    return figure;
}

function renderOverview() {
    if (!state.calendar) {
        return;
    }

    elements.yearGrid.replaceChildren();
    let filledDays = 0;
    let photoCount = 0;
    const ownerCounts = createOwnerCounts();
    const daysByMonth = groupDaysByMonth(state.calendar.days);

    daysByMonth.forEach((monthDays, month) => {
        const section = document.createElement('section');
        const heading = document.createElement('h3');
        const dotGrid = document.createElement('div');
        const monthName = monthFormatter.format(new Date(state.selectedYear, month - 1, 1));

        section.className = 'month-overview';
        section.setAttribute('aria-labelledby', `overview-month-${month}`);
        heading.id = `overview-month-${month}`;
        heading.className = 'month-overview-title';
        heading.textContent = monthName;

        dotGrid.className = 'month-dot-grid';
        dotGrid.setAttribute('role', 'list');
        dotGrid.setAttribute('aria-label', `${monthName} ${state.selectedYear}`);

        monthDays.forEach((day) => {
            const memories = memoriesForDay(day);
            if (memories.length > 0) {
                filledDays += 1;
                photoCount += memories.length;
                memories.forEach((memory) => {
                    const owner = normalizeOwner(memory.owner);
                    ownerCounts[owner] += 1;
                });
            }
            dotGrid.appendChild(createDayDot(day));
        });

        section.append(heading, dotGrid);
        elements.yearGrid.appendChild(section);
    });

    elements.overviewSummary.textContent = buildOverviewSummary({
        filledDays,
        ownerCounts,
        photoCount,
        year: state.selectedYear
    });
}

function groupDaysByMonth(days) {
    return days.reduce((months, day) => {
        const monthDays = months.get(day.month) || [];
        monthDays.push(day);
        months.set(day.month, monthDays);
        return months;
    }, new Map());
}

async function switchViewingOwner(owner) {
    const nextOwner = normalizeOwner(owner);
    if (nextOwner === state.owner) {
        return;
    }

    state.owner = nextOwner;
    state.selectedComparisonKey = null;
    await loadSelectedMemory();
    render();
}

function createDayDot(day) {
    const button = document.createElement('button');
    const memories = memoriesForDay(day);
    const previewMemory = selectedOwnerMemoryForDay(day);
    const ownerState = getOverviewOwnerState(memories, state.signedInOwner);

    button.type = 'button';
    button.className = 'day-dot';
    button.classList.toggle('day-dot--filled', memories.length > 0);
    if (ownerState.className) {
        button.classList.add(ownerState.className);
    }
    button.classList.toggle('day-dot--today', isToday(state.selectedYear, day.monthDay));
    button.classList.toggle('day-dot--selected', day.monthDay === state.selectedMonthDay);
    button.setAttribute('role', 'listitem');
    button.setAttribute(
        'aria-label',
        `${day.day}.${day.month}. ${day.word}${ownerState.label}`
    );

    if (previewMemory?.thumbnailData) {
        button.style.setProperty('--dot-image', `url("${previewMemory.thumbnailData}")`);
    }

    button.addEventListener('click', async () => {
        clearMemoryCaches();
        state.selectedMonthDay = day.monthDay;
        state.view = 'today';
        state.selectedComparisonKey = null;
        await refreshAll();
    });

    return button;
}

async function changeYear(offset) {
    state.selectedYear += offset;
    state.selectedComparisonKey = null;
    await refreshAll();
}

async function goToToday() {
    clearMemoryCaches();
    state.selectedYear = today.getFullYear();
    state.selectedMonthDay = toMonthDay(today);
    state.view = 'today';
    state.selectedComparisonKey = null;
    await refreshAll();
}

async function goToPickedDate(value) {
    const pickedDate = parseDateInputValue(value);

    if (!pickedDate) {
        elements.datePickerInput.value = formatDateInputValue(state.selectedYear, state.selectedMonthDay);
        return;
    }

    clearMemoryCaches();
    state.selectedYear = pickedDate.year;
    state.selectedMonthDay = pickedDate.monthDay;
    state.view = 'today';
    state.selectedComparisonKey = null;
    await refreshAll();
}

function openDatePicker() {
    if (typeof elements.datePickerInput.showPicker === 'function') {
        elements.datePickerInput.showPicker();
        return;
    }

    elements.datePickerInput.focus();
    elements.datePickerInput.click();
}

function switchView(view) {
    state.view = view;
    renderView();
}

async function switchIdentity(owner) {
    const nextOwner = normalizeIdentity(owner);
    if (!nextOwner || (nextOwner === state.signedInOwner && state.hasIdentity)) {
        return;
    }

    state.signedInOwner = nextOwner;
    state.owner = nextOwner;
    state.hasIdentity = true;
    state.selectedComparisonKey = null;
    elements.loginDialog.hidden = true;
    localStorage.setItem(IDENTITY_STORAGE_KEY, state.signedInOwner);
    localStorage.setItem(OWNER_STORAGE_KEY, state.signedInOwner);
    renderIdentity();
    renderPhoto();
    await refreshAll();
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
                owner: state.signedInOwner,
                originalName: file.name,
                ...payload
            })
        });

        state.owner = state.signedInOwner;
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
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !elements.photoSourceDialog.hidden) {
            closePhotoSourceDialog();
        }
    });
    elements.todayButton.addEventListener('click', goToToday);
    elements.identityButtons.forEach((button) => {
        button.addEventListener('click', () => switchIdentity(button.dataset.identity));
    });
    elements.loginButtons.forEach((button) => {
        button.addEventListener('click', () => switchIdentity(button.dataset.loginOwner));
    });
    elements.previousYearButton.addEventListener('click', () => changeYear(-1));
    elements.nextYearButton.addEventListener('click', () => changeYear(1));
    elements.overviewPreviousYearButton.addEventListener('click', () => changeYear(-1));
    elements.overviewNextYearButton.addEventListener('click', () => changeYear(1));
    elements.datePickerButton.addEventListener('click', openDatePicker);
    elements.datePickerInput.addEventListener('change', (event) => goToPickedDate(event.target.value));
    elements.addPhotoButton.addEventListener('click', openPhotoSourceDialog);
    elements.replacePhotoButton.addEventListener('click', openPhotoSourceDialog);
    elements.photoFrame.addEventListener('click', (event) => {
        if (event.target === elements.photoFrame && state.currentMemory) {
            openPhotoSourceDialog();
        }
    });
    elements.cameraButton.addEventListener('click', () => openPhotoInput(elements.cameraInput));
    elements.libraryButton.addEventListener('click', () => openPhotoInput(elements.libraryInput));
    elements.cancelPhotoSourceButton.addEventListener('click', closePhotoSourceDialog);
    elements.photoSourceDialog.addEventListener('click', (event) => {
        if (event.target === elements.photoSourceDialog) {
            closePhotoSourceDialog();
        }
    });
    elements.cameraInput.addEventListener('change', handlePhotoSelected);
    elements.libraryInput.addEventListener('change', handlePhotoSelected);
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
refreshAll()
    .then(() => {
        if (!state.hasIdentity) {
            elements.loginDialog.hidden = false;
            const activeButton = elements.loginButtons.find((button) => button.dataset.loginOwner === state.signedInOwner);
            activeButton?.focus();
        }
    })
    .catch((error) => {
        console.error(error);
        setStatus(error.message, 'error');
    });
