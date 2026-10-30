const mongoose = require('mongoose');
const Job = require('../models/Job');
const SavedJob = require('../models/SavedJob');

function getAuthenticatedUserId(req, res) {
    const userId = req.user?.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        res.status(401).json({
            success: false,
            message: 'Unauthorized: Invalid user identity',
        });
        return null;
    }

    return userId;
}

function isValidJobId(jobId, res) {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
        res.status(400).json({
            success: false,
            message: 'Invalid job ID',
        });
        return false;
    }

    return true;
}

const saveJob = async (req, res) => {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId || !isValidJobId(req.params.jobId, res)) return;

    try {
        const jobExists = await Job.exists({ _id: req.params.jobId });
        if (!jobExists) {
            return res.status(404).json({
                success: false,
                message: 'Job not found',
            });
        }

        const result = await SavedJob.updateOne(
            { userId, job: req.params.jobId },
            { $setOnInsert: { userId, job: req.params.jobId } },
            { upsert: true }
        );

        return res.status(result.upsertedCount ? 201 : 200).json({
            success: true,
            message: result.upsertedCount ? 'Job saved successfully' : 'Job already saved',
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(200).json({
                success: true,
                message: 'Job already saved',
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const getSavedJobs = async (req, res) => {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    if (!Number.isInteger(page) || page < 1
        || !Number.isInteger(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({
            success: false,
            message: 'Page must be a positive integer and limit must be between 1 and 100',
        });
    }

    try {
        const filter = { userId };
        const skip = (page - 1) * limit;
        const [savedJobs, total] = await Promise.all([
            SavedJob.find(filter)
                .populate({
                    path: 'job',
                    select: 'title description vacancy location jobType salaryRange applicationDeadline createdAt category postedBy',
                    populate: [
                        { path: 'category', select: 'name' },
                        { path: 'postedBy', select: 'userId userName email userType company' },
                    ],
                })
                .sort({ savedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            SavedJob.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: total ? 'Saved jobs fetched successfully' : 'No saved jobs found',
            data: { total, page, limit, savedJobs },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const removeSavedJob = async (req, res) => {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId || !isValidJobId(req.params.jobId, res)) return;

    try {
        const result = await SavedJob.deleteOne({ userId, job: req.params.jobId });
        if (!result.deletedCount) {
            return res.status(404).json({
                success: false,
                message: 'Saved job not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Saved job removed successfully',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = { saveJob, getSavedJobs, removeSavedJob };
