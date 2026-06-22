const fs = require('fs');
const path = require('path');
const { DAYS_IN_MONTH, MONTH_WORDS, WORD_CYCLE } = require('../data/wordCycle');

const WORD_CYCLE_PATH = path.join(__dirname, '..', 'data', 'wordCycle.js');
const VALID_STATUSES = new Set(['approved', 'flagged']);

function usage() {
    console.log([
        'Usage: node scripts/applyWordReview.js <review.json> [--output <path> | --write]',
        '',
        'Validates a Skriblerne word-review export and builds an updated 365-word cycle.',
        'By default this only checks the file and prints a summary.',
        '',
        'Options:',
        '  --output <path>  Write generated wordCycle.js to a separate file.',
        '  --write          Replace data/wordCycle.js in-place.'
    ].join('\n'));
}

function parseArgs(argv) {
    const args = [...argv];
    const options = {
        reviewPath: null,
        outputPath: null,
        write: false
    };

    while (args.length > 0) {
        const arg = args.shift();
        if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (arg === '--write') {
            options.write = true;
        } else if (arg === '--output') {
            options.outputPath = args.shift();
            if (!options.outputPath || options.outputPath.startsWith('--')) {
                throw new Error('Mangler filsti etter --output.');
            }
        } else if (!arg.startsWith('--') && !options.reviewPath) {
            options.reviewPath = arg;
        } else {
            throw new Error(`Ukjent argument: ${arg}`);
        }
    }

    if (options.outputPath && options.write) {
        throw new Error('Bruk enten --output eller --write, ikke begge.');
    }

    return options;
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

function validateAndBuild(words) {
    const errors = [];
    const reviewByMonthDay = new Map();
    const currentByMonthDay = new Map(WORD_CYCLE.map((entry) => [entry.monthDay, entry]));

    words.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object') {
            errors.push(`Rad ${index + 1} er ikke et ordobjekt.`);
            return;
        }

        if (!currentByMonthDay.has(entry.monthDay)) {
            errors.push(`Ukjent dato i review-fil: ${entry.monthDay || '(mangler dato)'}`);
            return;
        }

        if (reviewByMonthDay.has(entry.monthDay)) {
            errors.push(`Duplikat dato i review-fil: ${entry.monthDay}`);
            return;
        }

        reviewByMonthDay.set(entry.monthDay, entry.review || {});
    });

    WORD_CYCLE.forEach((entry) => {
        if (!reviewByMonthDay.has(entry.monthDay)) {
            errors.push(`Review-filen mangler ${entry.monthDay} (${entry.word}).`);
        }
    });

    const stats = {
        approved: 0,
        flagged: 0,
        replacements: 0,
        reviewed: 0
    };
    const finalWordsByMonthDay = new Map();
    const finalWordsByNormalizedWord = new Map();

    WORD_CYCLE.forEach((entry) => {
        const review = reviewByMonthDay.get(entry.monthDay) || {};
        const status = String(review.status || '').trim();
        const suggestedWord = sanitizeWord(review.suggestedWord);

        if (!VALID_STATUSES.has(status)) {
            errors.push(`${entry.monthDay} (${entry.word}) mangler OK/Se på-status.`);
        } else {
            stats.reviewed += 1;
        }

        if (status === 'approved') {
            stats.approved += 1;
        }

        if (status === 'flagged') {
            stats.flagged += 1;
            if (!suggestedWord) {
                errors.push(`${entry.monthDay} (${entry.word}) er flagget, men mangler nytt ord.`);
            }
        }

        const finalWord = suggestedWord || entry.word;
        const normalizedFinalWord = normalizeWord(finalWord);
        if (!normalizedFinalWord) {
            errors.push(`${entry.monthDay} har tomt sluttord.`);
        }

        if (suggestedWord && normalizeWord(suggestedWord) !== normalizeWord(entry.word)) {
            stats.replacements += 1;
        }

        if (finalWordsByNormalizedWord.has(normalizedFinalWord)) {
            const firstDate = finalWordsByNormalizedWord.get(normalizedFinalWord);
            errors.push(`Duplikat sluttord "${finalWord}" på ${firstDate} og ${entry.monthDay}.`);
        } else {
            finalWordsByNormalizedWord.set(normalizedFinalWord, entry.monthDay);
        }

        finalWordsByMonthDay.set(entry.monthDay, finalWord);
    });

    const nextMonthWords = MONTH_WORDS.map(({ month, words: monthWords }) => ({
        month,
        words: monthWords.map((_word, index) => {
            const monthDay = `${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
            return finalWordsByMonthDay.get(monthDay);
        })
    }));

    validateMonthWords(nextMonthWords, errors);

    return {
        errors,
        nextMonthWords,
        stats
    };
}

function validateMonthWords(monthWords, errors) {
    const monthCount = monthWords.reduce((sum, month) => sum + month.words.length, 0);
    const normalizedWords = new Set();

    if (monthCount !== 365) {
        errors.push(`Ordlisten har ${monthCount} ord, forventet 365.`);
    }

    monthWords.forEach(({ month, words }) => {
        const expectedDays = DAYS_IN_MONTH[month - 1];
        if (words.length !== expectedDays) {
            errors.push(`Måned ${month} har ${words.length} ord, forventet ${expectedDays}.`);
        }

        words.forEach((word) => {
            if (typeof word !== 'string' || !word.trim()) {
                errors.push(`Måned ${month} har et tomt ord.`);
                return;
            }

            if (/[\r\n]/.test(word)) {
                errors.push(`Ordet "${word}" kan ikke inneholde linjeskift.`);
            }

            normalizedWords.add(normalizeWord(word));
        });
    });

    if (normalizedWords.size !== 365) {
        errors.push(`Ordlisten har ${normalizedWords.size} unike ord, forventet 365.`);
    }
}

function quoteWord(word) {
    return `'${word.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function generateWordCycleFile(nextMonthWords) {
    const currentSource = fs.readFileSync(WORD_CYCLE_PATH, 'utf8');
    const suffixStart = currentSource.indexOf('const DAYS_IN_MONTH');
    if (suffixStart === -1) {
        throw new Error('Fant ikke DAYS_IN_MONTH i data/wordCycle.js.');
    }

    const prefix = [
        'const MONTH_WORDS = [',
        ...nextMonthWords.map(({ month, words }) => [
            '    {',
            `        month: ${month},`,
            '        words: [',
            ...words.map((word) => `            ${quoteWord(word)},`),
            '        ]',
            '    },'
        ].join('\n')),
        '];',
        ''
    ].join('\n');

    return `${prefix}${currentSource.slice(suffixStart)}`;
}

function printSummary(stats, destination) {
    console.log([
        `Review validert: ${stats.reviewed}/365 ord markert.`,
        `OK: ${stats.approved}. Se på: ${stats.flagged}. Nye ord: ${stats.replacements}.`,
        destination
            ? `Skrev oppdatert ordsyklus til ${destination}.`
            : 'Ingen filer endret. Bruk --write for å oppdatere data/wordCycle.js eller --output <path> for preview.'
    ].join('\n'));
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        usage();
        return;
    }

    if (!options.reviewPath) {
        usage();
        process.exitCode = 1;
        return;
    }

    const reviewPath = path.resolve(options.reviewPath);
    const words = readReviewExport(reviewPath);
    const result = validateAndBuild(words);

    if (result.errors.length > 0) {
        console.error(result.errors.join('\n'));
        process.exit(1);
    }

    let destination = '';
    if (options.write || options.outputPath) {
        const outputPath = options.write ? WORD_CYCLE_PATH : path.resolve(options.outputPath);
        fs.writeFileSync(outputPath, generateWordCycleFile(result.nextMonthWords));
        destination = outputPath;
    }

    printSummary(result.stats, destination);
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
