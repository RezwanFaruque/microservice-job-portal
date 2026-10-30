const multer = require('multer');
const path = require('path');

const imageTypes = new Map([
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.png', 'image/png'],
    ['.webp', 'image/webp'],
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        if (imageTypes.get(extension) === file.mimetype) {
            return callback(null, true);
        }

        callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    },
});

const handleProfilePictureUploadError = (error, req, res, next) => {
    if (!(error instanceof multer.MulterError)) {
        return next(error);
    }

    const messages = {
        LIMIT_FILE_SIZE: 'Profile picture must be 5MB or smaller',
        LIMIT_FILE_COUNT: 'Only one profile picture can be uploaded',
        LIMIT_UNEXPECTED_FILE: 'Upload one JPG, PNG, or WebP image using the "profilePicture" field',
    };

    return res.status(400).json({
        message: messages[error.code] || 'Profile picture upload failed',
    });
};

module.exports = {
    uploadProfilePicture: upload.single('profilePicture'),
    handleProfilePictureUploadError,
};
