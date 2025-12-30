const express = require('express');
const router = express.Router();
const JobCategory = require('../models/JobCategory');
const Job = require('../models/Job');


const createJob = async (req, res) => {

    const { title , description , vacancy, category , location , salaryRange , jobType , postedBy , applicationDeadline} = req.body;
    // create eventdrivent architecture here 
    try {
        const newjob =  await Job.create({title,description,vacancy,category,location,salaryRange,jobType,postedBy,applicationDeadline});
        return res.status(201).send({ message : `Job posted successfully`}); 
         
    } catch (error) {
        return res.error(error);
    }

    
}


// filter job with selected value
const getJob = async(req, res) => {

}


const createCategory = async( req, res) =>{

   const { name , description } = req.body;

   try {
    const category = await JobCategory.create({ name , description});
    return res.status(201).send({ status : 'success' , message:  'Job Category created successfully', date: category });
    
   } catch (error) {

     return res.error(error);
   }


}



const getAllCategory= async( req, res) =>{

     try {
        
        const categories = await JobCategory.find();
        let response ;

        if(categories.length > 0){

            response = { status: 'success' , 'message' : 'Job category found' ,data : categories };
            
        }else{

            response = { status : 'success' , message: ' Job category empty' , data: categories};
        }


        return res.status(201).send(response);

     } catch (error) {
        
        return res.error(error);

     }
}

module.exports = { createJob , getJob , createCategory , getAllCategory };