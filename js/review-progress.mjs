export const REQUIRED_REVIEWERS = ['henry', 'ellinor'];

export function normalizeReviewWord(word) {
    return String(word || '').trim();
}

export function normalizeReviewers(reviewers = {}) {
    return REQUIRED_REVIEWERS.reduce((normalized, reviewer) => {
        normalized[reviewer] = Boolean(reviewers?.[reviewer]);
        return normalized;
    }, {});
}

export function hasRequiredReviewers(review = {}) {
    const reviewers = normalizeReviewers(review.reviewers);
    return REQUIRED_REVIEWERS.every((reviewer) => reviewers[reviewer]);
}

export function needsReviewer(review = {}, reviewer) {
    if (!REQUIRED_REVIEWERS.includes(reviewer)) {
        return false;
    }

    return !normalizeReviewers(review.reviewers)[reviewer];
}

export function markReviewer(review = {}, reviewer) {
    const reviewers = normalizeReviewers(review.reviewers);

    if (REQUIRED_REVIEWERS.includes(reviewer)) {
        reviewers[reviewer] = true;
    }

    return {
        ...review,
        reviewers
    };
}

function normalizeReview(review = {}) {
    const status = ['approved', 'flagged'].includes(review?.status) ? review.status : '';
    const suggestedWord = normalizeReviewWord(review.suggestedWord);
    const note = normalizeReviewWord(review.note);
    const reviewers = normalizeReviewers(review.reviewers);

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

function mergeReview(existingReview = {}, incomingReview = {}) {
    const existing = normalizeReview(existingReview);
    const incoming = normalizeReview(incomingReview);
    const incomingConsensusApproval = incoming.status === 'approved' && hasRequiredReviewers(incoming);
    const shouldKeepFlagged = existing.status === 'flagged' || incoming.status === 'flagged';
    const status = incomingConsensusApproval
        ? 'approved'
        : shouldKeepFlagged
            ? 'flagged'
            : incoming.status || existing.status;
    const merged = {
        status,
        suggestedWord: incomingConsensusApproval
            ? incoming.suggestedWord
            : incoming.suggestedWord || existing.suggestedWord,
        note: incomingConsensusApproval
            ? incoming.note
            : incoming.note || existing.note,
        reviewers: Object.fromEntries(
            REQUIRED_REVIEWERS.map((reviewer) => [
                reviewer,
                Boolean(existing.reviewers[reviewer] || incoming.reviewers[reviewer])
            ])
        )
    };

    return hasReviewContent(merged) ? merged : null;
}

export function mergeReviewStates(existingState = {}, incomingState = {}) {
    const monthDays = new Set([
        ...Object.keys(existingState || {}),
        ...Object.keys(incomingState || {})
    ]);
    const mergedState = {};

    monthDays.forEach((monthDay) => {
        const merged = mergeReview(existingState?.[monthDay], incomingState?.[monthDay]);
        if (merged) {
            mergedState[monthDay] = merged;
        }
    });

    return mergedState;
}

export function isReviewCompleteForApply(review = {}) {
    if (!hasRequiredReviewers(review)) {
        return false;
    }

    if (review.status === 'approved') {
        return true;
    }

    return review.status === 'flagged' && normalizeReviewWord(review.suggestedWord).length > 0;
}

export function buildMonthProgress(words, reviewState) {
    const progressByMonth = new Map();

    words.forEach((word) => {
        const progress = progressByMonth.get(word.month) || {
            month: word.month,
            total: 0,
            complete: 0,
            open: 0,
            flagged: 0,
            missingReviewers: 0
        };
        const review = reviewState[word.monthDay] || {};

        progress.total += 1;
        if (isReviewCompleteForApply(review)) {
            progress.complete += 1;
        } else {
            progress.open += 1;
        }
        if (review.status === 'flagged') {
            progress.flagged += 1;
        }
        if (!hasRequiredReviewers(review)) {
            progress.missingReviewers += 1;
        }

        progressByMonth.set(word.month, progress);
    });

    return [...progressByMonth.values()].sort((a, b) => a.month - b.month);
}

export function monthProgressLabel(progress, monthName) {
    return `${monthName} ${progress.complete}/${progress.total}`;
}
