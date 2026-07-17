const assert = require('node:assert/strict');
const { WORD_CYCLE } = require('../data/wordCycle');
const {
    buildFinalWordUpdates,
    buildTemporaryWordUpdates
} = require('../lib/wordCycleSync');

const temporaryUpdates = buildTemporaryWordUpdates(WORD_CYCLE);
const finalUpdates = buildFinalWordUpdates(WORD_CYCLE);
const temporaryWords = temporaryUpdates.map((operation) => operation.updateOne.update.$set.word);
const activeWords = new Set(WORD_CYCLE.map((entry) => entry.word));

assert.equal(temporaryUpdates.length, 365);
assert.equal(new Set(temporaryWords).size, 365);
assert.equal(temporaryWords.some((word) => activeWords.has(word)), false);
assert.equal(temporaryUpdates.every((operation) => operation.updateOne.upsert === false), true);
assert.equal(finalUpdates.length, 365);
assert.equal(finalUpdates.every((operation) => operation.updateOne.upsert === true), true);
assert.deepEqual(
    finalUpdates[0].updateOne.update.$set,
    WORD_CYCLE[0]
);

console.log('Validated two-phase word-cycle sync operations.');
