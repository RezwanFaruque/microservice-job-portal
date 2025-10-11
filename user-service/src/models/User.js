const express = require('express');
const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    userName : { type: String, required: true},
    email : { type: String, required: true, unique: true},
    password : { type: String, required: true},
    createdAt : { type: Date, default: Date.now },
    userType : {type: String , enum: ['job_seeker', 'employer'], required: true}

});

module.exports = mongoose.model('User', userSchema);

