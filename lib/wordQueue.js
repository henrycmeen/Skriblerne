const SEQUENCE_START_DATE = '2026-06-22';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function dateParts(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return {
        day: date.getDate(),
        month: date.getMonth() + 1,
        year: date.getFullYear()
    };
}

function parseDateKey(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        return null;
    }

    return {
        day: Number(match[3]),
        month: Number(match[2]),
        year: Number(match[1])
    };
}

function utcDay({ year, month, day }) {
    return Date.UTC(year, month - 1, day);
}

function sequenceDayForDate(value, startDate = SEQUENCE_START_DATE) {
    const current = dateParts(value);
    const start = parseDateKey(startDate);
    if (!current || !start) {
        return null;
    }

    return Math.floor((utcDay(current) - utcDay(start)) / DAY_IN_MS) + 1;
}

function sequenceDateForDay(dayOfYear, startDate = SEQUENCE_START_DATE) {
    if (!Number.isInteger(dayOfYear) || dayOfYear < 1) {
        return null;
    }

    const start = parseDateKey(startDate);
    if (!start) {
        return null;
    }

    const date = new Date(utcDay(start) + (dayOfYear - 1) * DAY_IN_MS);
    return date.toISOString().slice(0, 10);
}

function mergeStoredWords(wordCycle = [], storedWords = []) {
    const storedByMonthDay = new Map(
        storedWords.map((entry) => [entry.monthDay, entry])
    );

    return wordCycle.map((entry) => {
        const stored = storedByMonthDay.get(entry.monthDay);
        const storedWord = typeof stored?.word === 'string' ? stored.word.trim() : '';

        return {
            ...entry,
            word: entry.word || storedWord
        };
    });
}

function findNextOpenWord(wordCycle = []) {
    return wordCycle.find((entry) => !entry.word?.trim()) || null;
}

function getWordForSequenceDate(wordCycle = [], value = new Date()) {
    const dayOfYear = sequenceDayForDate(value);
    if (!dayOfYear || dayOfYear > wordCycle.length) {
        return null;
    }

    const word = wordCycle[dayOfYear - 1];
    return word?.word?.trim() ? word : null;
}

function normalizeNewWord(value) {
    const word = typeof value === 'string'
        ? value.trim().replace(/\s+/g, ' ')
        : '';

    if (!word) {
        throw new Error('Skriv inn et ord.');
    }

    if (word.length > 80) {
        throw new Error('Ordet kan være maks 80 tegn.');
    }

    return word;
}

function hasWord(wordCycle = [], candidate = '') {
    const normalizedCandidate = candidate.toLocaleLowerCase('nb-NO');
    return wordCycle.some((entry) =>
        entry.word?.trim().toLocaleLowerCase('nb-NO') === normalizedCandidate
    );
}

function additionError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

async function addNextWord({ rawWord, wordCycle = [], saveWord }) {
    const word = normalizeNewWord(rawWord);

    if (hasWord(wordCycle, word)) {
        throw additionError('Dette ordet finnes allerede.', 400);
    }

    const nextWord = findNextOpenWord(wordCycle);
    if (!nextWord) {
        throw additionError('Ordlisten er full.', 409);
    }

    const saved = await saveWord(nextWord, word);
    if (!saved) {
        throw additionError('Ordlisten ble nettopp endret. Prøv igjen.', 409);
    }

    return {
        ...nextWord,
        word,
        date: sequenceDateForDay(nextWord.dayOfYear)
    };
}

module.exports = {
    SEQUENCE_START_DATE,
    addNextWord,
    findNextOpenWord,
    getWordForSequenceDate,
    hasWord,
    mergeStoredWords,
    normalizeNewWord,
    sequenceDateForDay,
    sequenceDayForDate
};
