import { OWNER_LABELS, normalizeOwner } from './history-utils.mjs';

export const IDENTITY_STORAGE_KEY = 'skriblerne-identity';

export function normalizeIdentity(owner) {
    if (typeof owner !== 'string') {
        return null;
    }

    const normalized = owner.trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(OWNER_LABELS, normalized)
        ? normalized
        : null;
}

export function readStoredIdentity(storage) {
    if (!storage || typeof storage.getItem !== 'function') {
        return null;
    }

    return normalizeIdentity(storage.getItem(IDENTITY_STORAGE_KEY));
}

export function findOwnMemory(memories, { year, monthDay, owner }) {
    const normalizedOwner = normalizeOwner(owner);
    return memories.find((memory) => (
        memory.year === year &&
        memory.monthDay === monthDay &&
        normalizeOwner(memory.owner) === normalizedOwner
    )) || null;
}

export function formatSaveContext({ owner, year, monthDay, word }) {
    const [month, day] = monthDay.split('-');
    return `${OWNER_LABELS[normalizeOwner(owner)]} · ${day}.${month}.${year} · ${word || 'Ukjent ord'}`;
}
