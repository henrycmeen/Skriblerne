const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'ordliste.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'word-review.js'), 'utf8');

const indexStylesVersion = /styles\.css\?v=(\d{8}-\d+)/.exec(indexHtml)?.[1];
const reviewStylesVersion = /styles\.css\?v=(\d{8}-\d+)/.exec(html)?.[1];

assert.match(html, /id="loadSharedReviewButton"/);
assert.match(html, /id="saveSharedReviewButton"/);
assert.match(html, /id="reviewSyncStatus"/);
assert.equal(reviewStylesVersion, indexStylesVersion);
assert.equal(reviewStylesVersion, '20260622-24');
assert.match(html, /js\/word-review\.js\?v=20260622-28/);
assert.match(script, /review-progress\.mjs\?v=20260622-27/);
assert.match(script, /approveReviewForReviewer/);
assert.match(script, /review-quick-approve/);
assert.match(script, /activeFilter === 'mine'/);
assert.match(script, /review-quick-approve:not\(:disabled\), input/);
assert.match(script, /async function initializeWordReview/);
assert.match(script, /loadSharedReviewState\(\{ auto: true \}\)/);
assert.match(script, /\.then\(initializeWordReview\)/);
assert.match(script, /REVIEW_DIRTY_STORAGE_KEY/);
assert.match(script, /markUnsavedReviewChanges/);
assert.match(script, /clearUnsavedReviewChanges/);
assert.match(script, /function updateSyncStatus/);
assert.match(script, /beforeunload/);
assert.match(script, /hasUnsavedReviewChanges/);
assert.match(script, /event\.preventDefault\(\)/);
assert.match(script, /payload\.updatedAt/);
assert.doesNotMatch(script, /replaceReviewState\(result\.reviewState\)/);
assert.match(script, /mergeReviewState\(result\.reviewState\)/);
assert.match(script, /importert og flettet fra/);

console.log('Validated word-review page initialization.');
