import assert from 'node:assert/strict';
import {
    buildSameDateHistory,
    getMemoryKey,
    normalizeOwner
} from '../js/history-utils.mjs';

const memories = [
    { year: 2028, owner: 'ellinor' },
    { year: 2026, owner: 'henry' },
    { year: 2025, owner: 'henry' },
    { year: 2024, owner: 'ellinor' },
    { year: 2027, owner: 'henry' },
    { year: 2026, owner: 'ellinor' },
    { year: 2023, owner: 'henry' },
    { year: 2022, owner: 'ellinor' },
    { year: 2021, owner: 'henry' }
];

assert.equal(normalizeOwner(' Ellinor '), 'ellinor');
assert.equal(normalizeOwner('ukjent'), 'henry');
assert.equal(getMemoryKey({ year: 2024, owner: 'ukjent' }), '2024:henry');

const history = buildSameDateHistory(memories, {
    activeYear: 2026,
    activeOwner: 'henry'
});

assert.deepEqual(
    history.timeline.map(getMemoryKey),
    [
        '2028:ellinor',
        '2027:henry',
        '2026:henry',
        '2026:ellinor',
        '2025:henry',
        '2024:ellinor',
        '2023:henry',
        '2022:ellinor',
        '2021:henry'
    ]
);
assert.equal(history.comparisonMemories.length, 8);
assert.equal(getMemoryKey(history.defaultComparison), '2025:henry');

const fallbackHistory = buildSameDateHistory(memories, {
    activeYear: 2021,
    activeOwner: 'henry'
});

assert.equal(getMemoryKey(fallbackHistory.defaultComparison), '2028:ellinor');

console.log('Validated same-date memory history.');
