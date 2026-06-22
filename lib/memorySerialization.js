const DEFAULT_OWNER = 'henry';
const OWNER_LABELS = {
    henry: 'Henry',
    ellinor: 'Ellinor'
};

function normalizeSerializedOwner(value) {
    const owner = String(value || DEFAULT_OWNER).trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(OWNER_LABELS, owner) ? owner : DEFAULT_OWNER;
}

function serializeMemory(memory, { includeImage = false } = {}) {
    if (!memory) {
        return null;
    }

    const owner = normalizeSerializedOwner(memory.owner);
    const serialized = {
        id: memory._id,
        year: memory.year,
        monthDay: memory.monthDay,
        owner,
        ownerName: OWNER_LABELS[owner],
        dayOfYear: memory.dayOfYear,
        word: memory.word,
        thumbnailData: memory.thumbnailData,
        mimeType: memory.mimeType,
        originalName: memory.originalName,
        createdAt: memory.createdAt,
        updatedAt: memory.updatedAt
    };

    if (includeImage) {
        serialized.imageData = memory.imageData;
    }

    return serialized;
}

module.exports = {
    DEFAULT_OWNER,
    OWNER_LABELS,
    serializeMemory
};
