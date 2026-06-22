const fs = require('fs');
const path = require('path');
const { WORD_CYCLE } = require('../data/wordCycle');

const FIRST_PASS_CANDIDATES = {
    '01-18': {
        suggestedWord: 'Istapp',
        note: 'Ispinne kan leses som sommeris. Istapp er mer vinterlig og lett å fotografere eller tegne.'
    },
    '02-12': {
        suggestedWord: 'Rosakinn',
        note: 'Kinn alene er litt flatt som bildeoppgave. Rosakinn passer februarkulde bedre.'
    },
    '02-17': {
        suggestedWord: 'Røde kinn',
        note: 'Rødme er abstrakt. Røde kinn er mer konkret for foto og tegning.'
    },
    '03-26': {
        suggestedWord: 'Bjørkekvast',
        note: 'Kvast kan bety flere ting. Bjørkekvast gjør vårkoblingen tydeligere.'
    },
    '03-28': {
        suggestedWord: 'Vårbilde',
        note: 'Øyeblikk er poetisk, men veldig åpent. Vårbilde gir tydeligere retning.'
    },
    '04-19': {
        suggestedWord: 'Tullebriller',
        note: 'Aprilsnarr er en hendelse mer enn et motiv. Tullebriller holder leken i samme spor.'
    },
    '05-16': {
        suggestedWord: 'Flaggstang',
        note: 'Tog virker litt tilfeldig rett før 17. mai. Flaggstang peker tydeligere mot måneden.'
    },
    '06-08': {
        suggestedWord: 'Solstol',
        note: 'Fluktstol er et litt uvanlig ord. Solstol er enklere og mer direkte.'
    },
    '07-20': {
        suggestedWord: 'Sommerfuglvinge',
        note: 'Dagpåfugløye er fint, men svært spesifikt og vanskelig å finne.'
    },
    '08-25': {
        suggestedWord: 'Skoleplakat',
        note: 'Oppslagstavle er ganske nøytralt. Skoleplakat passer skolestart bedre.'
    },
    '09-12': {
        suggestedWord: 'Høstfarge',
        note: 'Sepia er et teknisk/abstrakt fargeord. Høstfarge er mer tilgjengelig.'
    },
    '09-29': {
        suggestedWord: 'Grønnsakskasse',
        note: 'Kål kan være litt snevert. Grønnsakskasse åpner for flere høstmotiver.'
    },
    '10-04': {
        suggestedWord: 'Tåkeskog',
        note: 'Tåkelur er ikke like relevant for alle. Tåkeskog er mer stemningsfullt og årstidsnært.'
    },
    '10-17': {
        suggestedWord: 'Oransje blad',
        note: 'Oransje er bare en farge. Oransje blad gir et konkret høstmotiv.'
    },
    '10-24': {
        suggestedWord: 'Mørk morgen',
        note: 'Mørketid kan bli geografisk eller abstrakt. Mørk morgen er lettere å bruke overalt.'
    },
    '10-30': {
        suggestedWord: 'Fuglemater',
        note: 'Granmeis er veldig spesifikk og kan være vanskelig å se. Fuglemater beholder fuglesporet.'
    },
    '11-03': {
        suggestedWord: 'Lueknute',
        note: 'Luesnor er litt rart og smalt. Lueknute er mer bildevennlig.'
    },
    '11-17': {
        suggestedWord: 'Blåtime',
        note: 'Mørkeblå er abstrakt. Blåtime er et kjent motiv i mørk november.'
    },
    '11-19': {
        suggestedWord: 'Kjøkkenbord',
        note: 'Stilleben er et voksen/kunstfaglig ord. Kjøkkenbord gir samme rolige motiv på enklere språk.'
    },
    '12-30': {
        suggestedWord: 'Nyttårsglass',
        note: 'Champagneglass blir litt voksent. Nyttårsglass beholder festmotivet uten alkoholsignal.'
    }
};

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
                note: candidate?.note || ''
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
