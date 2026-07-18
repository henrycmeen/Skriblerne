const {
    DAYS_IN_MONTH,
    WORD_CYCLE,
    getMonthDayFromDate,
    getWordForMonthDay,
    isFutureCycleDate,
    isValidMonthDay,
    normalizeCycleMonthDay
} = require('../data/wordCycle');

const errors = [];
const expectedDays = DAYS_IN_MONTH.reduce((sum, days) => sum + days, 0);

if (WORD_CYCLE.length !== expectedDays) {
    errors.push(`Expected ${expectedDays} words, got ${WORD_CYCLE.length}`);
}

const monthDays = new Set();
let assignedWords = 0;
let emptyWords = 0;

WORD_CYCLE.forEach((entry, index) => {
    if (entry.dayOfYear !== index + 1) {
        errors.push(`Expected dayOfYear ${index + 1}, got ${entry.dayOfYear}`);
    }

    if (monthDays.has(entry.monthDay)) {
        errors.push(`Duplicate date ${entry.monthDay}`);
    }
    monthDays.add(entry.monthDay);

    if (typeof entry.word !== 'string') {
        errors.push(`Expected ${entry.monthDay} word to be a string`);
    } else if (entry.word === '') {
        emptyWords += 1;
    } else {
        assignedWords += 1;
    }
});

if (assignedWords !== 130 || emptyWords !== 235) {
    errors.push(`Expected 130 assigned and 235 empty words, got ${assignedWords} assigned and ${emptyWords} empty`);
}

if (normalizeCycleMonthDay('02-29') !== '02-28') {
    errors.push('Expected 02-29 to normalize to 02-28 in the 365-day cycle');
}

if (getMonthDayFromDate(new Date(2028, 1, 29)) !== '02-28') {
    errors.push('Expected leap day Date to resolve to 02-28 in the 365-day cycle');
}

if (!getWordForMonthDay('02-28')) {
    errors.push('Expected 02-28 to have a word');
}

if (isValidMonthDay('02-29')) {
    errors.push('Expected explicit 02-29 to remain outside the stored 365-date cycle');
}

if (!isFutureCycleDate(2026, '06-23', new Date(2026, 5, 22))) {
    errors.push('Expected 2026-06-23 to be future when today is 2026-06-22');
}

if (isFutureCycleDate(2026, '06-22', new Date(2026, 5, 22))) {
    errors.push('Expected today to be uploadable');
}

if (isFutureCycleDate(2025, '12-31', new Date(2026, 5, 22))) {
    errors.push('Expected previous years to stay uploadable');
}

if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
}

console.log(`Validated ${WORD_CYCLE.length} fixed dates with ${assignedWords} assigned words.`);
