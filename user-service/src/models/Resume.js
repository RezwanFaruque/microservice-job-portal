const mongoose = require('mongoose');

const resumeSectionSchema = new mongoose.Schema({
    key: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
    order: { type: Number, default: 0 },
});

const resumeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    file: {
        originalName: { type: String, required: true },
        storageName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
    },
    sections: {
        type: [resumeSectionSchema],
        default: [],
    },
}, { timestamps: true });

module.exports = mongoose.model('Resume', resumeSchema);
