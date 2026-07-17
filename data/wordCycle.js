const LEGACY_WORDS_BY_DAY = require('../ordbank.json').days;
const DUPLICATE_WORD_REPLACEMENTS = {
    Hengekøye: 'Hagestol',
    Forglemmegei: 'Syrin',
    Markjordbær: 'Iskrem',
    Blomsterkrans: 'Solglimt',
    Skjell: 'Seilbåt',
    Fyrtårn: 'Kompass',
    Blåskjell: 'Sjøbris',
    Solnedgang: 'Regnbue',
    Telt: 'Kart',
    Solsikke: 'Kritt',
    Sopp: 'Kurv',
    Elg: 'Tåke',
    Stearinlys: 'Vedkubbe'
};

const BASE_MONTH_WORDS = [
    {
        month: 1,
        words: [
            'Snøfnugg',
            'Kakao',
            'Votter',
            'Islykt',
            'Peis',
            'Skøyter',
            'Frost',
            'Ullsokker',
            'Måne',
            'Kongle',
            'Vinterfugl',
            'Ski',
            'Hytte',
            'Snømann',
            'Stjernehimmel',
            'Nordlys',
            'Lue',
            'Ispinne',
            'Spor',
            'Fjell',
            'Klementin',
            'Vedkubbe',
            'Snøhule',
            'Krystall',
            'Termos',
            'Granbar',
            'Akebrett',
            'Tåke',
            'Solglimt',
            'Vinterrose',
            'Kalender'
        ]
    },
    {
        month: 2,
        words: [
            'Hjerte',
            'Fastelavn',
            'Maske',
            'Tulipan',
            'Svaner',
            'Snøklokke',
            'Brev',
            'Lyktestolpe',
            'Semle',
            'Skjerf',
            'Isbjørn',
            'Kinn',
            'Karneval',
            'Kjærlighet',
            'Vinterferie',
            'Kamera',
            'Rødme',
            'Skissebok',
            'Bål',
            'Appelsin',
            'Løype',
            'Fjær',
            'Fargeblyant',
            'Vaffel',
            'Smil',
            'Vennskap',
            'Snøengel',
            'Februarlys'
        ]
    },
    {
        month: 3,
        words: [
            'Spire',
            'Regndråpe',
            'Krokus',
            'Vårvind',
            'Sykkel',
            'Fuglesang',
            'Sølepytt',
            'Gummistøvel',
            'Frø',
            'Vinduskarm',
            'Gåsunge',
            'Hestehov',
            'Nøkkel',
            'Brostein',
            'Paraply',
            'Bokmerke',
            'Grønnskjær',
            'Kaffekopp',
            'Solflekk',
            'Knopp',
            'Vårjakke',
            'Fuglerede',
            'Sti',
            'Plantepotte',
            'Frimerke',
            'Kvast',
            'Sky',
            'Øyeblikk',
            'Marsmorgen',
            'Hagehanske',
            'Vårtegn'
        ]
    },
    {
        month: 4,
        words: [
            'Påskeegg',
            'Kvist',
            'Lam',
            'Hare',
            'Fjærpynt',
            'Gulrot',
            'Kurv',
            'Bjørk',
            'Regnbue',
            'Fuglekasse',
            'Løvetann',
            'Bekk',
            'Gjerde',
            'Kompass',
            'Blyant',
            'Kart',
            'Sneglehus',
            'Blåveis',
            'Aprilsnarr',
            'Seilbåt',
            'Trekrone',
            'Drage',
            'Leirjord',
            'Hagestol',
            'Rabarbra',
            'Maur',
            'Vårsol',
            'Stein',
            'Frøpose',
            'Aprilhimmel'
        ]
    },
    {
        month: 5,
        words: [
            'Flagg',
            'Bunad',
            'Syrin',
            'Bjørkeblad',
            'Humle',
            'Sommerfugl',
            'Sjøbris',
            'Iskrem',
            'Kritt',
            'Terrasse',
            'Markblomst',
            'Grøftekant',
            'Jordbærplante',
            'Rødstrupe',
            'Hengekøye',
            'Tog',
            'Tromme',
            'Sløyfe',
            'Bålpanne',
            'Solbriller',
            'Eng',
            'Pinnsvin',
            'Lavvo',
            'Badebrygge',
            'Løvetak',
            'Gressklipper',
            'Piknik',
            'Maikveld',
            'Forglemmegei',
            'Sykkelkurv',
            'Vannkanne'
        ]
    },
    {
        month: 6,
        words: [
            'Midnattssol',
            'Sommerregn',
            'Markjordbær',
            'Badedrakt',
            'Krabbe',
            'Sandal',
            'Solhatt',
            'Fluktstol',
            'Båt',
            'Brygge',
            'Måke',
            'Tang',
            'Strandstein',
            'Grill',
            'Blomsterkrans',
            'Jordbær',
            'Rabarbrapai',
            'Mygg',
            'Skjell',
            'Badehåndkle',
            'Sankthansbål',
            'Hagebord',
            'Erteblomst',
            'Sommerkveld',
            'Lupin',
            'Lavendel',
            'Fiskestang',
            'Vannmelon',
            'Lysthus',
            'Sommernatt'
        ]
    },
    {
        month: 7,
        words: [
            'Solkrem',
            'Badeball',
            'Isbit',
            'Svaberg',
            'Fyrtårn',
            'Kajakk',
            'Hengekøyetur',
            'Blåskjell',
            'Strandstol',
            'Ferjekø',
            'Postkort',
            'Solnedgang',
            'Kråkebolle',
            'Markise',
            'Bringebær',
            'Blåbær',
            'Gresshoppe',
            'Seil',
            'Badeand',
            'Dagpåfugløye',
            'Parasoll',
            'Nistesmørbrød',
            'Fjellbekk',
            'Myrull',
            'Molte',
            'Telt',
            'Bålkaffe',
            'Hagefest',
            'Limonade',
            'Jordbærkurv',
            'Havbris'
        ]
    },
    {
        month: 8,
        words: [
            'Kornåker',
            'Rips',
            'Solsikke',
            'Skolesekk',
            'Blyantspisser',
            'Eplekart',
            'Sensommer',
            'Regnjakke',
            'Krabbeskall',
            'Syltetøy',
            'Fiskegarn',
            'Kveldsbad',
            'Høsttegn',
            'Bokbind',
            'Plomme',
            'Kantarell',
            'Bærspann',
            'Marked',
            'Havre',
            'Tyttebær',
            'Fjærsky',
            'Kveldssol',
            'Traktor',
            'Matpakke',
            'Oppslagstavle',
            'Krittstrek',
            'Soppkurv',
            'Eplehage',
            'Augustlys',
            'Utescene',
            'Kornband'
        ]
    },
    {
        month: 9,
        words: [
            'Eple',
            'Lønneblad',
            'Regnskur',
            'Regnbukse',
            'Skrivebok',
            'Rognebær',
            'Sopp',
            'Flettkurv',
            'Ullgenser',
            'Bokhylle',
            'Pennal',
            'Sepia',
            'Høstvind',
            'Nøtter',
            'Kastanje',
            'Lanterne',
            'Telys',
            'Kanelbolle',
            'Togstasjon',
            'Elg',
            'Fjellstøvel',
            'Sopptur',
            'Fluesopp',
            'Høstløv',
            'Bibliotek',
            'Pære',
            'Regnhette',
            'Septembermorgen',
            'Kål',
            'Skumring'
        ]
    },
    {
        month: 10,
        words: [
            'Gresskar',
            'Eikenøtt',
            'Ullpledd',
            'Tåkelur',
            'Ravn',
            'Lommelykt',
            'Kakaokopp',
            'Halloween',
            'Spøkelse',
            'Kostyme',
            'Stearinlys',
            'Høststorm',
            'Rotgrønnsak',
            'Soppsaus',
            'Kornkrans',
            'Vindkast',
            'Oransje',
            'Skogsbunn',
            'Pannekake',
            'Termokopp',
            'Villsau',
            'Bålplass',
            'Høstferie',
            'Mørketid',
            'Refleks',
            'Gatelys',
            'Eplepai',
            'Kosekrok',
            'Oktobernatt',
            'Granmeis',
            'Løvsti'
        ]
    },
    {
        month: 11,
        words: [
            'Rimfrost',
            'Skjerfeknute',
            'Luesnor',
            'Regnslør',
            'Ullvott',
            'Tekopp',
            'Lesestund',
            'Svarttrost',
            'Lyspære',
            'Novembersky',
            'Pepperkakedeig',
            'Adventsstjerne',
            'Snøvarsel',
            'Varmovn',
            'Ullteppe',
            'Nellik',
            'Mørkeblå',
            'Kjøkkenvindu',
            'Stilleben',
            'Handleliste',
            'Kanelstang',
            'Granlykt',
            'Dørkrans',
            'Førstesnø',
            'Sokkepar',
            'Nattbord',
            'Pledd',
            'Novemberlys',
            'Vintereple',
            'Isroser'
        ]
    },
    {
        month: 12,
        words: [
            'Advent',
            'Kalenderlys',
            'Stjerne',
            'Pepperkake',
            'Nisse',
            'Juletre',
            'Snøkule',
            'Gavebånd',
            'Julekule',
            'Lucialys',
            'Mandarin',
            'Gran',
            'Rødsløyfe',
            'Slede',
            'Bjelle',
            'Julekort',
            'Marsipan',
            'Kakemann',
            'Snøkrystall',
            'Vintermorgen',
            'Lyslenke',
            'Pakke',
            'Reinsdyr',
            'Juleverksted',
            'Kanelduft',
            'Riskrem',
            'Romjul',
            'Nyttårshatt',
            'Fyrverkeri',
            'Champagneglass',
            'Desembernatt'
        ]
    }
];

