const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'ordliste.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'word-review.js'), 'utf8');

assert.match(html, /id="loadSharedReviewButton"/);
assert.match(html, /id="saveSharedReviewButton"/);
assert.match(html, /js\/word-review\.js\?v=20260622-22/);
assert.match(script, /async function initializeWordReview/);
assert.match(script, /loadSharedReviewState\(\{ auto: true \}\)/);
assert.match(script, /\.then\(initializeWordReview\)/);

console.log('Validated word-review page initialization.');
