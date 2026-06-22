import { API_BASE_URL } from './config.js';

const REVIEW_STORAGE_KEY = 'skriblerne-word-review-v1';
const REVIEW_FILTER_STORAGE_KEY = 'skriblerne-word-review-filter-v1';
const REVIEW_FILTERS = new Set(['all', 'open', 'flagged', 'suggested']);

const monthFormatter = new Intl.DateTimeFormat('nb-NO', { month: 'long' });
const reviewState = loadReviewState();
let activeFilter = loadReviewFilter();
let firstPassCandidates = null;
let currentWords = [];

const elements = {
    months: document.getElementById('reviewMonths'),
    summary: document.getElementById('reviewSummary'),
    readiness: document.getElementById('reviewReadiness'),
    status: document.getElementById('reviewStatus'),
    firstPassButton: document.getElementById('firstPassButton'),
    importButton: document.getElementById('importReviewButton'),
    importInput: document.getElementById('importReviewInput'),
    exportButton: document.getElementById('exportReviewButton'),
    filterButtons: Array.from(document.querySelectorAll('[data-review-filter]')),
    nextOpenButton: document.getElementById('nextOpenButton')
};

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

function replaceReviewState(nextState) {
    Object.keys(reviewState).forEach((key) => {
        delete reviewState[key];
    });
    Object.assign(reviewState, nextState);
    saveReviewState();
}

function mergeReviewState(nextState) {
    Object.assign(reviewState, nextState);
    saveReviewState();
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
    applyReviewFilter();
    elements.firstPassButton.disabled = false;
    elements.importButton.disabled = false;
    elements.exportButton.disabled = false;
    elements.nextOpenButton.disabled = false;
    elements.exportButton.onclick = () => exportReview(words);
}

function renderWordRow(entry) {
    const review = reviewState[entry.monthDay] || {};
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

    approvedInput.addEventListener('change', (event) => {
        if (event.target.checked) {
            flaggedInput.checked = false;
        }
        reviewState[entry.monthDay] = {
            ...reviewState[entry.monthDay],
            status: event.target.checked ? 'approved' : ''
        };
        saveReviewState();
        updateSummary(currentWords);
        updateReadiness(currentWords);
        updateFilterControls(currentWords);
        applyReviewFilter();
    });

    flaggedInput.addEventListener('change', (event) => {
        if (event.target.checked) {
            approvedInput.checked = false;
        }
        reviewState[entry.monthDay] = {
            ...reviewState[entry.monthDay],
            status: event.target.checked ? 'flagged' : ''
        };
        saveReviewState();
        updateSummary(currentWords);
        updateReadiness(currentWords);
        updateFilterControls(currentWords);
        applyReviewFilter();
    });

    const suggestedWord = document.createElement('input');
    suggestedWord.className = 'review-suggested-word';
    suggestedWord.type = 'text';
    suggestedWord.placeholder = 'Nytt ord';
    suggestedWord.value = review.suggestedWord || '';
    suggestedWord.setAttribute('aria-label', `Nytt ord for ${entry.word}`);
    suggestedWord.addEventListener('input', (event) => {
        reviewState[entry.monthDay] = {
            ...reviewState[entry.monthDay],
            suggestedWord: event.target.value
        };
        saveReviewState();
        updateSummary(currentWords);
        updateReadiness(currentWords);
        updateFilterControls(currentWords);
        applyReviewFilter();
    });

    const note = document.createElement('input');
    note.className = 'review-note';
    note.type = 'text';
    note.placeholder = 'Forslag eller kommentar';
    note.value = review.note || '';
    note.setAttribute('aria-label', `Forslag eller kommentar til ${entry.word}`);
    note.addEventListener('input', (event) => {
        reviewState[entry.monthDay] = {
            ...reviewState[entry.monthDay],
            note: event.target.value
        };
        saveReviewState();
    });

    controls.append(approvedLabel, flaggedLabel, suggestedWord, note);
    row.append(heading, controls);
    return row;
}

