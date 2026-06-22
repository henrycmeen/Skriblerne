const fs = require('fs');
const path = require('path');
const { WORD_CYCLE } = require('../data/wordCycle');

function usage() {
    console.log('Usage: node scripts/reviewStatus.js <review.json>');
}

function readReviewExport(reviewPath) {
    const payload = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
    const words = Array.isArray(payload?.words)
        ? payload.words
        : Array.isArray(payload)
            ? payload
            : null;

    if (!words) {
        throw new Error('Filen er ikke en gyldig Skriblerne-gjennomgang.');
    }

    return words;
}

function normalizeWord(word) {
    return String(word || '').trim().toLocaleLowerCase('nb-NO');
}

function sanitizeWord(word) {
    return String(word || '').trim().replace(/\s+/g, ' ');
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
        missingStatus: 0,
        replacements: 0,
        reviewed: 0,
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

function printStatus(status) {
    const { stats, total } = status;
    const open = total - stats.reviewed + stats.flaggedWithoutSuggestion;

    console.log([
        `Markert: ${stats.reviewed}/${total}`,
        `OK: ${stats.approved}`,
        `Se på: ${stats.flagged}`,
        `Forslag: ${stats.replacements}`,
        `Uavklarte: ${open}`,
        `Duplikater: ${stats.duplicateFinalWords}`,
        `Klar for apply: ${status.ready ? 'ja' : 'nei'}`,
        status.blockers.length > 0 ? `Blokkeringer: ${status.blockers.join(', ')}` : ''
    ].filter(Boolean).join('\n'));
}

function main() {
    const reviewPath = process.argv[2];
    if (!reviewPath || reviewPath === '--help' || reviewPath === '-h') {
        usage();
        process.exitCode = reviewPath ? 0 : 1;
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
