const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function getInputTag(id) {
    const match = new RegExp(`<input[^>]+id="${id}"[^>]*>`).exec(html);
    return match?.[0] || '';
}

const cameraInput = getInputTag('cameraInput');
const libraryInput = getInputTag('libraryInput');

assert.ok(cameraInput, 'camera input should exist');
assert.ok(libraryInput, 'library input should exist');
assert.match(cameraInput, /type="file"/);
assert.match(libraryInput, /type="file"/);
assert.match(cameraInput, /capture="environment"/);
assert.doesNotMatch(libraryInput, /capture=/);
assert.match(html, /id="photoSourceDialog"/);
assert.match(html, /id="photoSourceContext"/);
assert.match(html, /id="photoMeta"/);
assert.match(html, /id="dayOwnerStrip"/);
assert.match(html, /id="overviewLegend"/);
assert.match(html, /Prikker: bare Henry 0, bare Ellinor 0, begge 0\./);
assert.match(html, /id="loginDialog"/);
assert.match(html, /data-login-owner="henry"/);
assert.match(html, /data-login-owner="ellinor"/);
assert.match(html, /styles\.css\?v=20260622-21/);
assert.match(html, /js\/app\.js\?v=20260622-22/);
assert.match(script, /overview-utils\.mjs\?v=20260622-21/);
assert.match(script, /history-utils\.mjs\?v=20260622-22/);
assert.match(script, /buildOverviewLegend/);
assert.match(script, /pickVisibleOwnerForDay/);

console.log('Validated separate photo source inputs.');