function updateSummary(words) {
    const stats = getReviewStats(words);
    const filteredCount = countFilteredWords(words);
    elements.summary.textContent = [
        `${stats.reviewed} av ${words.length} ord er markert.`,
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
        flagged: `Se på ${stats.flagged}`,
        suggested: `Forslag ${stats.suggested}`
    };

    elements.filterButtons.forEach((button) => {
        const isActive = button.dataset.reviewFilter === activeFilter;
        button.textContent = labels[button.dataset.reviewFilter] || button.textContent;
        button.classList.toggle('review-filter-button--active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
}

function setReviewStatus(message, tone = 'neutral') {
    elements.status.textContent = message;
    elements.status.dataset.tone = tone;
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
                note: candidate.note || ''
            };
            applied += 1;
        });

        if (applied === 0) {
            setReviewStatus('Ingen nye første-pass-kandidater å legge til.', 'neutral');
            return;
        }

        mergeReviewState(nextState);
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

    words.forEach((word) => {
        const review = reviewState[word.monthDay] || {};
        const suggestedWord = normalizeWord(review.suggestedWord);
        const originalWord = normalizeWord(word.word);
        const finalWord = suggestedWord || originalWord;

        if (review.status) {
            reviewed += 1;
        }
        if (!review.status || (review.status === 'flagged' && !suggestedWord)) {
            open += 1;
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
        open,
        reviewed,
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
        return !review.status || (review.status === 'flagged' && !suggestedWord);
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

    document.querySelectorAll('.review-month').forEach((section) => {
        let hasVisibleRows = false;

        section.querySelectorAll('.review-word-row').forEach((row) => {
            const word = wordsByMonthDay.get(row.dataset.monthDay);
            const isVisible = word ? matchesReviewFilter(word) : true;
            row.hidden = !isVisible;
            hasVisibleRows ||= isVisible;
        });

        section.hidden = !hasVisibleRows;
    });
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
    const nextOpenWord = currentWords.find((word) => matchesReviewFilter(word, 'open'));

    if (!nextOpenWord) {
        setReviewStatus('Alle ord er markert og flaggede ord har forslag.', 'success');
        return;
    }

    setActiveFilter('open');
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
    const payload = words.map((word) => ({
        ...word,
        review: {
            status: '',
            suggestedWord: '',
            note: '',
            ...(reviewState[word.monthDay] || {})
        }
    }));
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

        replaceReviewState(result.reviewState);
        render(currentWords);
        setReviewStatus(
            `${result.reviewed} ${result.reviewed === 1 ? 'markering' : 'markeringer'} importert fra ${file.name}.`,
            'success'
        );
    } catch (error) {
        console.error(error);
        setReviewStatus(error.message || 'Kunne ikke importere gjennomgangen.', 'error');
    } finally {
        event.target.value = '';
    }
}

function importReviewPayload(payload, words) {
    if (!Array.isArray(words) || words.length === 0) {
        throw new Error('Ordlisten må være lastet før import.');
    }

    const exportedWords = Array.isArray(payload?.words)
        ? payload.words
        : Array.isArray(payload)
            ? payload
            : null;

    if (!exportedWords) {
        throw new Error('Filen er ikke en gyldig Skriblerne-gjennomgang.');
    }

    const validDates = new Set(words.map((word) => word.monthDay));
    const nextState = {};
    let matched = 0;
    let reviewed = 0;

    exportedWords.forEach((word) => {
        if (!word || !validDates.has(word.monthDay)) {
            return;
        }

        const review = sanitizeReview(word.review || word);
        matched += 1;

        if (review.status || review.suggestedWord || review.note) {
            nextState[word.monthDay] = review;
            reviewed += 1;
        }
    });

    if (matched === 0) {
        throw new Error('Filen inneholder ingen datoer som finnes i ordlisten.');
    }

    return { reviewState: nextState, reviewed };
}

function sanitizeReview(review) {
    const status = ['approved', 'flagged'].includes(review?.status) ? review.status : '';
    const suggestedWord = String(review?.suggestedWord || '').trim();
    const note = String(review?.note || '').trim();

    return { status, suggestedWord, note };
}

elements.firstPassButton.addEventListener('click', applyFirstPassCandidates);
elements.importButton.addEventListener('click', () => elements.importInput.click());
elements.importInput.addEventListener('change', handleImportSelected);
elements.nextOpenButton.addEventListener('click', goToNextOpenWord);
elements.filterButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveFilter(button.dataset.reviewFilter));
});

fetchWords()
    .then(render)
    .catch((error) => {
        console.error(error);
        elements.summary.textContent = error.message;
    });
