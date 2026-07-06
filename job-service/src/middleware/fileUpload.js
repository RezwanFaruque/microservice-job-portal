const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Upload directory ─────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/resumes');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ── Allowed file types ───────────────────────────────────────────
const ALLOWED_EXTENSIONS = /\.(pdf|doc|docx)$/i;
const ALLOWED_MIMETYPES  = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// ── File filter ──────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
    const validExt      = ALLOWED_EXTENSIONS.test(path.extname(file.originalname));
    const validMimetype = ALLOWED_MIMETYPES.includes(file.mimetype);

    if (validExt && validMimetype) return cb(null, true);

    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only PDF and Word documents are allowed'));
};

// ── Memory storage — file stays in RAM, not saved to disk yet ────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files:    1,
    },
    fileFilter,
});

// ── Saves file to disk only after all validations pass ───────────
const saveToDisk = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message:  'Resume file is required',
        });
    }

    const ext      = path.extname(req.file.originalname).toLowerCase();
    const baseName = path.basename(req.file.originalname, ext)
                         .replace(/\s+/g, '-')
                         .replace(/[^a-zA-Z0-9-_]/g, '');
    const uniqueName = `${Date.now()}-${baseName}${ext}`;
    const filePath   = path.join(uploadDir, uniqueName);

    fs.writeFile(filePath, req.file.buffer, (err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Failed to save resume file',
            });
        }

        req.file.path = filePath;
        req.file.relativePath = path.join('uploads', 'resumes', uniqueName).replace(/\\/g, '/');
        next();
    });
};

// ── Multer error handler ─────────────────────────────────────────
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const messages = {
            LIMIT_FILE_SIZE:       'File size must be under 5MB',
            LIMIT_FILE_COUNT:      'Only one file can be uploaded at a time',
            LIMIT_UNEXPECTED_FILE: 'Only PDF and Word documents are allowed',
        };

        return res.status(400).json({
            success: false,
            message: messages[err.code] || 'File upload error',
        });
    }

    next(err);
};

module.exports = { upload, saveToDisk, handleMulterError };