function normalizeWord(word) {
    return word.toLocaleLowerCase('nb-NO');
}

function restoreLegacyWords(baseMonthWords, legacyWordsByDay) {
    const baseWords = baseMonthWords.flatMap(({ words }) => words);
    const restoredWords = [...baseWords];
    const legacyIndexes = new Set();
    const restoredLegacyWords = new Set();

    Object.entries(legacyWordsByDay).forEach(([day, word]) => {
        const normalizedWord = normalizeWord(word);

        if (restoredLegacyWords.has(normalizedWord)) {
            return;
        }

        const index = Number(day) - 1;
        restoredWords[index] = word;
        legacyIndexes.add(index);
        restoredLegacyWords.add(normalizedWord);
    });

    const usedWords = new Set();
    const duplicateIndexes = [];

    restoredWords.forEach((word, index) => {
        const normalizedWord = normalizeWord(word);

        if (usedWords.has(normalizedWord)) {
            if (!legacyIndexes.has(index)) {
                duplicateIndexes.push(index);
            }
            return;
        }

        usedWords.add(normalizedWord);
    });

    const availableBaseWords = new Map(
        baseWords
            .filter((word) => !usedWords.has(normalizeWord(word)))
            .map((word) => [normalizeWord(word), word])
    );

    if (availableBaseWords.size < duplicateIndexes.length) {
        throw new Error('Not enough unique base words to restore the legacy word list');
    }

    duplicateIndexes.forEach((index) => {
        const duplicateWord = restoredWords[index];
        const replacementWord = DUPLICATE_WORD_REPLACEMENTS[duplicateWord];
        const normalizedReplacement = normalizeWord(replacementWord || '');

        if (!availableBaseWords.has(normalizedReplacement)) {
            throw new Error(`Missing unique replacement for duplicate word ${duplicateWord}`);
        }

        restoredWords[index] = availableBaseWords.get(normalizedReplacement);
        availableBaseWords.delete(normalizedReplacement);
    });

    let offset = 0;
    return baseMonthWords.map(({ month, words }) => {
        const restoredMonth = {
            month,
            words: restoredWords.slice(offset, offset + words.length)
        };
        offset += words.length;
        return restoredMonth;
    });
}

