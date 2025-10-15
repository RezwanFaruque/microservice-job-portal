const express = require('express');
const router = express.Router();
const { createJob } = require('./controller/jobController');


router.post('/create', createJob);

module.exports = router;
