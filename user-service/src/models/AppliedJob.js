const mongoose = require('mongoose');


const AppliedJob = new mongoose.Schema({

    jobId : { type : mongoose.Schema.Types.ObjectId , required: true},
    userId : { type: mongoose.Schema.Types.ObjectId , required: true},
    appliedDate: { type : Date},
    status: { type : String }
});

module.exports = mongoose.model('AppliedJob',AppliedJob);