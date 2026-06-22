import assert from 'node:assert/strict';
import {
    buildOverviewSummary,
    createOwnerCounts,
    getOverviewOwnerState
} from '../js/overview-utils.mjs';

assert.deepEqual(getOverviewOwnerState([], 'henry'), {
    className: '',
    label: ', mangler bilde',
    owners: []
});

assert.deepEqual(getOverviewOwnerState([{ owner: 'henry' }], 'henry'), {
    className: 'day-dot--own-only',
    label: ', Henry har bilde',
    owners: ['henry']
});

assert.deepEqual(getOverviewOwnerState([{ owner: 'ellinor' }], 'henry'), {
    className: 'day-dot--other-only',
    label: ', Ellinor har bilde',
    owners: ['ellinor']
});

assert.deepEqual(getOverviewOwnerState([{ owner: 'ellinor' }, { owner: 'henry' }], 'henry'), {
    className: 'day-dot--both',
    label: ', Henry og Ellinor har bilder',
    owners: ['henry', 'ellinor']
});

const ownerCounts = createOwnerCounts();
ownerCounts.henry = 3;
ownerCounts.ellinor = 2;

assert.equal(
    buildOverviewSummary({ filledDays: 4, ownerCounts, photoCount: 5, year: 2026 }),
    '5 bilder på 4 dager i 2026. Henry 3, Ellinor 2.'
);

console.log('Validated overview owner state.');
