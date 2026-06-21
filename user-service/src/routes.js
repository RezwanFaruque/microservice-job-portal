const express = require('express');
const router = express.Router();
const { registerUser , userLogin , userDetails } = require('./controller/userController');
const authMiddleware = require('./middleware/auth');


router.post('/register', registerUser);
router.post('/login', userLogin);
router.get('/user-details',authMiddleware,userDetails);

module.exports = router;
