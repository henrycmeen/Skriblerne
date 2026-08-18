const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'simple-app.js'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

assert.match(html, /id="word-display"/);
assert.match(html, /id="newWord"/);
assert.match(html, /id="words-container"/);
assert.match(html, /id="editCodeDialog"/);
assert.match(html, /js\/simple-app\.js\?v=20260818-1/);
assert.match(html, /simple\.css\?v=20260818-1/);
assert.doesNotMatch(html, /photo-stage|year-grid|comparison|identity-switch/);
assert.match(script, /\/api\/word\/today/);
assert.match(script, /\/api\/words/);
assert.match(script, /x-skriblerne-edit-code/);
assert.match(script, /word\.dayOfYear/);
assert.match(script, /document\.createElement\('li'\)/);
assert.match(server, /app\.post\('\/api\/words', requireEditCode, addWord\)/);

console.log('Validated simple word page contract.');
