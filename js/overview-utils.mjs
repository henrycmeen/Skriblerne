import { OWNER_LABELS, normalizeOwner } from './history-utils.mjs';

const OWNER_ORDER = Object.keys(OWNER_LABELS);

export function createOwnerCounts() {
    return Object.fromEntries(OWNER_ORDER.map((owner) => [owner, 0]));
}

export function getOverviewOwnerState(memories = [], activeOwner = 'henry') {
    const owners = uniqueOwners(memories);

    if (owners.length === 0) {
        return {
            className: '',
            label: ', mangler bilde',
            owners
        };
    }

    const label = owners.length === 1
        ? `, ${OWNER_LABELS[owners[0]]} har bilde`
        : `, ${owners.map((owner) => OWNER_LABELS[owner]).join(' og ')} har bilder`;
    const normalizedActiveOwner = normalizeOwner(activeOwner);
    const hasActiveOwner = owners.includes(normalizedActiveOwner);
    const className = owners.length > 1
        ? 'day-dot--both'
        : hasActiveOwner
            ? 'day-dot--own-only'
            : 'day-dot--other-only';

    return {
        className,
        label,
        owners
    };
}

export function buildOverviewSummary({ filledDays, ownerCounts, photoCount, year }) {
    const base = photoCount === filledDays
        ? `${filledDays} bilder i ${year}`
        : `${photoCount} bilder på ${filledDays} dager i ${year}`;
    const ownerText = OWNER_ORDER
        .filter((owner) => ownerCounts[owner] > 0)
        .map((owner) => `${OWNER_LABELS[owner]} ${ownerCounts[owner]}`)
        .join(', ');

    return ownerText ? `${base}. ${ownerText}.` : base;
}

export function buildOverviewLegend(ownerCounts) {
    return `Prikker: bare Henry ${ownerCounts.henry || 0}, bare Ellinor ${ownerCounts.ellinor || 0}, begge ${ownerCounts.both || 0}.`;
}

function uniqueOwners(memories) {
    const ownerSet = new Set(memories.map((memory) => normalizeOwner(memory.owner)));
    return OWNER_ORDER.filter((owner) => ownerSet.has(owner));
}
