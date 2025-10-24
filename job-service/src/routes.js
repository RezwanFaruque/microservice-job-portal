const express = require('express');
const router = express.Router();
const { createJob ,createCategory , getAllCategory } = require('./controller/jobController');


router.post('/create', createJob);
router.post('/job-category/create',createCategory);
router.get('/job-category/getall',getAllCategory);


module.exports = router;
