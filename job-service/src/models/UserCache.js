const mongoose = require('mongoose');


const userCacheSchema = new mongoose.Schema({
    userId : { type: mongoose.Schema.Types.ObjectId},
    userName : { type: String},
    email : { type: String},
    userType : {type: String},
    company : {
        name : { type: String },
        location : { type: String },
        website : { type: String },
        description : { type: String },
        industry : { type: String}
    },
    createdAt : { type: Date, default: Date.now },
});

module.exports = mongoose.model('UserCache', userCacheSchema);