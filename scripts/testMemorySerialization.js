const assert = require('node:assert/strict');
const { serializeMemory } = require('../lib/memorySerialization');

const memory = {
    _id: 'memory-1',
    year: 2026,
    monthDay: '06-22',
    owner: 'ellinor',
    dayOfYear: 173,
    word: 'Hagebord',
    thumbnailData: 'data:image/jpeg;base64,thumb',
    imageData: 'data:image/jpeg;base64,full',
    mimeType: 'image/jpeg',
    originalName: 'hagebord.jpg',
    createdAt: new Date('2026-06-22T12:00:00.000Z'),
    updatedAt: new Date('2026-06-22T12:01:00.000Z')
};

const listMemory = serializeMemory(memory);

assert.equal(listMemory.owner, 'ellinor');
assert.equal(listMemory.ownerName, 'Ellinor');
assert.equal(listMemory.thumbnailData, memory.thumbnailData);
assert.equal(Object.hasOwn(listMemory, 'imageData'), false);

const detailMemory = serializeMemory(memory, { includeImage: true });

assert.equal(detailMemory.imageData, memory.imageData);

console.log('Validated memory serialization payloads.');
