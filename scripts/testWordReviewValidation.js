const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { WORD_CYCLE } = require('../data/wordCycle');

const APPLY_SCRIPT = path.join(__dirname, 'applyWordReview.js');
const FIRST_PASS_SCRIPT = path.join(__dirname, 'createFirstPassReview.js');
const STATUS_SCRIPT = path.join(__dirname, 'reviewStatus.js');

function buildReview(overrides = {}) {
    return {
        reviewedAt: '2026-06-22T00:00:00.000Z',
        words: WORD_CYCLE.map((word) => ({
            ...word,
            review: {
                status: 'approved',
                suggestedWord: '',
                note: '',
                reviewers: {
                    henry: true,
                    ellinor: true
                },
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

function runStatus(reviewPath) {
    return spawnSync(process.execPath, [STATUS_SCRIPT, reviewPath], {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8'
    });
}

function runFirstPass(outputPath) {
    return spawnSync(process.execPath, [FIRST_PASS_SCRIPT, '--output', outputPath], {
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
        const validReviewStatus = runStatus(writeReview(tempDir, 'valid-status', validReview));
        assertPass(validReviewStatus, 'valid review status');
        assert.match(validReviewStatus.stdout, /Markert: 365\/365/);
        assert.match(validReviewStatus.stdout, /Henry: 365\/365/);
        assert.match(validReviewStatus.stdout, /Ellinor: 365\/365/);
        assert.match(validReviewStatus.stdout, /Klar for apply: ja/);

        const partialReview = buildReview({
            '01-01': { status: 'flagged', suggestedWord: '' },
            '01-02': { status: '' }
        });
        const partialReviewStatus = runStatus(writeReview(tempDir, 'partial-status', partialReview));
        assertPass(partialReviewStatus, 'partial review status');
        assert.match(partialReviewStatus.stdout, /Markert: 364\/365/);
        assert.match(partialReviewStatus.stdout, /Uavklarte: 2/);
        assert.match(partialReviewStatus.stdout, /Klar for apply: nei/);

        const firstPassPath = path.join(tempDir, 'first-pass.json');
        assertPass(runFirstPass(firstPassPath), 'first-pass review export');
        const firstPass = JSON.parse(fs.readFileSync(firstPassPath, 'utf8'));
        assert.equal(firstPass.words.length, 365);
        assert.equal(firstPass.stats.candidates, 20);
        assert.equal(
            firstPass.words.filter((word) => word.review.status === 'flagged').length,
            20
        );
        assert.deepEqual(
            firstPass.words[0].review.reviewers,
            { henry: false, ellinor: false }
        );
        assert.equal(
            firstPass.words.find((word) => word.monthDay === '12-30').review.suggestedWord,
            'Nyttårsglass'
        );
        const firstPassStatus = runStatus(firstPassPath);
        assertPass(firstPassStatus, 'first-pass review status');
        assert.match(firstPassStatus.stdout, /Markert: 20\/365/);
        assert.match(firstPassStatus.stdout, /Henry: 0\/365/);
        assert.match(firstPassStatus.stdout, /Ellinor: 0\/365/);
        assert.match(firstPassStatus.stdout, /Klar for apply: nei/);

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

        const missingReviewerReview = buildReview({
            '01-01': { reviewers: { henry: true, ellinor: false } }
        });
        assertFailingWith(
            runApply(writeReview(tempDir, 'missing-reviewer', missingReviewerReview)),
            /01-01 \(Snøfnugg\) mangler gjennomgang fra Ellinor/,
            'review without both reviewers'
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
