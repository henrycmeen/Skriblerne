const { WORD_CYCLE } = require('../data/wordCycle');

const VALID_STATUSES = new Set(['approved', 'flagged']);
const REQUIRED_REVIEWERS = ['henry', 'ellinor'];
const VALID_MONTH_DAYS = new Set(WORD_CYCLE.map((word) => word.monthDay));

function sanitizeReview(review = {}) {
    const status = VALID_STATUSES.has(review?.status) ? review.status : '';
    const suggestedWord = String(review?.suggestedWord || '').trim().replace(/\s+/g, ' ');
    const note = String(review?.note || '').trim().replace(/\s+/g, ' ');
    const reviewers = Object.fromEntries(
        REQUIRED_REVIEWERS.map((reviewer) => [reviewer, Boolean(review?.reviewers?.[reviewer])])
    );

    return {
        status,
        suggestedWord,
        note,
        reviewers
    };
}

function hasReviewContent(review) {
    return Boolean(
        review.status ||
        review.suggestedWord ||
        review.note ||
        REQUIRED_REVIEWERS.some((reviewer) => review.reviewers[reviewer])
    );
}

function sanitizeReviewState(input = {}) {
    const source = Array.isArray(input?.words)
        ? Object.fromEntries(input.words.map((word) => [word?.monthDay, word?.review || word]))
        : input?.reviewState || input;
    const state = {};

    Object.entries(source || {}).forEach(([monthDay, review]) => {
        if (!VALID_MONTH_DAYS.has(monthDay)) {
            return;
        }

        const sanitized = sanitizeReview(review);
        if (hasReviewContent(sanitized)) {
            state[monthDay] = sanitized;
        }
    });

    return state;
}

function mergeReview(existingReview = {}, incomingReview = {}) {
    const existing = sanitizeReview(existingReview);
    const incoming = sanitizeReview(incomingReview);
    const status = existing.status === 'flagged' || incoming.status === 'flagged'
        ? 'flagged'
        : incoming.status || existing.status;
    const merged = {
        status,
        suggestedWord: incoming.suggestedWord || existing.suggestedWord,
        note: incoming.note || existing.note,
        reviewers: Object.fromEntries(
            REQUIRED_REVIEWERS.map((reviewer) => [
                reviewer,
                Boolean(existing.reviewers[reviewer] || incoming.reviewers[reviewer])
            ])
        )
    };

    return hasReviewContent(merged) ? merged : null;
}

function mergeReviewStates(existingState = {}, incomingState = {}) {
    const existing = sanitizeReviewState(existingState);
    const incoming = sanitizeReviewState(incomingState);
    const monthDays = new Set([
        ...Object.keys(existing),
        ...Object.keys(incoming)
    ]);
    const mergedState = {};

    monthDays.forEach((monthDay) => {
        const merged = mergeReview(existing[monthDay], incoming[monthDay]);
        if (merged) {
            mergedState[monthDay] = merged;
        }
    });

    return mergedState;
}

function serializeWordReview(document) {
    return {
        reviewState: sanitizeReviewState(document?.reviewState || {}),
        updatedAt: document?.updatedAt || null
    };
}

module.exports = {
    mergeReviewStates,
    sanitizeReview,
    sanitizeReviewState,
    serializeWordReview
};
