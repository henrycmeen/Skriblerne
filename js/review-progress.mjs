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
