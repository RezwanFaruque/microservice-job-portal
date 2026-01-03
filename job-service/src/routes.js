const express = require('express');
const router = express.Router();
const { createJob, getJob ,createCategory , getAllCategory } = require('./controller/jobController');


router.post('/create', createJob);
router.get('/get-jobs',getJob);
router.post('/job-category/create',createCategory);
router.get('/job-category/getall',getAllCategory);


module.exports = router;
