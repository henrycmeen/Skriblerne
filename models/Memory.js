const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema(
    {
        year: {
            type: Number,
            required: true,
            min: 1900,
            max: 9999
        },
        monthDay: {
            type: String,
            required: true,
            match: /^\d{2}-\d{2}$/
        },
        owner: {
            type: String,
            required: true,
            enum: ['henry', 'ellinor'],
            default: 'henry',
            lowercase: true,
            trim: true
        },
        dayOfYear: {
            type: Number,
            required: true,
            min: 1,
            max: 365
        },
        word: {
            type: String,
            required: true
        },
        imageData: {
            type: String,
            required: true
        },
        thumbnailData: {
            type: String,
            required: true
        },
        mimeType: {
            type: String,
            required: true,
            enum: ['image/jpeg', 'image/png', 'image/webp']
        },
        originalName: {
            type: String,
            default: ''
        }
    },
    {
        timestamps: true
    }
);

memorySchema.index({ year: 1, monthDay: 1, owner: 1 }, { unique: true });
memorySchema.index({ monthDay: 1, year: -1, owner: 1 });

module.exports = mongoose.model('Memory', memorySchema);
