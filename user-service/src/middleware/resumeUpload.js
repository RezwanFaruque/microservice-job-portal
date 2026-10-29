const multer = require('multer');
const path = require('path');

const allowedMimeTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = new Set(['.pdf', '.doc', '.docx']);

        if (allowedExtensions.has(extension) && allowedMimeTypes.has(file.mimetype)) {
            return callback(null, true);
        }

        callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    },
});

const handleResumeUploadError = (error, req, res, next) => {
    if (!(error instanceof multer.MulterError)) {
        return next(error);
    }

    const messages = {
        LIMIT_FILE_SIZE: 'Resume file must be 5MB or smaller',
        LIMIT_FILE_COUNT: 'Only one resume file can be uploaded',
        LIMIT_UNEXPECTED_FILE: 'Upload one PDF or Word document using the "resume" field',
    };

    return res.status(400).json({
        message: messages[error.code] || 'Resume upload failed',
    });
};

const requireJobSeeker = (req, res, next) => {
    if (req.user.userType !== 'job_seeker') {
        return res.status(403).json({ message: 'Only job seekers can upload resumes' });
    }

    next();
};

module.exports = {
    uploadResume: upload.single('resume'),
    handleResumeUploadError,
    requireJobSeeker,
};
