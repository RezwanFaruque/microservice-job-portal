const  mongoose = require('mongoose');


const jobSchema = new mongoose.Schema({
    title : { type: String, required: true },
    description : { type: String, required: true },
    location : { type: String, required: true },
    salaryRange : { type: String },
    jobType : { type: String, enum: ['full-time', 'part-time', 'contract'], required: true },
    postedBy : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt : { type: Date, default: Date.now },
    updatedAt : { type: Date, default: Date.now }

})

module.exports = mongoose.model('Job', jobSchema);