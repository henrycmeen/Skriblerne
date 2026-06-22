import { API_BASE_URL } from './config.js';
import { OWNER_LABELS } from './history-utils.mjs';
import {
    IDENTITY_STORAGE_KEY,
    normalizeIdentity,
    readStoredIdentity
} from './identity-utils.mjs';
import {
    approveReviewForReviewer,
    buildReviewSyncStatus,
    buildMonthProgress,
    hasRequiredReviewers,
    isReviewCompleteForApply,
    markReviewer,
    mergeReviewStates,
    monthProgressLabel,
    needsReviewer,
    normalizeReviewers,
    REQUIRED_REVIEWERS
} from './review-progress.mjs?v=20260622-26';

const REVIEW_STORAGE_KEY = 'skriblerne-word-review-v1';
const REVIEW_FILTER_STORAGE_KEY = 'skriblerne-word-review-filter-v1';
const REVIEW_DIRTY_STORAGE_KEY = 'skriblerne-word-review-dirty-v1';
const EDIT_CODE_STORAGE_KEY = 'skriblerne-edit-code';
const REVIEW_FILTERS = new Set(['all', 'open', 'mine', 'flagged', 'suggested']);

const monthFormatter = new Intl.DateTimeFormat('nb-NO', { month: 'long' });
const sharedDateFormatter = new Intl.DateTimeFormat('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
});
const sharedTimeFormatter = new Intl.DateTimeFormat('nb-NO', {
    hour: '2-digit',
    minute: '2-digit'
});
const reviewState = loadReviewState();
let activeFilter = loadReviewFilter();
let activeReviewer = readStoredIdentity(localStorage) || 'henry';
let firstPassCandidates = null;
let currentWords = [];
let hasUnsavedReviewChanges = Object.keys(reviewState).length > 0 &&
    localStorage.getItem(REVIEW_DIRTY_STORAGE_KEY) === 'true';
let sharedReviewUpdatedAt = null;

const elements = {
    identityLabel: document.getElementById('identityLabel'),
    identityButtons: Array.from(document.querySelectorAll('[data-identity]')),
    months: document.getElementById('reviewMonths'),
    summary: document.getElementById('reviewSummary'),
    readiness: document.getElementById('reviewReadiness'),
    syncStatus: document.getElementById('reviewSyncStatus'),
    status: document.getElementById('reviewStatus'),
    firstPassButton: document.getElementById('firstPassButton'),
    loadSharedButton: document.getElementById('loadSharedReviewButton'),
    saveSharedButton: document.getElementById('saveSharedReviewButton'),
    importButton: document.getElementById('importReviewButton'),
    importInput: document.getElementById('importReviewInput'),
    exportButton: document.getElementById('exportReviewButton'),
    filterButtons: Array.from(document.querySelectorAll('[data-review-filter]')),
    monthNav: document.getElementById('reviewMonthNav'),
    nextOpenButton: document.getElementById('nextOpenButton'),
    sharedReviewCodeDialog: document.getElementById('sharedReviewCodeDialog'),
    sharedReviewCodeForm: document.getElementById('sharedReviewCodeForm'),
    sharedReviewCodeInput: document.getElementById('sharedReviewCodeInput'),
    sharedReviewCodeContext: document.getElementById('sharedReviewCodeContext'),
    sharedReviewCodeMessage: document.getElementById('sharedReviewCodeMessage'),
    cancelSharedReviewCodeButton: document.getElementById('cancelSharedReviewCodeButton')
};

let editCode = localStorage.getItem(EDIT_CODE_STORAGE_KEY) || '';
let sharedReviewCodeResolver = null;

function loadReviewState() {
    try {
        return JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY)) || {};
    } catch (_error) {
        return {};
    }
}

function saveReviewState() {
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviewState));
}

function loadReviewFilter() {
    const storedFilter = localStorage.getItem(REVIEW_FILTER_STORAGE_KEY);
    return REVIEW_FILTERS.has(storedFilter) ? storedFilter : 'all';
}

function saveReviewFilter() {
    localStorage.setItem(REVIEW_FILTER_STORAGE_KEY, activeFilter);
}