const MONTH_WORDS = restoreLegacyWords(BASE_MONTH_WORDS, LEGACY_WORDS_BY_DAY);

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function pad(value) {
    return String(value).padStart(2, '0');
}

function normalizeCycleMonthDay(monthDay) {
    return monthDay === '02-29' ? '02-28' : monthDay;
}

function buildWordCycle() {
    const days = [];

    MONTH_WORDS.forEach(({ month, words }) => {
        const expectedDays = DAYS_IN_MONTH[month - 1];
        if (words.length !== expectedDays) {
            throw new Error(`Month ${month} has ${words.length} words, expected ${expectedDays}`);
        }

        words.forEach((word, index) => {
            const day = index + 1;
            days.push({
                dayOfYear: days.length + 1,
                month,
                day,
                monthDay: `${pad(month)}-${pad(day)}`,
                word
            });
        });
    });

    const uniqueMonthDays = new Set(days.map((day) => day.monthDay));
    const uniqueWords = new Set(days.map((day) => day.word.toLocaleLowerCase('nb-NO')));

    if (days.length !== 365 || uniqueMonthDays.size !== 365 || uniqueWords.size !== 365) {
        throw new Error('Word cycle must contain 365 unique dates and 365 unique words');
    }

    return days;
}

const WORD_CYCLE = buildWordCycle();
const WORD_BY_MONTH_DAY = new Map(WORD_CYCLE.map((day) => [day.monthDay, day]));

function getMonthDayFromDate(date) {
    return normalizeCycleMonthDay(`${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
}

function getWordForMonthDay(monthDay) {
    return WORD_BY_MONTH_DAY.get(monthDay) || null;
}

function isValidMonthDay(monthDay) {
    return WORD_BY_MONTH_DAY.has(monthDay);
}

function isFutureCycleDate(year, monthDay, referenceDate = new Date()) {
    const normalizedMonthDay = normalizeCycleMonthDay(monthDay);
    const referenceYear = referenceDate.getFullYear();
    const referenceMonthDay = getMonthDayFromDate(referenceDate);

    if (year !== referenceYear) {
        return year > referenceYear;
    }

    return normalizedMonthDay > referenceMonthDay;
}

function formatDateForYear(year, monthDay) {
    return `${year}-${monthDay}`;
}

module.exports = {
    DAYS_IN_MONTH,
    MONTH_WORDS,
    WORD_CYCLE,
    formatDateForYear,
    getMonthDayFromDate,
    getWordForMonthDay,
    isFutureCycleDate,
    isValidMonthDay,
    normalizeCycleMonthDay
};
