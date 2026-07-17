const { WORD_CYCLE } = require('../data/wordCycle');

const VALID_STATUSES = new Set(['approved', 'flagged']);
const REQUIRED_REVIEWERS = ['henry', 'ellinor'];
const VALID_MONTH_DAYS = new Set(WORD_CYCLE.map((word) => word.monthDay));
const STALE_GENERATED_REVIEWS = {
    '01-18': {
        suggestedWord: 'Istapp',
        note: 'Ispinne kan leses som sommeris. Istapp er mer vinterlig og lett å fotografere eller tegne.'
    },
    '02-12': {
        suggestedWord: 'Rosakinn',
        note: 'Kinn alene er litt flatt som bildeoppgave. Rosakinn passer februarkulde bedre.'
    },
    '02-14': {
        suggestedWord: 'Hjertekort',
        note: 'Kjærlighet er abstrakt. Hjertekort gjør temaet konkret og passer februar bedre som bildeoppgave.'
    },
    '02-17': {
        suggestedWord: 'Røde kinn',
        note: 'Rødme er abstrakt. Røde kinn er mer konkret for foto og tegning.'
    },
    '02-26': {
        suggestedWord: 'Vennebånd',
        note: 'Vennskap er fint, men abstrakt. Vennebånd gir et konkret motiv dere kan lage, finne eller tegne.'
    },
    '03-17': {
        suggestedWord: 'Grønn mose',
        note: 'Grønnskjær er poetisk og litt uklart. Grønn mose er mer konkret og vårnært.'
    },
    '03-26': {
        suggestedWord: 'Bjørkekvast',
        note: 'Kvast kan bety flere ting. Bjørkekvast gjør vårkoblingen tydeligere.'
    },
    '03-28': {
        suggestedWord: 'Vårbilde',
        note: 'Øyeblikk er poetisk, men veldig åpent. Vårbilde gir tydeligere retning.'
    },
    '04-19': {
        suggestedWord: 'Tullebriller',
        note: 'Aprilsnarr er en hendelse mer enn et motiv. Tullebriller holder leken i samme spor.'
    },
    '05-07': {
        suggestedWord: 'Sjøskum',
        note: 'Sjøbris er vanskelig å fotografere direkte. Sjøskum beholder kystfølelsen, men blir mer synlig.'
    }
};

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

function hasRequiredReviewers(review) {
    return REQUIRED_REVIEWERS.every((reviewer) => review.reviewers[reviewer]);
}

function isStaleGeneratedReview(monthDay, review) {
    const staleReview = STALE_GENERATED_REVIEWS[monthDay];

    return Boolean(
        staleReview &&
        review.status === 'flagged' &&
        review.suggestedWord === staleReview.suggestedWord &&
        review.note === staleReview.note &&
        REQUIRED_REVIEWERS.every((reviewer) => !review.reviewers[reviewer])
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
        if (hasReviewContent(sanitized) && !isStaleGeneratedReview(monthDay, sanitized)) {
            state[monthDay] = sanitized;
        }
    });

    return state;
}

function mergeReview(existingReview = {}, incomingReview = {}) {
    const existing = sanitizeReview(existingReview);
    const incoming = sanitizeReview(incomingReview);
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
