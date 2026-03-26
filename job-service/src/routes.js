const express = require('express');
const router = express.Router();
const { upload , handleMulterError , saveToDisk } = require('./middleware/fileUpload');
const authMiddleware = require('./middleware/auth');
const checkDuplicateApplication = require('./controller/validation/checkDupplicateApply');
const { createJob, getJob, getJobDetails ,createCategory , getAllCategory,getJobFilterInfo , applidedJobs} = require('./controller/jobController');


router.post('/create', createJob);
router.get('/get-jobs',getJob);
router.get('/get-job-details/:id',getJobDetails);
router.post('/job-category/create',createCategory);
router.get('/job-category/getall',getAllCategory);
router.get('/get-job-filter-info',getJobFilterInfo);
router.post('/apply', authMiddleware,upload.single('resumeUrl'), handleMulterError, checkDuplicateApplication , saveToDisk ,applidedJobs);



module.exports = router;