function markUnsavedReviewChanges() {
    hasUnsavedReviewChanges = true;
    localStorage.setItem(REVIEW_DIRTY_STORAGE_KEY, 'true');
    updateSyncStatus();
}

function clearUnsavedReviewChanges() {
    hasUnsavedReviewChanges = false;
    localStorage.removeItem(REVIEW_DIRTY_STORAGE_KEY);
    updateSyncStatus();
}

function updateSharedReviewTimestamp(updatedAt) {
    sharedReviewUpdatedAt = updatedAt || null;
    updateSyncStatus();
}

function formatSharedReviewTimestamp(updatedAt) {
    if (!updatedAt) {
        return '';
    }

    const date = new Date(updatedAt);
    if (Number.isNaN(date.valueOf())) {
        return '';
    }

    return `${sharedDateFormatter.format(date)} kl. ${sharedTimeFormatter.format(date)}`;
}

function updateSyncStatus() {
    elements.syncStatus.textContent = buildReviewSyncStatus({
        hasUnsavedChanges: hasUnsavedReviewChanges,
        updatedLabel: formatSharedReviewTimestamp(sharedReviewUpdatedAt)
    });
    elements.syncStatus.dataset.tone = hasUnsavedReviewChanges ? 'warning' : 'neutral';
}

function replaceReviewState(nextState) {
    Object.keys(reviewState).forEach((key) => {
        delete reviewState[key];
    });
    Object.assign(reviewState, nextState);
    saveReviewState();
}

function mergeReviewState(nextState) {
    replaceReviewState(mergeReviewStates(reviewState, nextState));
}

async function fetchWords() {
    const response = await fetch(`${API_BASE_URL}/api/words`, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error('Kunne ikke hente ordlisten.');
    }
    return response.json();
}

async function fetchFirstPassCandidates() {
    if (firstPassCandidates) {
        return firstPassCandidates;
    }

    const response = await fetch(`${API_BASE_URL}/data/wordReviewCandidates.json`, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error('Kunne ikke hente første-pass-listen.');
    }

    firstPassCandidates = await response.json();
    return firstPassCandidates;
}

async function fetchSharedReview() {
    const response = await fetch(`${API_BASE_URL}/api/word-review`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(payload.error || 'Kunne ikke hente felles gjennomgang.');
    }

    return payload;
}

async function saveSharedReview() {
    const code = editCode || await requestSharedReviewCode();
    if (!code) {
        return null;
    }

    const response = await fetch(`${API_BASE_URL}/api/word-review`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Skriblerne-Edit-Code': code
        },
        body: JSON.stringify({ reviewState })
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401) {
            editCode = '';
            localStorage.removeItem(EDIT_CODE_STORAGE_KEY);
        }
        throw new Error(payload.error || 'Kunne ikke lagre felles gjennomgang.');
    }

    editCode = code;
    localStorage.setItem(EDIT_CODE_STORAGE_KEY, editCode);
    return payload;
}

function requestSharedReviewCode(message = '') {
    return new Promise((resolve) => {
        sharedReviewCodeResolver = resolve;
        elements.sharedReviewCodeContext.textContent = 'Felles ordgjennomgang';
        elements.sharedReviewCodeMessage.textContent = message;
        elements.sharedReviewCodeInput.value = editCode;
        elements.sharedReviewCodeDialog.hidden = false;
        elements.sharedReviewCodeInput.focus();
    });
}

function resolveSharedReviewCode(code) {
    elements.sharedReviewCodeDialog.hidden = true;
    sharedReviewCodeResolver?.(code);
    sharedReviewCodeResolver = null;
}

function groupByMonth(words) {
    return words.reduce((months, word) => {
        const month = months.get(word.month) || [];
        month.push(word);
        months.set(word.month, month);
        return months;
    }, new Map());
}

