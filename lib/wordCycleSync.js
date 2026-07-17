const TEMPORARY_WORD_PREFIX = '__skriblerne_sync__';

function buildTemporaryWordUpdates(wordCycle = []) {
    return wordCycle.map((entry) => ({
        updateOne: {
            filter: { monthDay: entry.monthDay },
            update: { $set: { word: `${TEMPORARY_WORD_PREFIX}${entry.monthDay}` } },
            upsert: false
        }
    }));
}

function buildFinalWordUpdates(wordCycle = []) {
    return wordCycle.map((entry) => ({
        updateOne: {
            filter: { monthDay: entry.monthDay },
            update: { $set: entry },
            upsert: true
        }
    }));
}

module.exports = {
    buildFinalWordUpdates,
    buildTemporaryWordUpdates
};
