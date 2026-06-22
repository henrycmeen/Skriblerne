const mongoose = require('mongoose');

const wordReviewSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            default: 'shared',
            unique: true
        },
        reviewState: {
            type: Object,
            default: () => ({})
        }
    },
    {
        minimize: false,
        timestamps: true
    }
);

module.exports = mongoose.model('WordReview', wordReviewSchema);