function render(words) {
    currentWords = words;
    elements.months.replaceChildren();
    renderIdentity();
    updateSyncStatus();

    groupByMonth(words).forEach((monthWords, month) => {
        const section = document.createElement('section');
        section.className = 'review-month';
        section.setAttribute('aria-labelledby', `month-${month}`);

        const heading = document.createElement('h3');
        heading.id = `month-${month}`;
        heading.textContent = monthFormatter.format(new Date(2026, month - 1, 1));
        section.appendChild(heading);

        const list = document.createElement('div');
        list.className = 'review-word-list';

        monthWords.forEach((entry) => {
            list.appendChild(renderWordRow(entry));
        });

        section.appendChild(list);
        elements.months.appendChild(section);
    });

    updateSummary(words);
    updateReadiness(words);
    updateFilterControls(words);
    renderMonthNav(words);
    applyReviewFilter();
    elements.firstPassButton.disabled = false;
    elements.loadSharedButton.disabled = false;
    elements.saveSharedButton.disabled = false;
    elements.importButton.disabled = false;
    elements.exportButton.disabled = false;
    elements.nextOpenButton.disabled = false;
    elements.exportButton.onclick = () => exportReview(words);
}

function renderWordRow(entry) {
    const review = reviewState[entry.monthDay] || {};
    const reviewers = normalizeReviewers(review.reviewers);
    const activeReviewerHasApproved = review.status === 'approved' && reviewers[activeReviewer];
    const row = document.createElement('article');
    row.className = 'review-word-row';
    row.dataset.monthDay = entry.monthDay;

    const heading = document.createElement('div');
    heading.className = 'review-word-heading';
    heading.innerHTML = `
        <span>${entry.day}.${entry.month}.</span>
        <strong>${entry.word}</strong>
    `;

    const controls = document.createElement('div');
    controls.className = 'review-controls';

    const approvedLabel = document.createElement('label');
    approvedLabel.className = 'review-check';
    approvedLabel.innerHTML = `
        <input type="checkbox" ${review.status === 'approved' ? 'checked' : ''}>
        <span>OK</span>
    `;
    const approvedInput = approvedLabel.querySelector('input');

    const flaggedLabel = document.createElement('label');
    flaggedLabel.className = 'review-check';
    flaggedLabel.innerHTML = `
        <input type="checkbox" ${review.status === 'flagged' ? 'checked' : ''}>
        <span>Se på</span>
    `;
    const flaggedInput = flaggedLabel.querySelector('input');

    const quickApproveButton = document.createElement('button');
    quickApproveButton.type = 'button';
    quickApproveButton.className = 'review-quick-approve';
    quickApproveButton.disabled = activeReviewerHasApproved;
    quickApproveButton.textContent = activeReviewerHasApproved
        ? `OK av ${OWNER_LABELS[activeReviewer]}`
        : `OK som ${OWNER_LABELS[activeReviewer]}`;
    quickApproveButton.setAttribute('aria-label', `Godkjenn ${entry.word} som ${OWNER_LABELS[activeReviewer]}`);

    const reviewerGroup = document.createElement('div');
    reviewerGroup.className = 'review-reviewers';
    reviewerGroup.setAttribute('aria-label', `Gjennomgått av ${entry.word}`);

    REQUIRED_REVIEWERS.forEach((reviewer) => {
        const reviewerLabel = document.createElement('label');
        reviewerLabel.className = 'review-check review-reviewer-check';
        reviewerLabel.classList.toggle('review-reviewer-check--active', reviewer === activeReviewer);
        reviewerLabel.dataset.reviewer = reviewer;
        reviewerLabel.innerHTML = `
            <input type="checkbox" ${reviewers[reviewer] ? 'checked' : ''}>
            <span>${OWNER_LABELS[reviewer]}</span>
        `;

        const reviewerInput = reviewerLabel.querySelector('input');
        reviewerInput.addEventListener('change', (event) => {
            const nextReviewers = normalizeReviewers(reviewState[entry.monthDay]?.reviewers);
            nextReviewers[reviewer] = event.target.checked;
            setReview(entry.monthDay, {
                ...reviewState[entry.monthDay],
                reviewers: nextReviewers
            });
            updateReviewProgress();
        });

        reviewerGroup.appendChild(reviewerLabel);
    });

    quickApproveButton.addEventListener('click', () => {
        setReview(entry.monthDay, approveReviewForReviewer(reviewState[entry.monthDay], activeReviewer));
        approvedInput.checked = true;
        flaggedInput.checked = false;
        quickApproveButton.disabled = true;
        quickApproveButton.textContent = `OK av ${OWNER_LABELS[activeReviewer]}`;
        syncReviewerInputs(reviewerGroup, entry.monthDay);
        updateReviewProgress();
    });

    approvedInput.addEventListener('change', (event) => {
        if (event.target.checked) {
            flaggedInput.checked = false;
        }
        setReview(entry.monthDay, {
            ...reviewState[entry.monthDay],
            status: event.target.checked ? 'approved' : ''
        }, { markActiveReviewer: event.target.checked });
        syncReviewerInputs(reviewerGroup, entry.monthDay);
        updateReviewProgress();
    });

    flaggedInput.addEventListener('change', (event) => {
        if (event.target.checked) {
            approvedInput.checked = false;
        }
        setReview(entry.monthDay, {
            ...reviewState[entry.monthDay],
            status: event.target.checked ? 'flagged' : ''
        }, { markActiveReviewer: event.target.checked });
        syncReviewerInputs(reviewerGroup, entry.monthDay);
        updateReviewProgress();
    });

    const suggestedWord = document.createElement('input');
    suggestedWord.className = 'review-suggested-word';
    suggestedWord.type = 'text';
    suggestedWord.placeholder = 'Nytt ord';
    suggestedWord.value = review.suggestedWord || '';
    suggestedWord.setAttribute('aria-label', `Nytt ord for ${entry.word}`);
    suggestedWord.addEventListener('input', (event) => {
        setReview(entry.monthDay, {
            ...reviewState[entry.monthDay],
            suggestedWord: event.target.value
        }, { markActiveReviewer: Boolean(event.target.value.trim()) });
        syncReviewerInputs(reviewerGroup, entry.monthDay);
        updateReviewProgress();
    });

    const note = document.createElement('input');
    note.className = 'review-note';
    note.type = 'text';
    note.placeholder = 'Forslag eller kommentar';
    note.value = review.note || '';
    note.setAttribute('aria-label', `Forslag eller kommentar til ${entry.word}`);
    note.addEventListener('input', (event) => {
        setReview(entry.monthDay, {
            ...reviewState[entry.monthDay],
            note: event.target.value
        }, { markActiveReviewer: Boolean(event.target.value.trim()) });
        syncReviewerInputs(reviewerGroup, entry.monthDay);
        updateReviewProgress();
    });

    controls.append(approvedLabel, flaggedLabel, quickApproveButton, suggestedWord, note, reviewerGroup);
    row.append(heading, controls);
    return row;
}

