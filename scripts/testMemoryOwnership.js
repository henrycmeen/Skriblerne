const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Memory = require('../models/Memory');

function hasIndex(expectedFields, expectedOptions = {}) {
    return Memory.schema.indexes().some(([fields, options]) => (
        JSON.stringify(fields) === JSON.stringify(expectedFields) &&
        Object.entries(expectedOptions).every(([key, value]) => options[key] === value)
    ));
}

const ownerPath = Memory.schema.path('owner');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

assert.equal(ownerPath.options.default, 'henry');
assert.deepEqual([...ownerPath.enumValues].sort(), ['ellinor', 'henry']);
assert.equal(hasIndex({ year: 1, monthDay: 1, owner: 1 }, { unique: true }), true);
assert.equal(hasIndex({ year: 1, monthDay: 1 }, { unique: true }), false);
assert.match(server, /isFutureCycleDate/);
assert.match(server, /Du kan ikke lagre bilde for en fremtidig dato\./);

console.log('Validated memory ownership model.');
