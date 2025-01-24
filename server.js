require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const Word = require('./models/Word');

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Serve static files
app.use(express.static(__dirname));
app.use(express.json());

// Get today's word
app.get('/api/word/today', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const word = await Word.findOne({
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });
        
        if (!word) {
            return res.status(404).json({ error: 'No word found for today' });
        }
        res.json(word);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add new word
app.post('/api/word', async (req, res) => {
    try {
        // Check for duplicate word
        const existingWord = await Word.findOne({ word: req.body.word.toUpperCase() });
        if (existingWord) {
            return res.status(400).json({ error: 'Dette ordet finnes allerede' });
        }

        // Find the latest date in the database
        const latestWord = await Word.findOne().sort({ date: -1 });
        const nextDate = latestWord 
            ? new Date(latestWord.date.getTime() + 24 * 60 * 60 * 1000)
            : new Date();

        const newWord = new Word({
            word: req.body.word.toUpperCase(),
            date: nextDate
        });

        await newWord.save();
        res.json(newWord);
    } catch (error) {
        res.status(500).json({ error: 'Could not add word' });
    }
});

// Get all words - add more error handling and logging
app.get('/api/words', async (req, res) => {
    try {
        console.log('Fetching all words...');
        const words = await Word.find().sort({ date: 1 });
        console.log('Found words:', words);
        res.json(words);
    } catch (error) {
        console.error('Error fetching words:', error);
        res.status(500).json({ error: 'Could not fetch words', details: error.message });
    }
});

app.get('/api/word/random', async (req, res) => {
    try {
        const word = await Word.aggregate([{ $sample: { size: 1 } }]);
        res.json(word[0]);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});