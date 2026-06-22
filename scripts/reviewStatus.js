const fs = require('fs');
const path = require('path');
const { WORD_CYCLE } = require('../data/wordCycle');
const { buildFirstPassReview } = require('./createFirstPassReview');
const REQUIRED_REVIEWERS = [
    ['henry', 'Henry'],
    ['ellinor', 'Ellinor']
];

function usage() {
    console.log([
        'Usage: node scripts/reviewStatus.js [review.json]',
        '',
        'Without a file path, status is shown for the generated first-pass candidate review.',
        'The file may be a browser export, an array, or the shared { reviewState } API shape.'
    ].join('\n'));
}

function readReviewExport(reviewPath) {
    const payload = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));

    if (Array.isArray(payload?.words)) {
        return payload.words;
    }

    if (Array.isArray(payload)) {
        return payload;
    }

    if (payload?.reviewState && typeof payload.reviewState === 'object') {
        return Object.entries(payload.reviewState).map(([monthDay, review]) => ({ monthDay, review }));
    }

    throw new Error('Filen er ikke en gyldig Skriblerne-gjennomgang.');
}

function normalizeWord(word) {
    return String(word || '').trim().toLocaleLowerCase('nb-NO');
}

function sanitizeWord(word) {
    return String(word || '').trim().replace(/\s+/g, ' ');
}

function normalizeReviewers(reviewers = {}) {
    return Object.fromEntries(
        REQUIRED_REVIEWERS.map(([key]) => [key, Boolean(reviewers?.[key])])
    );
}

function getReview(entry) {
    return entry.review || entry || {};
}

function getReviewStatus(words) {
    const expectedByMonthDay = new Map(WORD_CYCLE.map((word) => [word.monthDay, word]));
    const seenMonthDays = new Set();
    const finalWords = new Map();
    const blockers = [];
    const stats = {
        approved: 0,
        duplicateDates: 0,
        duplicateFinalWords: 0,
        flagged: 0,
        flaggedWithoutSuggestion: 0,
        missingDates: 0,
        missingReviewers: Object.fromEntries(REQUIRED_REVIEWERS.map(([key]) => [key, 0])),
        missingStatus: 0,
        replacements: 0,
        reviewed: 0,
        reviewers: Object.fromEntries(REQUIRED_REVIEWERS.map(([key]) => [key, 0])),
        unknownDates: 0
    };

    words.forEach((entry) => {
        const expected = expectedByMonthDay.get(entry?.monthDay);
        if (!entry || !expected) {
            stats.unknownDates += 1;
            return;
        }

        if (seenMonthDays.has(entry.monthDay)) {
            stats.duplicateDates += 1;
            return;
        }
        seenMonthDays.add(entry.monthDay);

        const review = getReview(entry);
        const status = String(review.status || '').trim();
        const suggestedWord = sanitizeWord(review.suggestedWord);
        const reviewers = normalizeReviewers(review.reviewers);
        const originalWord = expected.word;
        const finalWord = suggestedWord || originalWord;
        const normalizedFinalWord = normalizeWord(finalWord);

        if (status === 'approved') {
            stats.approved += 1;
            stats.reviewed += 1;
        } else if (status === 'flagged') {
            stats.flagged += 1;
            stats.reviewed += 1;
            if (!suggestedWord) {
                stats.flaggedWithoutSuggestion += 1;
            }
        } else {
            stats.missingStatus += 1;
        }

        REQUIRED_REVIEWERS.forEach(([key]) => {
            if (reviewers[key]) {
                stats.reviewers[key] += 1;
            } else {
                stats.missingReviewers[key] += 1;
            }
        });

        if (suggestedWord && normalizeWord(suggestedWord) !== normalizeWord(originalWord)) {
            stats.replacements += 1;
        }

        if (finalWords.has(normalizedFinalWord)) {
            stats.duplicateFinalWords += 1;
        } else {
            finalWords.set(normalizedFinalWord, entry.monthDay);
        }
    });

    WORD_CYCLE.forEach((word) => {
        if (!seenMonthDays.has(word.monthDay)) {
            stats.missingDates += 1;
        }
    });

    if (stats.missingDates > 0) {
        blockers.push(`${stats.missingDates} manglende datoer`);
    }
    if (stats.unknownDates > 0) {
        blockers.push(`${stats.unknownDates} ukjente datoer`);
    }
    if (stats.duplicateDates > 0) {
        blockers.push(`${stats.duplicateDates} duplikate datoer`);
    }
    if (stats.missingStatus > 0) {
        blockers.push(`${stats.missingStatus} ord uten status`);
    }
    if (stats.flaggedWithoutSuggestion > 0) {
        blockers.push(`${stats.flaggedWithoutSuggestion} Se på-ord uten nytt ord`);
    }
    REQUIRED_REVIEWERS.forEach(([key, label]) => {
        if (stats.missingReviewers[key] > 0) {
            blockers.push(`${stats.missingReviewers[key]} mangler ${label}-gjennomgang`);
        }
    });
    if (stats.duplicateFinalWords > 0) {
        blockers.push(`${stats.duplicateFinalWords} duplikate sluttord`);
    }

    return {
        blockers,
        ready: blockers.length === 0 && stats.reviewed === WORD_CYCLE.length,
        stats,
        total: WORD_CYCLE.length
    };
}

function printStatus(status, sourceLabel = '') {
    const { stats, total } = status;
    const open = total - stats.reviewed + stats.flaggedWithoutSuggestion;

    console.log([
        sourceLabel ? `Kilde: ${sourceLabel}` : '',
        `Markert: ${stats.reviewed}/${total}`,
        `OK: ${stats.approved}`,
        `Se på: ${stats.flagged}`,
        `Forslag: ${stats.replacements}`,
        ...REQUIRED_REVIEWERS.map(([key, label]) => `${label}: ${stats.reviewers[key]}/${total}`),
        `Uavklarte: ${open}`,
        `Duplikater: ${stats.duplicateFinalWords}`,
        `Klar for apply: ${status.ready ? 'ja' : 'nei'}`,
        status.blockers.length > 0 ? `Blokkeringer: ${status.blockers.join(', ')}` : ''
    ].filter(Boolean).join('\n'));
}

function main() {
    const reviewPath = process.argv[2];
    if (reviewPath === '--help' || reviewPath === '-h') {
        usage();
        return;
    }

    if (!reviewPath) {
        const firstPassReview = buildFirstPassReview();
        printStatus(getReviewStatus(firstPassReview.words), 'første-pass kandidatliste');
        return;
    }

    const words = readReviewExport(path.resolve(reviewPath));
    printStatus(getReviewStatus(words));
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
