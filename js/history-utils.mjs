export const OWNER_LABELS = {
    henry: 'Henry',
    ellinor: 'Ellinor'
};

const DEFAULT_OWNER = 'henry';
const OWNER_KEYS = Object.keys(OWNER_LABELS);

export function normalizeOwner(owner) {
    if (typeof owner !== 'string') {
        return DEFAULT_OWNER;
    }

    const normalizedOwner = owner.trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(OWNER_LABELS, normalizedOwner)
        ? normalizedOwner
        : DEFAULT_OWNER;
}

export function getMemoryKey(memory) {
    if (!memory) {
        return '';
    }

    return `${memory.year}:${normalizeOwner(memory.owner)}`;
}

export function formatMemoryCaption(memory) {
    if (!memory) {
        return '';
    }

    return `${OWNER_LABELS[normalizeOwner(memory.owner)]} · ${memory.year}`;
}

function ownerSortValue(owner) {
    const index = OWNER_KEYS.indexOf(normalizeOwner(owner));
    return index === -1 ? OWNER_KEYS.length : index;
}

export function compareSameDateMemories(a, b) {
    if (a.year !== b.year) {
        return b.year - a.year;
    }

    return ownerSortValue(a.owner) - ownerSortValue(b.owner);
}

export function buildSameDateHistory(memories, { activeYear, activeOwner }) {
    const activeKey = `${activeYear}:${normalizeOwner(activeOwner)}`;
    const timeline = [...memories].sort(compareSameDateMemories);
    const comparisonMemories = timeline.filter((memory) => getMemoryKey(memory) !== activeKey);
    const previousMemories = comparisonMemories.filter((memory) => memory.year < activeYear);

    return {
        activeKey,
        timeline,
        comparisonMemories,
        defaultComparison: previousMemories[0] || comparisonMemories[0] || null
    };
}
