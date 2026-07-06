const AppliedJob = require('../../models/AppliedJobs');

const checkDuplicateApplication = async (req, res, next) => {
    try {
        const { job } = req.body;
        const userId = req.user.userId;

        if (!job) {
            return res.status(400).json({
                success: false,
                message: 'Job is required',
            });
        }

        const alreadyApplied = await AppliedJob.findOne({ job, userId });

        if (alreadyApplied) {
            return res.status(409).json({
                success: false,
                message: 'You have already applied for this job',
            });
        }

        next();

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = checkDuplicateApplication;
