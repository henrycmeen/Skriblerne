require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Memory = require('./models/Memory');
const Word = require('./models/Word');
const {
    WORD_CYCLE,
    formatDateForYear,
    getMonthDayFromDate,
    getWordForMonthDay,
    isValidMonthDay
} = require('./data/wordCycle');

const app = express();
const port = process.env.PORT || 3000;
const MAX_IMAGE_DATA_LENGTH = 7_500_000;
const EDIT_CODE_HEADER = 'x-skriblerne-edit-code';
const ALLOWED_ORIGINS = new Set([
    'https://henrymeen.no',
    'https://www.henrymeen.no',
    'https://henrycmeen.github.io'
]);

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        await syncWordCycle();
        console.log('Connected to MongoDB');
    })
    .catch(err => console.error('MongoDB connection error:', err));

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.has(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Headers', `Content-Type, ${EDIT_CODE_HEADER}`);
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    }

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

// Serve static files
app.use(express.static(__dirname));
app.use(express.json({ limit: '8mb' }));

app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});

app.get('/healthz', (req, res) => {
    res.json({ status: 'ok' });
});

function normalizeYear(value) {
    const year = Number.parseInt(value, 10);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1900 || year > 9999) {
        return currentYear;
    }
    return year;
}

function serializeMemory(memory, { includeImage = false } = {}) {
    if (!memory) {
        return null;
    }

    return {
        id: memory._id,
        year: memory.year,
        monthDay: memory.monthDay,
        dayOfYear: memory.dayOfYear,
        word: memory.word,
        thumbnailData: memory.thumbnailData,
        imageData: includeImage ? memory.imageData : undefined,
        mimeType: memory.mimeType,
        originalName: memory.originalName,
        createdAt: memory.createdAt,
        updatedAt: memory.updatedAt
    };
}

function validateImagePayload({ imageData, thumbnailData, mimeType }) {
    const validDataUrl = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        return 'Bildet må være JPEG, PNG eller WebP.';
    }

    if (
        typeof imageData !== 'string' ||
        typeof thumbnailData !== 'string' ||
        !validDataUrl.test(imageData) ||
        !validDataUrl.test(thumbnailData)
    ) {
        return 'Ugyldig bildedata.';
    }

    if (imageData.length > MAX_IMAGE_DATA_LENGTH) {
        return 'Bildet er for stort etter komprimering.';
    }

    return null;
}

function requireEditCode(req, res, next) {
    const configuredCode = process.env.SKRIBLERNE_EDIT_CODE;

    if (!configuredCode) {
        return res.status(503).json({ error: 'Bildeopplasting er ikke aktivert.' });
    }

    if (req.get(EDIT_CODE_HEADER) !== configuredCode) {
        return res.status(401).json({ error: 'Feil lagringskode.' });
    }

    next();
}

async function dropLegacyWordIndexes() {
    const indexes = await Word.collection.indexes();
    const legacyIndexNames = new Set(['date_1']);

    await Promise.all(
        indexes
            .filter((index) => legacyIndexNames.has(index.name))
            .map((index) => Word.collection.dropIndex(index.name))
    );
}

async function syncWordCycle() {
    await dropLegacyWordIndexes();
    await Word.deleteMany({
        $or: [
            { dayOfYear: { $exists: false } },
            { monthDay: { $exists: false } },
            { monthDay: { $nin: WORD_CYCLE.map((entry) => entry.monthDay) } }
        ]
    });

    await Word.bulkWrite(
        WORD_CYCLE.map((entry) => ({
            updateOne: {
                filter: { monthDay: entry.monthDay },
                update: { $set: entry },
                upsert: true
            }
        }))
    );
}

// Get today's word
app.get('/api/word/today', async (req, res) => {
    const today = new Date();
    const monthDay = getMonthDayFromDate(today);
    const word = getWordForMonthDay(monthDay);

    if (!word) {
        return res.status(404).json({ error: 'Ingen ord for denne datoen' });
    }

    res.json({
        ...word,
        year: today.getFullYear(),
        date: formatDateForYear(today.getFullYear(), monthDay)
    });
});

app.get('/api/words', async (req, res) => {
    res.json(WORD_CYCLE);
});

app.get('/api/calendar/:year', async (req, res) => {
    try {
        const year = normalizeYear(req.params.year);
        const memories = await Memory.find({ year }).select('-imageData').lean();
        const memoriesByDate = new Map(memories.map((memory) => [memory.monthDay, memory]));

        res.json({
            year,
            days: WORD_CYCLE.map((day) => ({
                ...day,
                date: formatDateForYear(year, day.monthDay),
                memory: serializeMemory(memoriesByDate.get(day.monthDay))
            }))
        });
    } catch (error) {
        console.error('Error fetching calendar:', error);
        res.status(500).json({ error: 'Kunne ikke hente årsoversikt' });
    }
});

app.get('/api/memory/:year/:monthDay', async (req, res) => {
    try {
        const year = normalizeYear(req.params.year);
        const { monthDay } = req.params;

        if (!isValidMonthDay(monthDay)) {
            return res.status(400).json({ error: 'Ugyldig dato' });
        }

        const memory = await Memory.findOne({ year, monthDay }).lean();
        res.json({ memory: serializeMemory(memory, { includeImage: true }) });
    } catch (error) {
        console.error('Error fetching memory:', error);
        res.status(500).json({ error: 'Kunne ikke hente bilde' });
    }
});

app.get('/api/memories/day/:monthDay', async (req, res) => {
    try {
        const { monthDay } = req.params;

        if (!isValidMonthDay(monthDay)) {
            return res.status(400).json({ error: 'Ugyldig dato' });
        }

        const memories = await Memory.find({ monthDay }).sort({ year: -1 }).lean();
        res.json({ memories: memories.map((memory) => serializeMemory(memory, { includeImage: true })) });
    } catch (error) {
        console.error('Error fetching day memories:', error);
        res.status(500).json({ error: 'Kunne ikke hente tidligere år' });
    }
});

app.post('/api/memories', requireEditCode, async (req, res) => {
    try {
        const year = normalizeYear(req.body.year);
        const { monthDay, imageData, thumbnailData, mimeType, originalName = '' } = req.body;
        const word = getWordForMonthDay(monthDay);

        if (!word) {
            return res.status(400).json({ error: 'Ugyldig dato' });
        }

        const imageError = validateImagePayload({ imageData, thumbnailData, mimeType });
        if (imageError) {
            return res.status(400).json({ error: imageError });
        }

        const memory = await Memory.findOneAndUpdate(
            { year, monthDay },
            {
                year,
                monthDay,
                dayOfYear: word.dayOfYear,
                word: word.word,
                imageData,
                thumbnailData,
                mimeType,
                originalName: String(originalName).slice(0, 120)
            },
            {
                new: true,
                runValidators: true,
                upsert: true
            }
        ).lean();

        res.json({ memory: serializeMemory(memory, { includeImage: true }) });
    } catch (error) {
        console.error('Error saving memory:', error);
        res.status(500).json({ error: 'Kunne ikke lagre bildet' });
    }
});

app.post('/api/word', (_req, res) => {
    res.status(410).json({ error: 'Ordlisten er fast i Skriblerne 2.0' });
});

app.post('/api/words', (_req, res) => {
    res.status(410).json({ error: 'Ordlisten er fast i Skriblerne 2.0' });
});

app.get('/api/word/random', (_req, res) => {
    const word = WORD_CYCLE[Math.floor(Math.random() * WORD_CYCLE.length)];
    res.json(word);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
