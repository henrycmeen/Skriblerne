const TEMPORARY_WORD_PREFIX = '__skriblerne_sync__';
const OBSOLETE_WORD_INDEX_NAMES = new Set(['date_1', 'word_1']);

function findObsoleteWordIndexes(indexes = []) {
    return indexes.filter((index) => OBSOLETE_WORD_INDEX_NAMES.has(index.name));
}

function buildTemporaryWordUpdates(wordCycle = []) {
    return wordCycle.filter((entry) => entry.word).map((entry) => ({
        updateOne: {
            filter: { monthDay: entry.monthDay },
            update: { $set: { word: `${TEMPORARY_WORD_PREFIX}${entry.monthDay}` } },
            upsert: false
        }
    }));
}

function buildFinalWordUpdates(wordCycle = []) {
    return wordCycle.map((entry) => {
        const { word, ...dateFields } = entry;

        return {
            updateOne: {
                filter: { monthDay: entry.monthDay },
                update: word
                    ? { $set: entry }
                    : { $set: dateFields, $setOnInsert: { word: '' } },
                upsert: true
            }
        };
    });
}

module.exports = {
    buildFinalWordUpdates,
    buildTemporaryWordUpdates,
    findObsoleteWordIndexes
};
