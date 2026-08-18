const assert = require('node:assert/strict');
const { WORD_CYCLE } = require('../data/wordCycle');
const {
    SEQUENCE_START_DATE,
    addNextWord,
    findNextOpenWord,
    getWordForSequenceDate,
    mergeStoredWords,
    normalizeNewWord,
    sequenceDateForDay
} = require('../lib/wordQueue');

const storedWords = [
    { dayOfYear: 1, monthDay: '01-01', word: 'Skal ikke vinne' },
    { dayOfYear: 131, monthDay: '05-11', word: 'Nytt ord' }
];
const effectiveCycle = mergeStoredWords(WORD_CYCLE, storedWords);

assert.equal(SEQUENCE_START_DATE, '2026-06-22');
assert.equal(effectiveCycle.length, 365);
assert.equal(effectiveCycle[0].word, 'Marihøne');
assert.equal(effectiveCycle[129].word, 'Brevdue');
assert.equal(effectiveCycle[130].word, 'Nytt ord');
assert.equal(findNextOpenWord(effectiveCycle).dayOfYear, 132);
assert.equal(getWordForSequenceDate(effectiveCycle, new Date(2026, 5, 22)).word, 'Marihøne');
assert.equal(getWordForSequenceDate(effectiveCycle, new Date(2026, 7, 18)).word, 'Tulipaner');
assert.equal(getWordForSequenceDate(effectiveCycle, new Date(2026, 5, 21)), null);
assert.equal(sequenceDateForDay(1), '2026-06-22');
assert.equal(sequenceDateForDay(131), '2026-10-30');
assert.equal(normalizeNewWord('  En   liten rev  '), 'En liten rev');
assert.throws(() => normalizeNewWord(''), /Skriv inn et ord/);
assert.throws(() => normalizeNewWord('x'.repeat(81)), /maks 80 tegn/);

async function testWordAddition() {
    let savedInput;
    const added = await addNextWord({
        rawWord: '  Neste   ord  ',
        wordCycle: effectiveCycle,
        saveWord: async (slot, word) => {
            savedInput = { slot, word };
            return true;
        }
    });

    assert.equal(savedInput.slot.dayOfYear, 132);
    assert.equal(savedInput.word, 'Neste ord');
    assert.equal(added.word, 'Neste ord');
    assert.equal(added.dayOfYear, 132);
    assert.equal(added.date, '2026-10-31');

    await assert.rejects(
        addNextWord({ rawWord: 'marihøne', wordCycle: effectiveCycle, saveWord: async () => true }),
        (error) => error.statusCode === 400 && /finnes allerede/.test(error.message)
    );
    await assert.rejects(
        addNextWord({ rawWord: 'Kollisjon', wordCycle: effectiveCycle, saveWord: async () => null }),
        (error) => error.statusCode === 409 && /nettopp endret/.test(error.message)
    );
    await assert.rejects(
        addNextWord({
            rawWord: 'For mye',
            wordCycle: effectiveCycle.map((entry) => ({ ...entry, word: entry.word || `Ord ${entry.dayOfYear}` })),
            saveWord: async () => true
        }),
        (error) => error.statusCode === 409 && /full/.test(error.message)
    );

    console.log('Validated simple ordered word queue and additions.');
}

testWordAddition().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
