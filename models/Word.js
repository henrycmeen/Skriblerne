const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
    dayOfYear: {
        type: Number,
        required: true,
        min: 1,
        max: 365,
        unique: true
    },
    monthDay: {
        type: String,
        required: true,
        match: /^\d{2}-\d{2}$/,
        unique: true
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    day: {
        type: Number,
        required: true,
        min: 1,
        max: 31
    },
    word: {
        type: String,
        unique: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Word', wordSchema);
