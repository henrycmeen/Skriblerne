const assert = require('node:assert/strict');
const legacyWordsByDay = require('../ordbank.json').days;
const { WORD_CYCLE } = require('../data/wordCycle');

Object.entries(legacyWordsByDay).forEach(([day, word]) => {
    assert.equal(
        WORD_CYCLE[Number(day) - 1]?.word,
        word,
        `Expected legacy day ${day} to keep ${word}`
    );
});

assert.equal(WORD_CYCLE.length, 365);
assert.equal(Object.keys(legacyWordsByDay).length, 130);
assert.equal(WORD_CYCLE.slice(0, 130).filter((entry) => entry.word).length, 130);
assert.equal(WORD_CYCLE.slice(130).every((entry) => entry.word === ''), true);
assert.equal(WORD_CYCLE[27].word, 'Solsystem');
assert.equal(WORD_CYCLE[35].word, 'Solsystem');

console.log('Validated all 130 legacy positions followed by 235 empty word slots.');
