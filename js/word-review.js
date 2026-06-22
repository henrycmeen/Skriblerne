import { API_BASE_URL } from './config.js';

const REVIEW_STORAGE_KEY = 'skriblerne-word-review-v1';

const monthFormatter = new Intl.DateTimeFormat('nb-NO', { month: 'long' });
const reviewState = loadReviewState();

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
    const response = await fetch(`${API_BASE_URL}/api/words`);
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
        updateSummaryFromDom();
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
        updateSummaryFromDom();
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

    controls.append(approvedLabel, flaggedLabel, note);
    row.append(heading, controls);
    return row;
}

function updateSummary(words) {
    const reviewed = words.filter((word) => reviewState[word.monthDay]?.status).length;
    const flagged = words.filter((word) => reviewState[word.monthDay]?.status === 'flagged').length;
    elements.summary.textContent = `${reviewed} av ${words.length} ord er markert. ${flagged} ord er merket for ny vurdering.`;
}

function updateSummaryFromDom() {
    const rows = Array.from(document.querySelectorAll('.review-word-row'));
    const reviewed = rows.filter((row) => row.querySelector('input[type="checkbox"]:checked')).length;
    const flagged = rows.filter((row) => row.querySelectorAll('input[type="checkbox"]')[1]?.checked).length;
    elements.summary.textContent = `${reviewed} av ${rows.length} ord er markert. ${flagged} ord er merket for ny vurdering.`;
}

function exportReview(words) {
    const reviewedAt = new Date().toISOString();
    const payload = words.map((word) => ({
        ...word,
        review: reviewState[word.monthDay] || { status: '', note: '' }
    }));
    const blob = new Blob([JSON.stringify({ reviewedAt, words: payload }, null, 2)], {
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
