const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
    word: {
        type: String,
        required: true,
        unique: true
    },
    date: {
        type: Date,
        required: true,
        unique: true
    }
});

module.exports = mongoose.model('Word', wordSchema);