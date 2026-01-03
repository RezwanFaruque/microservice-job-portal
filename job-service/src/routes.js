const express = require('express');
const router = express.Router();
const { createJob, getJob, getJobDetails ,createCategory , getAllCategory } = require('./controller/jobController');


router.post('/create', createJob);
router.get('/get-jobs',getJob);
router.get('/get-job-details/:id',getJobDetails);
router.post('/job-category/create',createCategory);
router.get('/job-category/getall',getAllCategory);


module.exports = router;
