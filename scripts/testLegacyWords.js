const assert = require('node:assert/strict');
const legacyWordsByDay = require('../ordbank.json').days;
const { WORD_CYCLE } = require('../data/wordCycle');

const normalizedLegacyWords = new Set();

Object.entries(legacyWordsByDay).forEach(([day, word]) => {
    const normalizedWord = word.toLocaleLowerCase('nb-NO');

    if (normalizedLegacyWords.has(normalizedWord)) {
        return;
    }

    normalizedLegacyWords.add(normalizedWord);
    assert.equal(
        WORD_CYCLE[Number(day) - 1]?.word,
        word,
        `Expected legacy day ${day} to keep ${word}`
    );
});

const cycleWords = new Set(
    WORD_CYCLE.map((entry) => entry.word.toLocaleLowerCase('nb-NO'))
);

normalizedLegacyWords.forEach((word) => {
    assert.ok(cycleWords.has(word), `Expected legacy word ${word} in the active cycle`);
});

assert.equal(normalizedLegacyWords.size, 129);
assert.equal(WORD_CYCLE.length, 365);
assert.equal(cycleWords.size, 365);

console.log('Validated 129 unique legacy words in the active cycle.');
