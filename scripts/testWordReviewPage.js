const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'ordliste.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'word-review.js'), 'utf8');

assert.match(html, /id="loadSharedReviewButton"/);
assert.match(html, /id="saveSharedReviewButton"/);
assert.match(html, /id="reviewSyncStatus"/);
assert.match(html, /styles\.css\?v=20260622-19/);
assert.match(html, /js\/word-review\.js\?v=20260622-25/);
assert.match(script, /review-progress\.mjs\?v=20260622-25/);
assert.match(script, /async function initializeWordReview/);
assert.match(script, /loadSharedReviewState\(\{ auto: true \}\)/);
assert.match(script, /\.then\(initializeWordReview\)/);
assert.match(script, /REVIEW_DIRTY_STORAGE_KEY/);
assert.match(script, /markUnsavedReviewChanges/);
assert.match(script, /clearUnsavedReviewChanges/);
assert.match(script, /function updateSyncStatus/);
assert.match(script, /payload\.updatedAt/);
assert.doesNotMatch(script, /replaceReviewState\(result\.reviewState\)/);
assert.match(script, /mergeReviewState\(result\.reviewState\)/);
assert.match(script, /importert og flettet fra/);

console.log('Validated word-review page initialization.');
