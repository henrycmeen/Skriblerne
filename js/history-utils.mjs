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
    const relatedMemories = timeline.filter((memory) => getMemoryKey(memory) !== activeKey);
    const comparisonMemories = relatedMemories;
    const previousMemories = relatedMemories.filter((memory) => memory.year < activeYear);

    return {
        activeKey,
        timeline,
        relatedMemories,
        comparisonMemories,
        defaultComparison: previousMemories[0] || relatedMemories[0] || null
    };
}

export function buildSameDayOwnerOptions(memories = [], { activeOwner, monthDay, year }) {
    const memoriesByOwner = new Map(
        memories
            .filter((memory) => memory.year === year && memory.monthDay === monthDay)
            .map((memory) => [normalizeOwner(memory.owner), memory])
    );
    const normalizedActiveOwner = normalizeOwner(activeOwner);

    return OWNER_KEYS.map((owner) => {
        const memory = memoriesByOwner.get(owner) || null;

        return {
            owner,
            label: OWNER_LABELS[owner],
            hasMemory: Boolean(memory),
            isActive: owner === normalizedActiveOwner,
            memory
        };
    });
}

export function pickVisibleOwnerForDay(memories = [], activeOwner) {
    const normalizedActiveOwner = normalizeOwner(activeOwner);
    const activeOwnerMemory = memories.find((memory) => normalizeOwner(memory.owner) === normalizedActiveOwner);

    return normalizeOwner(activeOwnerMemory?.owner || memories[0]?.owner || normalizedActiveOwner);
}
