const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const JobCategory = require('../models/JobCategory');
const Job = require('../models/Job');
const AppliedJob = require('../models/AppliedJobs');


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
    try{
        const {category , title ,location , salaryRange , jobType , page = 1 , limit = 10} = req.query;
        let datafilter = {};

        if(category){
            datafilter.category = category;
        }
        if(location){
            datafilter.location = location;

        }

        if(salaryRange){
            datafilter.salaryRange = salaryRange;
        }

        if(jobType){
            datafilter.jobType = jobType;
        }

        if(title){
            datafilter.title = {$regex: title , $options: "i"};
        }

        const pageNumber = parseInt(page);
        const pageLimit = parseInt(limit);
        const skip = (pageNumber - 1) * pageLimit;

        const [ jobs , total ] = await Promise.all([
            Job.find(datafilter).populate({
                path: 'category',
                select: 'id name'
            }).populate({
                path: 'postedBy',
                match: {userType : 'employer'},
                select: 'userId userName email userType compay'
            }).skip(skip).limit(pageLimit),
            Job.countDocuments(datafilter),
        ]);

        const data = {
            total : total,
            jobs : jobs,
            page : pageNumber,
            limit : pageLimit
        }

        if(total <= 0){
            return res.status(404).send({
                message: 'Jobs Not found!',
                data : data
            });
        }
        
        return res.status(200).send({
            message: 'Jobs successfuly found!',
            data : data
        });
        
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

const getJobDetails= async(req, res) =>{

    try {
        
        const { id } = req.params;
        const job = await Job.findOne({_id: id}).populate({
                path: 'category',
                select: 'id name'
            }).populate({
                path: 'postedBy',
                match: {userType : 'employer'},
                select: 'userId userName email userType compay'
            });

        if(job){
            
            return res.status(200).send({
                status : 'success',
                message: 'Job detaiils found!',
                data: job
            });
        }else{
             return res.status(404).send({
                status : 'not_found',
                message: 'Job detaiils not found!',
                data: []
            });
        }

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }

   


}

const createCategory = async( req, res) =>{

   const { name , description } = req.body;

   try {
    const category = await JobCategory.create({ name , description});
    return res.status(201).send({ status : 'success' , message:  'Job Category created successfully', date: category });
    
   } catch (error) {

    return res.status(500).json({
        success: false,
        message: error.message,
    });
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
        
        return res.status(500).json({
            success: false,
            message: error.message,
        });

     }
}

const getJobFilterInfo = async(req , res) =>{

    try {

        const  [ jobtypestats , jobsalarystats ] = await Promise.all([

            Job.aggregate([
                {
                    $group : {
                        _id : '$jobType',
                        count: {$sum: 1}

                    }
                },

                {
                    $project:{
                        _id : 0,
                        jobType : '$_id',
                        count: 1,
                    }
                }
            ]),

            Job.aggregate([
                {
                    $group : {
                        _id: '$salaryRange',
                        count: { $sum : 1}
                    }
                },

                {
                    $project:{
                        _id: 0 , 
                        salaryRange: '$_id',
                        count: 1
                    }
                }
            ])
        ]);

        const response = { status: 'success' , message: 'filter stats fetched successfully!' , jobType: jobtypestats , salaryrange : jobsalarystats }
        
        return res.status(201).send(response);

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }

}

const applidedJobs = async(req, res) =>{

    try {
        
        const { job: jobId , applicants: userId , coverLetter , employer: employerId } =  req.body;


        const appliedJob = {
            job ,
            applicants,
            coverLetter,
            employer,
            resumeUrl: req.file.path
        }

        const apply = await AppliedJob.create(appliedJob);

        res.status(200).json({
            success: true,
            message: 'Job applied successfully'
        });
        

    } catch (error) {

         return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

module.exports = { createJob , getJob , getJobDetails ,createCategory , getAllCategory , getJobFilterInfo , applidedJobs };