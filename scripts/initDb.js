require('dotenv').config();
const mongoose = require('mongoose');
const Word = require('../models/Word');
const fs = require('fs');
const path = require('path');

async function initializeDb() {
    try {
        // Read the ordbank.json file
        const ordbank = JSON.parse(fs.readFileSync(path.join(__dirname, '../ordbank.json'), 'utf8'));
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing words
        await Word.deleteMany({});
        console.log('Cleared existing words');

        // Create word objects with dates
        const today = new Date();
        const words = Object.entries(ordbank.days).map(([day, word]) => {
            const date = new Date(today);
            date.setDate(today.getDate() + (parseInt(day) - 1));
            return {
                word: word.toUpperCase(),
                date: date
            };
        });

        // Insert words into database
        await Word.insertMany(words);
        console.log(`Added ${words.length} words to database`);

        // Verify insertion
        const count = await Word.countDocuments();
        console.log(`Total words in database: ${count}`);

        await mongoose.connection.close();
        console.log('Database connection closed');
    } catch (error) {
        console.error('Error:', error);
    }
}

initializeDb();