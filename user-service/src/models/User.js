const express = require('express');
const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    userName : { type: String, required: true},
    email : { type: String, required: true, unique: true},
    password : { type: String, required: true},
    createdAt : { type: Date, default: Date.now },
    userType : {type: String , enum: ['job_seeker', 'employer'], required: true},

    // Additional fields can be added as needed like company information
    company : {
        name : { type: String },
        location : { type: String },
        website : { type: String },
        description : { type: String },
        industry : { type: String}

        // Add more fields as necessary will be added here
    }

});


userSchema.pre('save', function(next){
    if(this.userType === 'employer' &&  !this.company?.name){
        return next(new Error('Company information is required for employers'));
    }else{
        next();
    }
})



module.exports = mongoose.model('User', userSchema);

