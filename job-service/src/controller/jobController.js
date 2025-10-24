const express = require('express');
const router = express.Router();
const JobCategory = require('../models/JobCategory');


const createJob = async (req, res) => {

    const { title , description , location , salaryRange , jobType , postedBy} = req.body;
    // create eventdrivent architecture here 


    // Logic to create a job
    res.status(201).send({ message : `Job posted by ${postedBy}` });    
    
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

module.exports = { createJob , createCategory , getAllCategory };