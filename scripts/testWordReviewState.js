const assert = require('node:assert/strict');
const WordReview = require('../models/WordReview');
const {
    sanitizeReview,
    sanitizeReviewState,
    serializeWordReview
} = require('../lib/wordReviewState');

function hasIndex(expectedFields, expectedOptions = {}) {
    return WordReview.schema.indexes().some(([fields, options]) => (
        JSON.stringify(fields) === JSON.stringify(expectedFields) &&
        Object.entries(expectedOptions).every(([key, value]) => options[key] === value)
    ));
}

assert.equal(WordReview.schema.path('key').options.default, 'shared');
assert.equal(hasIndex({ key: 1 }, { unique: true }), true);

assert.deepEqual(
    sanitizeReview({
        status: 'flagged',
        suggestedWord: '  Varm   kakao  ',
        note: '  bedre vinterord  ',
        reviewers: { henry: 1, ellinor: 0, other: true }
    }),
    {
        status: 'flagged',
        suggestedWord: 'Varm kakao',
        note: 'bedre vinterord',
        reviewers: { henry: true, ellinor: false }
    }
);

assert.deepEqual(
    sanitizeReviewState({
        '01-01': { status: 'approved', reviewers: { henry: true } },
        '01-02': { status: 'bad', suggestedWord: '  Kakao med krem  ' },
        '02-29': { status: 'approved', reviewers: { henry: true, ellinor: true } },
        '01-03': {}
    }),
    {
        '01-01': {
            status: 'approved',
            suggestedWord: '',
            note: '',
            reviewers: { henry: true, ellinor: false }
        },
        '01-02': {
            status: '',
            suggestedWord: 'Kakao med krem',
            note: '',
            reviewers: { henry: false, ellinor: false }
        }
    }
);

assert.deepEqual(
    sanitizeReviewState({
        words: [
            {
                monthDay: '01-04',
                review: {
                    status: 'flagged',
                    suggestedWord: 'Månespor',
                    reviewers: { henry: true, ellinor: true }
                }
            }
        ]
    }),
    {
        '01-04': {
            status: 'flagged',
            suggestedWord: 'Månespor',
            note: '',
            reviewers: { henry: true, ellinor: true }
        }
    }
);

assert.deepEqual(
    serializeWordReview({
        reviewState: { '01-01': { status: 'approved', reviewers: { henry: true } } },
        updatedAt: '2026-06-22T16:00:00.000Z'
    }),
    {
        reviewState: {
            '01-01': {
                status: 'approved',
                suggestedWord: '',
                note: '',
                reviewers: { henry: true, ellinor: false }
            }
        },
        updatedAt: '2026-06-22T16:00:00.000Z'
    }
);

console.log('Validated shared word-review state.');
