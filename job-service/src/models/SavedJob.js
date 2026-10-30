const mongoose = require('mongoose');

const savedJobSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Job',
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    savedAt: { type: Date, default: Date.now },
});

savedJobSchema.index({ userId: 1, job: 1 }, { unique: true });

module.exports = mongoose.model('SavedJob', savedJobSchema);
