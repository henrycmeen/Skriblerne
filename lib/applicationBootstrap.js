async function bootstrapApplication({ connect, syncSteps = [], listen }) {
    await connect();

    for (const syncStep of syncSteps) {
        await syncStep();
    }

    return listen();
}

module.exports = { bootstrapApplication };
