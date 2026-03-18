const mongoose = require('mongoose');


const appliedJobs = new mongoose.Schema({

    job: {
        type: mongoose.Schema.Types.ObjectId , 
        required: true , 
        ref: 'Job'
    },

    applicants: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'UserCache',
    },


    coverLetter: { type: String },
    resumeUrl: { type : String , required: true},

    employer: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'UserCache',
    },

    
    createdAt : { type: Date, default: Date.now },
    updatedAt : { type: Date, default: Date.now }

});

appliedJobs.index({ job: 1 , applicants : 1 }, { unique : true});

appliedJobs.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('AppliedJob', appliedJobs);
