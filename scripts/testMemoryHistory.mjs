import assert from 'node:assert/strict';
import {
    buildSameDayOwnerOptions,
    buildSameDateHistory,
    formatMemoryCaption,
    getMemoryKey,
    normalizeOwner,
    pickVisibleOwnerForDay
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
assert.equal(
    formatMemoryCaption({ year: 2026, owner: 'ellinor' }),
    'Ellinor · 2026'
);
assert.equal(formatMemoryCaption(null), '');

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
assert.deepEqual(history.relatedMemories.map(getMemoryKey), history.comparisonMemories.map(getMemoryKey));
assert.doesNotMatch(history.relatedMemories.map(getMemoryKey).join(','), /2026:henry/);
assert.equal(getMemoryKey(history.defaultComparison), '2025:henry');

const activeOnlyHistory = buildSameDateHistory([
    { year: 2026, owner: 'henry' }
], {
    activeYear: 2026,
    activeOwner: 'henry'
});

assert.deepEqual(activeOnlyHistory.timeline.map(getMemoryKey), ['2026:henry']);
assert.deepEqual(activeOnlyHistory.relatedMemories, []);
assert.deepEqual(activeOnlyHistory.comparisonMemories, []);
assert.equal(activeOnlyHistory.defaultComparison, null);

const fallbackHistory = buildSameDateHistory(memories, {
    activeYear: 2021,
    activeOwner: 'henry'
});

assert.equal(getMemoryKey(fallbackHistory.defaultComparison), '2028:ellinor');

assert.deepEqual(
    buildSameDayOwnerOptions([
        { year: 2026, monthDay: '06-22', owner: 'ellinor' },
        { year: 2026, monthDay: '06-22', owner: 'henry' },
        { year: 2025, monthDay: '06-22', owner: 'henry' },
        { year: 2026, monthDay: '06-23', owner: 'henry' }
    ], {
        activeOwner: 'ellinor',
        monthDay: '06-22',
        year: 2026
    }),
    [
        {
            owner: 'henry',
            label: 'Henry',
            hasMemory: true,
            isActive: false,
            memory: { year: 2026, monthDay: '06-22', owner: 'henry' }
        },
        {
            owner: 'ellinor',
            label: 'Ellinor',
            hasMemory: true,
            isActive: true,
            memory: { year: 2026, monthDay: '06-22', owner: 'ellinor' }
        }
    ]
);

assert.deepEqual(
    buildSameDayOwnerOptions([], {
        activeOwner: 'henry',
        monthDay: '06-22',
        year: 2026
    }).map(({ owner, hasMemory, isActive, memory }) => ({ owner, hasMemory, isActive, memory })),
    [
        { owner: 'henry', hasMemory: false, isActive: true, memory: null },
        { owner: 'ellinor', hasMemory: false, isActive: false, memory: null }
    ]
);
assert.equal(
    pickVisibleOwnerForDay([
        { year: 2026, monthDay: '06-22', owner: 'ellinor' }
    ], 'henry'),
    'ellinor'
);
assert.equal(
    pickVisibleOwnerForDay([
        { year: 2026, monthDay: '06-22', owner: 'ellinor' },
        { year: 2026, monthDay: '06-22', owner: 'henry' }
    ], 'henry'),
    'henry'
);
assert.equal(pickVisibleOwnerForDay([], 'ellinor'), 'ellinor');

console.log('Validated same-date memory history.');