function setReview(monthDay, review, options = {}) {
    reviewState[monthDay] = options.markActiveReviewer
        ? markReviewer(review, activeReviewer)
        : review;
    saveReviewState();
    markUnsavedReviewChanges();
}

function syncReviewerInputs(reviewerGroup, monthDay) {
    const reviewers = normalizeReviewers(reviewState[monthDay]?.reviewers);

    reviewerGroup.querySelectorAll('[data-reviewer]').forEach((label) => {
        const input = label.querySelector('input');
        input.checked = reviewers[label.dataset.reviewer];
    });
}

function renderIdentity() {
    elements.identityLabel.textContent = 'Jeg er';
    elements.identityButtons.forEach((button) => {
        const active = button.dataset.identity === activeReviewer;
        button.classList.toggle('identity-button--active', active);
        button.setAttribute('aria-pressed', String(active));
    });
}

function switchReviewer(reviewer) {
    const nextReviewer = normalizeIdentity(reviewer);
    if (!nextReviewer || nextReviewer === activeReviewer) {
        return;
    }

    activeReviewer = nextReviewer;
    localStorage.setItem(IDENTITY_STORAGE_KEY, activeReviewer);
    render(currentWords);
}

function updateReviewProgress() {
    updateSummary(currentWords);
    updateReadiness(currentWords);
    updateFilterControls(currentWords);
    renderMonthNav(currentWords);
    applyReviewFilter();
}

