const mongoose = require('mongoose');


const appliedJobs = new mongoose.Schema({

    job: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Job',
    },

    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    coverLetter: { type: String, required: true },
    resume: { type: String, required: true },

    appliedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'UserCache',
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },

    employer: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'UserCache',
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

});

appliedJobs.index({ job: 1, userId: 1 }, { unique: true });

appliedJobs.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('AppliedJob', appliedJobs);
