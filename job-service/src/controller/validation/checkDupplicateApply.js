const AppliedJob = require('../../models/AppliedJobs');
const UserCache  = require('../../models/UserCache');

const checkDuplicateApplication = async (req, res, next) => {
    try {
        const { job } = req.body;
        const userId  = req.user.userId;

        const userInfo = await UserCache.findOne({ userId });

        if (!userInfo) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const alreadyApplied = await AppliedJob.findOne({
            job,
            applicants: userInfo._id,
        });

        if (alreadyApplied) {
            return res.status(409).json({
                success: false,
                message: 'You have already applied for this job',
            });
        }

        req.userInfo = userInfo;
        next();

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = checkDuplicateApplication;