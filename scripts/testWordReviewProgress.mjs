import assert from 'node:assert/strict';
import {
    buildMonthProgress,
    isReviewCompleteForApply,
    monthProgressLabel
} from '../js/review-progress.mjs';

const words = [
    { month: 1, monthDay: '01-01', word: 'Snøfnugg' },
    { month: 1, monthDay: '01-02', word: 'Kakao' },
    { month: 1, monthDay: '01-03', word: 'Votter' },
    { month: 2, monthDay: '02-01', word: 'Hjerte' },
    { month: 2, monthDay: '02-02', word: 'Fastelavn' }
];

const reviewState = {
    '01-01': { status: 'approved' },
    '01-02': { status: 'flagged', suggestedWord: 'Varm kakao' },
    '01-03': { status: 'flagged' },
    '02-01': { status: 'flagged', suggestedWord: '  ' }
};

assert.equal(isReviewCompleteForApply({ status: 'approved' }), true);
assert.equal(isReviewCompleteForApply({ status: 'flagged', suggestedWord: 'Nytt ord' }), true);
assert.equal(isReviewCompleteForApply({ status: 'flagged', suggestedWord: '' }), false);
assert.equal(isReviewCompleteForApply({}), false);

const progress = buildMonthProgress(words, reviewState);

assert.deepEqual(progress, [
    { month: 1, total: 3, complete: 2, open: 1, flagged: 2 },
    { month: 2, total: 2, complete: 0, open: 2, flagged: 1 }
]);
assert.equal(monthProgressLabel(progress[0], 'januar'), 'januar 2/3');
assert.equal(monthProgressLabel(progress[1], 'februar'), 'februar 0/2');

console.log('Validated word-review month progress.');
