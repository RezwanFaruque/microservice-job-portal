const express = require('express');
const router = express.Router();
const {
    registerUser,
    userLogin,
    userDetails,
    uploadResume,
    getResume,
    downloadResume,
    updateResumeSections,
    deleteResume,
} = require('./controller/userController');
const authMiddleware = require('./middleware/auth');
const {
    uploadResume: resumeUpload,
    handleResumeUploadError,
    requireJobSeeker,
} = require('./middleware/resumeUpload');


router.post('/register', registerUser);
router.post('/login', userLogin);
router.get('/user-details',authMiddleware,userDetails);
router.post('/resume', authMiddleware, requireJobSeeker, resumeUpload, handleResumeUploadError, uploadResume);
router.get('/resume', authMiddleware, requireJobSeeker, getResume);
router.get('/resume/file', authMiddleware, requireJobSeeker, downloadResume);
router.patch('/resume', authMiddleware, requireJobSeeker, updateResumeSections);
router.delete('/resume', authMiddleware, requireJobSeeker, deleteResume);

module.exports = router;
