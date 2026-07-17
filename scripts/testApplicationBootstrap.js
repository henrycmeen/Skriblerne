const assert = require('node:assert/strict');
const { bootstrapApplication } = require('../lib/applicationBootstrap');

async function main() {
    const events = [];
    const listener = await bootstrapApplication({
        connect: async () => events.push('connect'),
        syncSteps: [
            async () => events.push('sync-memory'),
            async () => events.push('sync-words')
        ],
        listen: () => {
            events.push('listen');
            return { listening: true };
        }
    });

    assert.deepEqual(events, ['connect', 'sync-memory', 'sync-words', 'listen']);
    assert.deepEqual(listener, { listening: true });

    let listenedAfterFailure = false;
    await assert.rejects(
        bootstrapApplication({
            connect: async () => {},
            syncSteps: [
                async () => {
                    throw new Error('temporary MongoDB error');
                }
            ],
            listen: () => {
                listenedAfterFailure = true;
            }
        }),
        /temporary MongoDB error/
    );
    assert.equal(listenedAfterFailure, false);

    console.log('Validated database bootstrap before server listen.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
