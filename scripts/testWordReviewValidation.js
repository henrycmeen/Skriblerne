const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { WORD_CYCLE } = require('../data/wordCycle');

const APPLY_SCRIPT = path.join(__dirname, 'applyWordReview.js');

function buildReview(overrides = {}) {
    return {
        reviewedAt: '2026-06-22T00:00:00.000Z',
        words: WORD_CYCLE.map((word) => ({
            ...word,
            review: {
                status: 'approved',
                suggestedWord: '',
                note: '',
                ...(overrides[word.monthDay] || {})
            }
        }))
    };
}

function writeReview(tempDir, name, payload) {
    const filePath = path.join(tempDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
    return filePath;
}

function runApply(reviewPath) {
    return spawnSync(process.execPath, [APPLY_SCRIPT, reviewPath], {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8'
    });
}

function assertPass(result, label) {
    assert.equal(
        result.status,
        0,
        `${label} expected to pass.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
}

function assertFailingWith(result, expectedText, label) {
    assert.notEqual(result.status, 0, `${label} expected to fail.`);
    assert.match(
        result.stderr,
        expectedText,
        `${label} expected stderr to match ${expectedText}.\nstderr:\n${result.stderr}`
    );
}

function main() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skriblerne-review-validation-'));

    try {
        const validReview = buildReview({
            '01-01': { status: 'flagged', suggestedWord: 'Vinterstjerne' }
        });
        assertPass(runApply(writeReview(tempDir, 'valid', validReview)), 'valid review');

        const missingStatusReview = buildReview({
            '01-01': { status: '' }
        });
        assertFailingWith(
            runApply(writeReview(tempDir, 'missing-status', missingStatusReview)),
            /01-01 \(Snøfnugg\) mangler OK\/Se på-status/,
            'missing status review'
        );

        const missingSuggestionReview = buildReview({
            '01-01': { status: 'flagged', suggestedWord: '' }
        });
        assertFailingWith(
            runApply(writeReview(tempDir, 'missing-suggestion', missingSuggestionReview)),
            /01-01 \(Snøfnugg\) er flagget, men mangler nytt ord/,
            'flagged review without suggestion'
        );

        const duplicateReview = buildReview({
            '01-01': { status: 'flagged', suggestedWord: 'Kakao' }
        });
        assertFailingWith(
            runApply(writeReview(tempDir, 'duplicate', duplicateReview)),
            /Duplikat sluttord "Kakao" på 01-01 og 01-02/,
            'duplicate final word review'
        );

        const missingDateReview = buildReview();
        missingDateReview.words = missingDateReview.words.filter((word) => word.monthDay !== '01-01');
        assertFailingWith(
            runApply(writeReview(tempDir, 'missing-date', missingDateReview)),
            /Review-filen mangler 01-01 \(Snøfnugg\)/,
            'review missing a required date'
        );

        const unknownDateReview = buildReview();
        unknownDateReview.words.push({
            monthDay: '02-29',
            word: 'Skuddårsdag',
            review: { status: 'approved', suggestedWord: '', note: '' }
        });
        assertFailingWith(
            runApply(writeReview(tempDir, 'unknown-date', unknownDateReview)),
            /Ukjent dato i review-fil: 02-29/,
            'review with unknown date'
        );

        const duplicateDateReview = buildReview();
        duplicateDateReview.words.push(duplicateDateReview.words[0]);
        assertFailingWith(
            runApply(writeReview(tempDir, 'duplicate-date', duplicateDateReview)),
            /Duplikat dato i review-fil: 01-01/,
            'review with duplicate date'
        );

        console.log('Validated word-review apply checks.');
    } finally {
        fs.rmSync(tempDir, { force: true, recursive: true });
    }
}

main();
