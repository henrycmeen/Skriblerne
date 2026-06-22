const fs = require('fs');
const path = require('path');
const { WORD_CYCLE } = require('../data/wordCycle');
const FIRST_PASS_CANDIDATES = require('../data/wordReviewCandidates.json');

function usage() {
    console.log([
        'Usage: node scripts/createFirstPassReview.js [--output <review.json>]',
        '',
        'Builds an importable Skriblerne word-review JSON with first-pass candidates marked as Se på.',
        'Without --output, the JSON is printed to stdout.'
    ].join('\n'));
}

function parseArgs(argv) {
    const options = {
        outputPath: ''
    };
    const args = [...argv];

    while (args.length > 0) {
        const arg = args.shift();
        if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (arg === '--output') {
            options.outputPath = args.shift();
            if (!options.outputPath || options.outputPath.startsWith('--')) {
                throw new Error('Mangler filsti etter --output.');
            }
        } else {
            throw new Error(`Ukjent argument: ${arg}`);
        }
    }

    return options;
}

function validateCandidates() {
    const validDates = new Set(WORD_CYCLE.map((word) => word.monthDay));
    const unknownDates = Object.keys(FIRST_PASS_CANDIDATES).filter((monthDay) => !validDates.has(monthDay));

    if (unknownDates.length > 0) {
        throw new Error(`Ukjente kandidater i første-pass-listen: ${unknownDates.join(', ')}`);
    }
}

function buildFirstPassReview() {
    validateCandidates();
    const reviewedAt = new Date().toISOString();
    const words = WORD_CYCLE.map((word) => {
        const candidate = FIRST_PASS_CANDIDATES[word.monthDay];

        return {
            ...word,
            review: {
                status: candidate ? 'flagged' : '',
                suggestedWord: candidate?.suggestedWord || '',
                note: candidate?.note || '',
                reviewers: {
                    henry: false,
                    ellinor: false
                }
            }
        };
    });

    return {
        reviewedAt,
        source: 'Skriblerne first-pass candidate review',
        stats: {
            candidates: Object.keys(FIRST_PASS_CANDIDATES).length,
            total: WORD_CYCLE.length
        },
        words
    };
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        usage();
        return;
    }

    const payload = buildFirstPassReview();
    const json = `${JSON.stringify(payload, null, 2)}\n`;

    if (options.outputPath) {
        const outputPath = path.resolve(options.outputPath);
        fs.writeFileSync(outputPath, json);
        console.log(`Skrev første-pass gjennomgang til ${outputPath}`);
        return;
    }

    process.stdout.write(json);
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