function updateSummary(words) {
    const stats = getReviewStats(words);
    const filteredCount = countFilteredWords(words);
    elements.summary.textContent = [
        `${stats.reviewed} av ${words.length} ord er markert.`,
        `Henry ${stats.reviewers.henry}/${words.length}. Ellinor ${stats.reviewers.ellinor}/${words.length}.`,
        `${stats.flagged} ord er merket for ny vurdering.`,
        `${stats.suggested} ${stats.suggested === 1 ? 'nytt ord er' : 'nye ord er'} foreslått.`,
        stats.duplicateCount > 0
            ? `${stats.duplicateCount} ${stats.duplicateCount === 1 ? 'duplikat må' : 'duplikater må'} løses.`
            : 'Ingen duplikater i forslagene.',
        activeFilter === 'all'
            ? ''
            : `Filteret viser ${filteredCount} ${filteredCount === 1 ? 'ord' : 'ord'}.`
    ].filter(Boolean).join(' ');
}

function updateReadiness(words) {
    const stats = getReviewStats(words);
    const blockers = [];

    if (stats.open > 0) {
        blockers.push(`${stats.open} ${stats.open === 1 ? 'uavklart ord' : 'uavklarte ord'}`);
    }

    if (stats.duplicateCount > 0) {
        blockers.push(`${stats.duplicateCount} ${stats.duplicateCount === 1 ? 'duplikat' : 'duplikater'}`);
    }

    if (stats.missingReviewers > 0) {
        blockers.push(`${stats.missingReviewers} ${stats.missingReviewers === 1 ? 'ord mangler' : 'ord mangler'} Henry/Ellinor-gjennomgang`);
    }

    if (blockers.length === 0 && stats.reviewed === words.length) {
        elements.readiness.textContent = 'Klar for apply-scriptet.';
        elements.readiness.dataset.tone = 'success';
        return;
    }

    elements.readiness.textContent = `Ikke klar: ${blockers.join(' og ')} gjenstår.`;
    elements.readiness.dataset.tone = 'neutral';
}

