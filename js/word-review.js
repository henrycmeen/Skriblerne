import { API_BASE_URL } from './config.js';

const REVIEW_STORAGE_KEY = 'skriblerne-word-review-v1';

const monthFormatter = new Intl.DateTimeFormat('nb-NO', { month: 'long' });
const reviewState = loadReviewState();
let currentWords = [];

const elements = {
    months: document.getElementById('reviewMonths'),
    summary: document.getElementById('reviewSummary'),
    exportButton: document.getElementById('exportReviewButton')
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

async function fetchWords() {
    const response = await fetch(`${API_BASE_URL}/api/words`, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error('Kunne ikke hente ordlisten.');
    }
    return response.json();
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
    elements.exportButton.disabled = false;
    elements.exportButton.addEventListener('click', () => exportReview(words));
}

function renderWordRow(entry) {
    const review = reviewState[entry.monthDay] || {};
    const row = document.createElement('article');
    row.className = 'review-word-row';

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
    elements.summary.textContent = [
        `${stats.reviewed} av ${words.length} ord er markert.`,
        `${stats.flagged} ord er merket for ny vurdering.`,
        `${stats.suggested} ${stats.suggested === 1 ? 'nytt ord er' : 'nye ord er'} foreslått.`,
        stats.duplicateCount > 0
            ? `${stats.duplicateCount} ${stats.duplicateCount === 1 ? 'duplikat må' : 'duplikater må'} løses.`
            : 'Ingen duplikater i forslagene.'
    ].join(' ');
}

function getReviewStats(words) {
    const finalWords = new Map();
    let reviewed = 0;
    let flagged = 0;
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

    return { duplicateCount, flagged, reviewed, suggested };
}

function normalizeWord(word) {
    return String(word || '').trim().toLocaleLowerCase('nb-NO');
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

fetchWords()
    .then(render)
    .catch((error) => {
        console.error(error);
        elements.summary.textContent = error.message;
    });
