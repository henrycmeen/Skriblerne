import assert from 'node:assert/strict';
import {
    formatSaveContext,
    findOwnMemory,
    IDENTITY_STORAGE_KEY,
    normalizeIdentity,
    readStoredIdentity
} from '../js/identity-utils.mjs';

const storage = new Map();
const localStorageLike = {
    getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
    }
};

storage.set(IDENTITY_STORAGE_KEY, 'ellinor');
assert.equal(readStoredIdentity(localStorageLike), 'ellinor');

storage.set(IDENTITY_STORAGE_KEY, 'ukjent');
assert.equal(readStoredIdentity(localStorageLike), null);
assert.equal(normalizeIdentity(' Henry '), 'henry');
assert.equal(normalizeIdentity('noen andre'), null);

assert.equal(
    formatSaveContext({
        owner: 'ellinor',
        year: 2026,
        monthDay: '06-22',
        word: 'Hagebord'
    }),
    'Ellinor · 22.06.2026 · Hagebord'
);

const memories = [
    { year: 2026, monthDay: '06-22', owner: 'ellinor' },
    { year: 2026, monthDay: '06-22', owner: 'henry' },
    { year: 2025, monthDay: '06-22', owner: 'henry' }
];

assert.equal(
    findOwnMemory(memories, { year: 2026, monthDay: '06-22', owner: 'henry' })?.owner,
    'henry'
);
assert.equal(
    findOwnMemory(memories, { year: 2024, monthDay: '06-22', owner: 'henry' }),
    null
);

console.log('Validated simple identity helpers.');
