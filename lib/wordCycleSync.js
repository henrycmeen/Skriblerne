const TEMPORARY_WORD_PREFIX = '__skriblerne_sync__';
const OBSOLETE_WORD_INDEX_NAMES = new Set(['date_1', 'word_1']);

function findObsoleteWordIndexes(indexes = []) {
    return indexes.filter((index) => OBSOLETE_WORD_INDEX_NAMES.has(index.name));
}

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
    buildTemporaryWordUpdates,
    findObsoleteWordIndexes
};
