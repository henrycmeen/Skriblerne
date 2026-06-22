const { DAYS_IN_MONTH, WORD_CYCLE } = require('../data/wordCycle');

const errors = [];
const expectedDays = DAYS_IN_MONTH.reduce((sum, days) => sum + days, 0);

if (WORD_CYCLE.length !== expectedDays) {
    errors.push(`Expected ${expectedDays} words, got ${WORD_CYCLE.length}`);
}

const monthDays = new Set();
const words = new Set();

WORD_CYCLE.forEach((entry, index) => {
    if (entry.dayOfYear !== index + 1) {
        errors.push(`Expected dayOfYear ${index + 1}, got ${entry.dayOfYear}`);
    }

    if (monthDays.has(entry.monthDay)) {
        errors.push(`Duplicate date ${entry.monthDay}`);
    }
    monthDays.add(entry.monthDay);

    const normalizedWord = entry.word.toLocaleLowerCase('nb-NO');
    if (words.has(normalizedWord)) {
        errors.push(`Duplicate word ${entry.word}`);
    }
    words.add(normalizedWord);
});

if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
}

console.log(`Validated ${WORD_CYCLE.length} fixed words.`);
