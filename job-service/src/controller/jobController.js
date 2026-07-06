const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const JobCategory = require('../models/JobCategory');
const Job = require('../models/Job');
const AppliedJob = require('../models/AppliedJobs');
const UserCache = require('../models/UserCache');

const employerSelect = 'userId userName email userType company';

async function resolvePostedBy(postedByRef) {
    if (!postedByRef) return null;

    return UserCache.findOne({
        $or: [{ _id: postedByRef }, { userId: postedByRef }],
        userType: 'employer',
    }).select(employerSelect);
}

const createJob = async (req, res) => {

    const { title , description , vacancy, category , location , salaryRange , jobType , postedBy , applicationDeadline} = req.body;
    // create eventdrivent architecture here 
    try {
        const userCache = await UserCache.findOne({ userId: postedBy });
        if (!userCache) {
            return res.status(400).send({ message: 'Employer not found. Please register and try again.' });
        }

        await Job.create({
            title, description, vacancy, category, location, salaryRange, jobType,
            postedBy: userCache._id,
            applicationDeadline,
        });
        return res.status(201).send({ message : `Job posted successfully`}); 
         
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }

    
}


// filter job with selected value

// IN FUTURE SHOULD IMPLEMENT ELASTIC SEARCH FOR TITLE SEARCH
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
            }).skip(skip).limit(pageLimit).lean(),
            Job.countDocuments(datafilter),
        ]);

        const jobsWithEmployer = await Promise.all(
            jobs.map(async (job) => ({
                ...job,
                postedBy: await resolvePostedBy(job.postedBy),
            }))
        );

        const data = {
            total : total,
            jobs : jobsWithEmployer,
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
            }).lean();

        if(job){
            job.postedBy = await resolvePostedBy(job.postedBy);

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

const applidedJobs = async (req, res) => {
    try {
        const {
            job,
            employer,
            firstName,
            lastName,
            email,
            phone,
            location,
            coverLetter,
        } = req.body;

        const userId = req.user.userId;
        const userCache = await UserCache.findOne({ userId });

        if (!userCache) {
            return res.status(404).json({
                success: false,
                message: 'User not found. Please log in again.',
            });
        }

        const requiredFields = { job, employer, firstName, lastName, email, phone, location, coverLetter };
        const missing = Object.entries(requiredFields)
            .filter(([, value]) => !value?.trim?.() && !value)
            .map(([key]) => key);

        if (missing.length) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missing.join(', ')}`,
            });
        }

        await AppliedJob.create({
            job,
            employer,
            appliedBy: userCache._id,
            userId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            location: location.trim(),
            coverLetter: coverLetter.trim(),
            resume: req.file.relativePath,
        });

        res.status(200).json({
            success: true,
            message: 'Job applied successfully',
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'You have already applied for this job',
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const getMyAppliedJobs = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { page = 1, limit = 10 } = req.query;

        const userCache = await UserCache.findOne({ userId });
        if (!userCache) {
            return res.status(404).json({
                status: 'not_found',
                success: false,
                message: 'User not found',
            });
        }

        const pageNumber = parseInt(page, 10);
        const pageLimit = parseInt(limit, 10);
        const skip = (pageNumber - 1) * pageLimit;

        const filter = { appliedBy: userCache._id };

        const [applications, total] = await Promise.all([
            AppliedJob.find(filter)
                .populate({
                    path: 'job',
                    select: 'title description vacancy location jobType salaryRange applicationDeadline createdAt category postedBy',
                    populate: { path: 'category', select: 'name' },
                })
                .populate({
                    path: 'appliedBy',
                    select: 'userId userName email userType',
                })
                .populate({
                    path: 'employer',
                    select: 'userId userName email company',
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageLimit)
                .lean(),
            AppliedJob.countDocuments(filter),
        ]);

        const enrichedApplications = await Promise.all(
            applications.map(async (application) => {
                const job = application.job
                    ? {
                        ...application.job,
                        postedBy: await resolvePostedBy(application.job.postedBy),
                    }
                    : null;

                return {
                    _id: application._id,
                    appliedAt: application.createdAt,
                    updatedAt: application.updatedAt,
                    applicant: {
                        firstName: application.firstName,
                        lastName: application.lastName,
                        email: application.email,
                        phone: application.phone,
                        location: application.location,
                        coverLetter: application.coverLetter,
                        resume: application.resume,
                        resumeUrl: `/${application.resume}`,
                        profile: application.appliedBy,
                    },
                    job,
                    employer: application.employer,
                };
            })
        );

        const data = {
            total,
            page: pageNumber,
            limit: pageLimit,
            applications: enrichedApplications,
        };

        return res.status(200).send({
            status: 'success',
            message: total > 0 ? 'Applied jobs fetched successfully' : 'No applied jobs found',
            data,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = { createJob , getJob , getJobDetails ,createCategory , getAllCategory , getJobFilterInfo , applidedJobs, getMyAppliedJobs };