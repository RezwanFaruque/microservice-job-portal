const  mongoose = require('mongoose');


const jobSchema = new mongoose.Schema({
    title : { type: String, required: true },
    description : { type: String, required: true },
    vacancy: { type : Number , required: true},
    category: { type : mongoose.Schema.Types.ObjectId , ref: 'JobCategory', required : true },
    location : { type: String, required: true },
    salaryRange : { type: String },
    jobType : {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'remote', 'internship', 'freelance', 'training'],
        required: true,
    },
    seniorityLevel: {
        type: String,
        enum: ['student-level', 'entry-level', 'mid-level', 'senior-level'],
    },
    postedBy : { type: mongoose.Schema.Types.ObjectId, ref: 'UserCache', required: true },
    applicationDeadline: {type: Date},
    createdAt : { type: Date, default: Date.now },
    updatedAt : { type: Date, default: Date.now }

})

module.exports = mongoose.model('Job', jobSchema);