function updateFilterControls(words) {
    const stats = getReviewStats(words);
    const labels = {
        all: `Alle ${words.length}`,
        open: `Uavklarte ${stats.open}`,
        mine: `Mangler ${OWNER_LABELS[activeReviewer]} ${stats.missingByReviewer[activeReviewer]}`,
        flagged: `Se på ${stats.flagged}`,
        suggested: `Forslag ${stats.suggested}`
    };

    elements.filterButtons.forEach((button) => {
        const isActive = button.dataset.reviewFilter === activeFilter;
        button.textContent = labels[button.dataset.reviewFilter] || button.textContent;
        button.classList.toggle('review-filter-button--active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
    elements.nextOpenButton.textContent = activeFilter === 'mine'
        ? 'Neste som mangler meg'
        : 'Neste uavklarte';
}

function renderMonthNav(words) {
    elements.monthNav.replaceChildren();

    buildMonthProgress(words, reviewState).forEach((progress) => {
        const button = document.createElement('button');
        const monthName = monthFormatter.format(new Date(2026, progress.month - 1, 1));

        button.type = 'button';
        button.className = 'review-month-link';
        button.classList.toggle('review-month-link--complete', progress.open === 0);
        button.textContent = monthProgressLabel(progress, monthName);
        button.setAttribute(
            'aria-label',
            `${monthName}: ${progress.complete} av ${progress.total} ferdige, ${progress.open} uavklarte, ${progress.missingReviewers} mangler gjennomgang fra Henry eller Ellinor`
        );
        button.addEventListener('click', () => {
            const section = document.getElementById(`month-${progress.month}`);
            section?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        });

        elements.monthNav.appendChild(button);
    });
}

function setReviewStatus(message, tone = 'neutral') {
    elements.status.textContent = message;
    elements.status.dataset.tone = tone;
}

async function loadSharedReviewState(options = {}) {
    const { auto = false } = options;

    if (!Array.isArray(currentWords) || currentWords.length === 0) {
        if (!auto) {
            setReviewStatus('Ordlisten må være lastet før felles gjennomgang kan hentes.', 'error');
        }
        return;
    }

    try {
        if (!auto) {
            setReviewStatus('Henter felles gjennomgang.');
        }
        const payload = await fetchSharedReview();
        updateSharedReviewTimestamp(payload.updatedAt);
        const imported = importReviewPayload({ reviewState: payload.reviewState || {} }, currentWords, {
            allowEmpty: true
        });
        if (imported.reviewed === 0 && Object.keys(reviewState).length > 0) {
            markUnsavedReviewChanges();
            if (!auto) {
                setReviewStatus('Felles gjennomgang er tom. Lokal gjennomgang er beholdt.', 'neutral');
            }
            return;
        }

        if (imported.reviewed === 0) {
            if (!auto) {
                setReviewStatus('Felles gjennomgang er tom.', 'neutral');
            }
            return;
        }

        mergeReviewState(imported.reviewState);
        render(currentWords);
        setReviewStatus(
            `${imported.reviewed} ${imported.reviewed === 1 ? 'markering' : 'markeringer'} hentet og flettet fra felles gjennomgang.`,
            'success'
        );
    } catch (error) {
        console.error(error);
        setReviewStatus(
            auto
                ? 'Kunne ikke hente felles gjennomgang automatisk. Lokal gjennomgang er beholdt.'
                : error.message || 'Kunne ikke hente felles gjennomgang.',
            auto ? 'neutral' : 'error'
        );
    }
}

async function initializeWordReview(words) {
    render(words);
    await loadSharedReviewState({ auto: true });
}

async function saveSharedReviewState() {
    if (!Array.isArray(currentWords) || currentWords.length === 0) {
        setReviewStatus('Ordlisten må være lastet før felles gjennomgang kan lagres.', 'error');
        return;
    }

    try {
        if (Object.keys(reviewState).length === 0) {
            setReviewStatus('Ingen lokal gjennomgang å lagre.', 'neutral');
            return;
        }

        setReviewStatus('Lagrer felles gjennomgang.');
        const payload = await saveSharedReview();
        if (!payload) {
            setReviewStatus('');
            return;
        }

        const imported = importReviewPayload({ reviewState: payload.reviewState || {} }, currentWords, {
            allowEmpty: true
        });

        updateSharedReviewTimestamp(payload.updatedAt);
        clearUnsavedReviewChanges();
        replaceReviewState(imported.reviewState);
        render(currentWords);
        setReviewStatus('Felles gjennomgang er lagret og flettet.', 'success');
    } catch (error) {
        console.error(error);
        setReviewStatus(error.message || 'Kunne ikke lagre felles gjennomgang.', 'error');
    }
}

async function applyFirstPassCandidates() {
    if (!Array.isArray(currentWords) || currentWords.length === 0) {
        setReviewStatus('Ordlisten må være lastet før første-pass kan brukes.', 'error');
        return;
    }

    try {
        const candidates = await fetchFirstPassCandidates();
        const validDates = new Set(currentWords.map((word) => word.monthDay));
        const nextState = {};
        let applied = 0;

        Object.entries(candidates).forEach(([monthDay, candidate]) => {
            if (!validDates.has(monthDay)) {
                return;
            }

            const existingReview = reviewState[monthDay] || {};
            if (existingReview.status || existingReview.suggestedWord || existingReview.note) {
                return;
            }

            nextState[monthDay] = {
                status: 'flagged',
                suggestedWord: candidate.suggestedWord || '',
                note: candidate.note || '',
                reviewers: normalizeReviewers(existingReview.reviewers)
            };
            applied += 1;
        });

        if (applied === 0) {
            setReviewStatus('Ingen nye første-pass-kandidater å legge til.', 'neutral');
            return;
        }

        mergeReviewState(nextState);
        markUnsavedReviewChanges();
        setActiveFilter('flagged');
        render(currentWords);
        setReviewStatus(`${applied} første-pass-kandidater lagt til som Se på.`, 'success');
    } catch (error) {
        console.error(error);
        setReviewStatus(error.message || 'Kunne ikke starte første-pass.', 'error');
    }
}

function getReviewStats(words) {
    const finalWords = new Map();
    let reviewed = 0;
    let flagged = 0;
    let open = 0;
    let suggested = 0;
    let duplicateCount = 0;
    let missingReviewers = 0;
    const reviewers = Object.fromEntries(REQUIRED_REVIEWERS.map((reviewer) => [reviewer, 0]));
    const missingByReviewer = Object.fromEntries(REQUIRED_REVIEWERS.map((reviewer) => [reviewer, 0]));

    words.forEach((word) => {
        const review = reviewState[word.monthDay] || {};
        const reviewReviewers = normalizeReviewers(review.reviewers);
        const suggestedWord = normalizeWord(review.suggestedWord);
        const originalWord = normalizeWord(word.word);
        const finalWord = suggestedWord || originalWord;

        if (review.status) {
            reviewed += 1;
        }
        if (!isReviewCompleteForApply(review)) {
            open += 1;
        }
        REQUIRED_REVIEWERS.forEach((reviewer) => {
            if (reviewReviewers[reviewer]) {
                reviewers[reviewer] += 1;
            } else {
                missingByReviewer[reviewer] += 1;
            }
        });
        if (!hasRequiredReviewers(review)) {
            missingReviewers += 1;
        }
        if (review.status === 'flagged') {
            flagged += 1;
        }
        if (suggestedWord && suggestedWord !== originalWord) {
            suggested += 1;
        }
        if (finalWords.has(finalWord)) {
            duplicateCount += 1;
        }
        finalWords.set(finalWord, word.monthDay);
    });

    return {
        duplicateCount,
        flagged,
        missingReviewers,
        missingByReviewer,
        open,
        reviewed,
        reviewers,
        suggested
    };
}

function normalizeWord(word) {
    return String(word || '').trim().toLocaleLowerCase('nb-NO');
}

function countFilteredWords(words) {
    return words.filter((word) => matchesReviewFilter(word)).length;
}

function matchesReviewFilter(word, filter = activeFilter) {
    const review = reviewState[word.monthDay] || {};
    const suggestedWord = normalizeWord(review.suggestedWord);
    const originalWord = normalizeWord(word.word);

    if (filter === 'open') {
        return !isReviewCompleteForApply(review);
    }

    if (filter === 'mine') {
        return needsReviewer(review, activeReviewer);
    }

    if (filter === 'flagged') {
        return review.status === 'flagged';
    }

    if (filter === 'suggested') {
        return Boolean(suggestedWord && suggestedWord !== originalWord);
    }

    return true;
}

function applyReviewFilter() {
    const wordsByMonthDay = new Map(currentWords.map((word) => [word.monthDay, word]));
    let activeElementWasHidden = false;

    document.querySelectorAll('.review-month').forEach((section) => {
        let hasVisibleRows = false;

        section.querySelectorAll('.review-word-row').forEach((row) => {
            const word = wordsByMonthDay.get(row.dataset.monthDay);
            const isVisible = word ? matchesReviewFilter(word) : true;
            activeElementWasHidden ||= !isVisible && row.contains(document.activeElement);
            row.hidden = !isVisible;
            hasVisibleRows ||= isVisible;
        });

        section.hidden = !hasVisibleRows;
    });

    if (activeElementWasHidden) {
        elements.nextOpenButton.focus({ preventScroll: true });
    }
}

function setActiveFilter(filter) {
    if (!REVIEW_FILTERS.has(filter)) {
        return;
    }

    activeFilter = filter;
    saveReviewFilter();
    updateSummary(currentWords);
    updateReadiness(currentWords);
    updateFilterControls(currentWords);
    applyReviewFilter();
}

function goToNextOpenWord() {
    const targetFilter = activeFilter === 'mine' ? 'mine' : 'open';
    const nextOpenWord = currentWords.find((word) => matchesReviewFilter(word, targetFilter));

    if (!nextOpenWord) {
        setReviewStatus(
            targetFilter === 'mine'
                ? `Alle ord er gjennomgått av ${OWNER_LABELS[activeReviewer]}.`
                : 'Alle ord er markert, signert av begge og flaggede ord har forslag.',
            'success'
        );
        return;
    }

    setActiveFilter(targetFilter);
    requestAnimationFrame(() => {
        const row = document.querySelector(`[data-month-day="${nextOpenWord.monthDay}"]`);
        row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        row?.classList.add('review-word-row--focus');
        row?.querySelector('input')?.focus({ preventScroll: true });
        window.setTimeout(() => row?.classList.remove('review-word-row--focus'), 1600);
    });
}

function exportReview(words) {
    const reviewedAt = new Date().toISOString();
    const stats = getReviewStats(words);
    const payload = words.map((word) => {
        const review = reviewState[word.monthDay] || {};

        return {
            ...word,
            review: {
                status: '',
                suggestedWord: '',
                note: '',
                ...review,
                reviewers: normalizeReviewers(review.reviewers)
            }
        };
    });
    const blob = new Blob([JSON.stringify({ reviewedAt, stats, words: payload }, null, 2)], {
        type: 'application/json'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `skriblerne-ordgjennomgang-${reviewedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
}

async function handleImportSelected(event) {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }

    try {
        const payload = JSON.parse(await file.text());
        const result = importReviewPayload(payload, currentWords);

        mergeReviewState(result.reviewState);
        markUnsavedReviewChanges();
        render(currentWords);
        setReviewStatus(
            `${result.reviewed} ${result.reviewed === 1 ? 'markering' : 'markeringer'} importert og flettet fra ${file.name}.`,
            'success'
        );
    } catch (error) {
        console.error(error);
        setReviewStatus(error.message || 'Kunne ikke importere gjennomgangen.', 'error');
    } finally {
        event.target.value = '';
    }
}

function importReviewPayload(payload, words, options = {}) {
    if (!Array.isArray(words) || words.length === 0) {
        throw new Error('Ordlisten må være lastet før import.');
    }

    const exportedWords = Array.isArray(payload?.words)
        ? payload.words
        : Array.isArray(payload)
            ? payload
            : null;
    const reviewEntries = payload?.reviewState && typeof payload.reviewState === 'object'
        ? Object.entries(payload.reviewState).map(([monthDay, review]) => ({ monthDay, review }))
        : null;
    const sourceWords = exportedWords || reviewEntries;

    if (!sourceWords) {
        throw new Error('Filen er ikke en gyldig Skriblerne-gjennomgang.');
    }

    const validDates = new Set(words.map((word) => word.monthDay));
    const nextState = {};
    let matched = 0;
    let reviewed = 0;

    sourceWords.forEach((word) => {
        if (!word || !validDates.has(word.monthDay)) {
            return;
        }

        const review = sanitizeReview(word.review || word);
        matched += 1;

        if (review.status || review.suggestedWord || review.note || hasAnyReviewer(review)) {
            nextState[word.monthDay] = review;
            reviewed += 1;
        }
    });

    if (matched === 0 && !options.allowEmpty) {
        throw new Error('Filen inneholder ingen datoer som finnes i ordlisten.');
    }

    return { reviewState: nextState, reviewed };
}

function sanitizeReview(review) {
    const status = ['approved', 'flagged'].includes(review?.status) ? review.status : '';
    const suggestedWord = String(review?.suggestedWord || '').trim();
    const note = String(review?.note || '').trim();
    const reviewers = normalizeReviewers(review?.reviewers);

    return { status, suggestedWord, note, reviewers };
}

function hasAnyReviewer(review) {
    return REQUIRED_REVIEWERS.some((reviewer) => review.reviewers?.[reviewer]);
}

elements.identityButtons.forEach((button) => {
    button.addEventListener('click', () => switchReviewer(button.dataset.identity));
});
elements.firstPassButton.addEventListener('click', applyFirstPassCandidates);
elements.loadSharedButton.addEventListener('click', loadSharedReviewState);
elements.saveSharedButton.addEventListener('click', saveSharedReviewState);
elements.importButton.addEventListener('click', () => elements.importInput.click());
elements.importInput.addEventListener('change', handleImportSelected);
elements.nextOpenButton.addEventListener('click', goToNextOpenWord);
elements.filterButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveFilter(button.dataset.reviewFilter));
});
elements.sharedReviewCodeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const code = elements.sharedReviewCodeInput.value.trim();
    if (!code) {
        elements.sharedReviewCodeMessage.textContent = 'Skriv inn kode.';
        return;
    }
    resolveSharedReviewCode(code);
});
elements.cancelSharedReviewCodeButton.addEventListener('click', () => resolveSharedReviewCode(null));
elements.sharedReviewCodeDialog.addEventListener('click', (event) => {
    if (event.target === elements.sharedReviewCodeDialog) {
        resolveSharedReviewCode(null);
    }
});

fetchWords()
    .then(initializeWordReview)
    .catch((error) => {
        console.error(error);
        elements.summary.textContent = error.message;
    });
