import assert from 'node:assert/strict';
import {
    buildMonthProgress,
    hasRequiredReviewers,
    isReviewCompleteForApply,
    markReviewer,
    mergeReviewStates,
    monthProgressLabel,
    needsReviewer
} from '../js/review-progress.mjs';

const words = [
    { month: 1, monthDay: '01-01', word: 'Snøfnugg' },
    { month: 1, monthDay: '01-02', word: 'Kakao' },
    { month: 1, monthDay: '01-03', word: 'Votter' },
    { month: 2, monthDay: '02-01', word: 'Hjerte' },
    { month: 2, monthDay: '02-02', word: 'Fastelavn' }
];

const reviewState = {
    '01-01': { status: 'approved', reviewers: { henry: true, ellinor: true } },
    '01-02': { status: 'flagged', suggestedWord: 'Varm kakao', reviewers: { henry: true, ellinor: true } },
    '01-03': { status: 'flagged', reviewers: { henry: true } },
    '02-01': { status: 'flagged', suggestedWord: '  ', reviewers: { ellinor: true } }
};

assert.equal(hasRequiredReviewers({ reviewers: { henry: true, ellinor: true } }), true);
assert.equal(hasRequiredReviewers({ reviewers: { henry: true } }), false);
assert.equal(isReviewCompleteForApply({ status: 'approved', reviewers: { henry: true, ellinor: true } }), true);
assert.equal(isReviewCompleteForApply({ status: 'approved', reviewers: { henry: true } }), false);
assert.equal(isReviewCompleteForApply({ status: 'flagged', suggestedWord: 'Nytt ord', reviewers: { henry: true, ellinor: true } }), true);
assert.equal(isReviewCompleteForApply({ status: 'flagged', suggestedWord: '' , reviewers: { henry: true, ellinor: true } }), false);
assert.equal(isReviewCompleteForApply({}), false);
assert.equal(needsReviewer({ reviewers: { henry: true } }, 'henry'), false);
assert.equal(needsReviewer({ reviewers: { henry: true } }, 'ellinor'), true);
assert.deepEqual(
    markReviewer({ status: 'approved', reviewers: { ellinor: true } }, 'henry'),
    { status: 'approved', reviewers: { henry: true, ellinor: true } }
);
assert.deepEqual(
    markReviewer({ status: 'approved', reviewers: { ellinor: true } }, 'unknown'),
    { status: 'approved', reviewers: { henry: false, ellinor: true } }
);
assert.deepEqual(
    mergeReviewStates(
        {
            '01-01': { status: 'approved', reviewers: { henry: true } },
            '01-02': {
                status: 'flagged',
                suggestedWord: 'Vinterlys',
                note: 'Se på årstid',
                reviewers: { ellinor: true }
            }
        },
        {
            '01-01': { reviewers: { ellinor: true } },
            '01-02': { status: 'approved', reviewers: { henry: true } },
            '01-03': { status: 'flagged', suggestedWord: 'Månespor' }
        }
    ),
    {
        '01-01': {
            status: 'approved',
            suggestedWord: '',
            note: '',
            reviewers: { henry: true, ellinor: true }
        },
        '01-02': {
            status: 'flagged',
            suggestedWord: 'Vinterlys',
            note: 'Se på årstid',
            reviewers: { henry: true, ellinor: true }
        },
        '01-03': {
            status: 'flagged',
            suggestedWord: 'Månespor',
            note: '',
            reviewers: { henry: false, ellinor: false }
        }
    }
);

const progress = buildMonthProgress(words, reviewState);

assert.deepEqual(progress, [
    { month: 1, total: 3, complete: 2, open: 1, flagged: 2, missingReviewers: 1 },
    { month: 2, total: 2, complete: 0, open: 2, flagged: 1, missingReviewers: 2 }
]);
assert.equal(monthProgressLabel(progress[0], 'januar'), 'januar 2/3');
assert.equal(monthProgressLabel(progress[1], 'februar'), 'februar 0/2');

console.log('Validated word-review month progress.');
