const express = require('express');
const router = express.Router();


const createJob = async (req, res) => {

    const { title , description , location , salaryRange , jobType , postedBy} = req.body;
    // create eventdrivent architecture here 


    // Logic to create a job
    res.status(201).send({ message : `Job posted by ${postedBy}` });    
    
}

module.exports = { createJob };