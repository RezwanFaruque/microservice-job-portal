const user = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const { publishMessage, queueName } = require("../rabbitmq");
const Resume = require("../models/Resume");

const resumeUploadDirectory = path.resolve(__dirname, "../../uploads/resumes");
const profilePictureDirectory = path.resolve(__dirname, "../../uploads/profile-pictures");

const isValidResumeSections = (sections) => Array.isArray(sections)
    && !sections.some((section) => (
        !section
        || typeof section !== 'object'
        || Array.isArray(section)
        || typeof section.key !== 'string'
        || !section.key.trim()
        || typeof section.title !== 'string'
        || !section.title.trim()
        || !Object.prototype.hasOwnProperty.call(section, 'content')
        || section.content === null
        || (section.order !== undefined
            && (typeof section.order !== 'number' || !Number.isFinite(section.order)))
    ));



const registerUser = async (req, res) => {

    const { userName, email, password, userType } = req.body;
    const { company } = req.body;

    try {
        // Check if user already exists
        const existingUser = await user.findOne({ email });
        if (existingUser) {
            return res.status(400).send({ message: 'User already exists' });
        }
        // Create new user
        let newUser;
        const hashedPassword = await bcrypt.hash(password, 10);
        if(userType === 'job_seeker'){ 
             newUser = await user.create({ userName, email, password: hashedPassword, userType });
        }else{

             newUser = await user.create({ userName, email, password: hashedPassword, userType, company: company });
        }
        
        await publishMessage(queueName, { event: 'USER_REGISTERED', data: newUser });
        res.status(201).send({ message: 'User registered successfully', data: newUser });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
}


const userLogin = async (req, res) => {
    const { email, password } = req.body;

    if(!email || !password){
        return res.status(400).send({ message: 'Email and password are required' });
    }
    
    try {
        const getuser = await user.findOne({email});
        if(!getuser){
            return res.status(400).send({ message: 'User not found' });
        }

        if(getuser){
            const isPasswordValid = await bcrypt.compare(password, getuser.password);
            if(!isPasswordValid){
                return res.status(400).send({ message: 'Invalid password' });
            }

            const token = jwt.sign({ userId: getuser._id, email: getuser.email, userType: getuser.userType }, process.env.JWT_SECRET || 'secretkey',
                { expiresIn: '6h' });

            res.status(200).send({ message: 'Login successful', token , user: { userId: getuser._id, email: getuser.email, userType: getuser.userType } });
        }else{
            return res.status(400).send({ message: 'Invalid credentials' });
        }

    }catch( error ){
        console.error('Error during user login:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
}


const userDetails = async (req, res) =>{

    const  userId  = req.user.userId;
    
    try {

        const userDetails = await user.findById(userId).select("-password -__v");

        if(!userDetails){
            return res.status(400).send({ message: 'User not found' });
        }

        res.status(200).send({ message: 'User details fetched successfully!' , user: userDetails});
        
    } catch (error) {
        console.error('Error during user login:', error);
        res.status(500).send({ message: 'Internal server error' });
    }

}

const updateProfile = async (req, res) => {
    const body = req.body || {};
    const allowedFields = new Set(['userName', 'email', 'jobCategory', 'skills', 'about', 'company']);
    const suppliedFields = Object.keys(body || {});
    const unsupportedFields = suppliedFields.filter((field) => !allowedFields.has(field));

    if (unsupportedFields.length) {
        return res.status(400).json({
            message: `Unsupported profile fields: ${unsupportedFields.join(', ')}`,
        });
    }

    if (!suppliedFields.length && !req.file) {
        return res.status(400).json({ message: 'Provide at least one profile field to update' });
    }

    const updates = {};
    for (const field of ['userName', 'email', 'about']) {
        if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
        if (typeof body[field] !== 'string') {
            return res.status(400).json({ message: `${field} must be a string` });
        }

        const value = body[field].trim();
        const maxLength = field === 'about' ? 500 : 100;
        if (!value || value.length > maxLength) {
            return res.status(400).json({
                message: `${field} must be between 1 and ${maxLength} characters`,
            });
        }
        updates[field] = field === 'email' ? value.toLowerCase() : value;
    }

    if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
        return res.status(400).json({ message: 'Provide a valid email address' });
    }

    for (const field of ['jobCategory', 'skills']) {
        if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
        let values = body[field];
        if (typeof values === 'string') {
            try {
                values = JSON.parse(values);
            } catch (error) {
                return res.status(400).json({ message: `${field} must be a JSON array` });
            }
        }
        if (!Array.isArray(values) || values.length > 50
            || values.some((value) => typeof value !== 'string'
                || !value.trim() || value.trim().length > 100)) {
            return res.status(400).json({
                message: `${field} must be an array of up to 50 non-empty strings, each 100 characters or fewer`,
            });
        }
        updates[field] = [...new Set(values.map((value) => value.trim()))];
    }

    if (Object.prototype.hasOwnProperty.call(body, 'company')) {
        let company = body.company;
        if (typeof company === 'string') {
            try {
                company = JSON.parse(company);
            } catch (error) {
                return res.status(400).json({ message: 'company must be a JSON object' });
            }
        }
        const companyFields = new Set(['name', 'location', 'website', 'description', 'industry']);
        if (!company || typeof company !== 'object' || Array.isArray(company)) {
            return res.status(400).json({ message: 'company must be an object' });
        }

        for (const [field, value] of Object.entries(company)) {
            if (!companyFields.has(field)) {
                return res.status(400).json({ message: `Unsupported company field: ${field}` });
            }
            if (typeof value !== 'string' || value.length > 5000) {
                return res.status(400).json({
                    message: `company.${field} must be a string of 5000 characters or fewer`,
                });
            }
            updates[`company.${field}`] = value.trim();
        }

        if (!Object.keys(company).length) {
            return res.status(400).json({ message: 'Provide at least one company field to update' });
        }
    }

    if (req.file) {
        const { buffer, mimetype } = req.file;
        const isJpeg = mimetype === 'image/jpeg'
            && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        const isPng = mimetype === 'image/png'
            && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        const isWebp = mimetype === 'image/webp'
            && buffer.toString('ascii', 0, 4) === 'RIFF'
            && buffer.toString('ascii', 8, 12) === 'WEBP';
        if (!isJpeg && !isPng && !isWebp) {
            return res.status(400).json({ message: 'Profile picture contents are not a valid JPG, PNG, or WebP image' });
        }
    }

    let newProfilePictureFile;
    try {
        let previousProfilePicture;
        if (req.file) {
            const currentUser = await user.findById(req.user.userId).select('profilePicture');
            if (!currentUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            const extension = path.extname(req.file.originalname).toLowerCase();
            const storageName = `${randomUUID()}${extension}`;
            newProfilePictureFile = path.join(profilePictureDirectory, storageName);
            await fs.mkdir(profilePictureDirectory, { recursive: true });
            await fs.writeFile(newProfilePictureFile, req.file.buffer, { flag: 'wx' });
            updates.profilePicture = `/uploads/profile-pictures/${storageName}`;
            previousProfilePicture = currentUser.profilePicture;
        }

        const updatedUser = await user.findByIdAndUpdate(
            req.user.userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password -__v');

        if (!updatedUser) {
            if (newProfilePictureFile) {
                await fs.unlink(newProfilePictureFile);
                newProfilePictureFile = null;
            }
            return res.status(404).json({ message: 'User not found' });
        }

        newProfilePictureFile = null;
        await publishMessage(queueName, {
            event: 'USER_UPDATED',
            data: {
                _id: updatedUser._id,
                userName: updatedUser.userName,
                email: updatedUser.email,
                userType: updatedUser.userType,
                company: updatedUser.company,
                createdAt: updatedUser.createdAt,
            },
        });

        if (previousProfilePicture?.startsWith('/uploads/profile-pictures/')) {
            const previousStorageName = previousProfilePicture.slice('/uploads/profile-pictures/'.length);
            if (previousStorageName && path.basename(previousStorageName) === previousStorageName) {
                try {
                    await fs.unlink(path.join(profilePictureDirectory, previousStorageName));
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        console.error('Failed to remove replaced profile picture:', error);
                    }
                }
            }
        }

        return res.status(200).json({
            message: 'Profile updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        if (newProfilePictureFile) {
            try {
                await fs.unlink(newProfilePictureFile);
            } catch (cleanupError) {
                if (cleanupError.code !== 'ENOENT') {
                    console.error('Failed to clean up incomplete profile picture upload:', cleanupError);
                }
            }
        }

        if (error.code === 11000) {
            return res.status(409).json({ message: 'Email is already in use' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }

        console.error('Error updating user profile:', error);
        return res.status(500).json({ message: 'Failed to update profile' });
    }
};

const uploadResume = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Resume file is required' });
    }

    let sections = [];
    if (req.body.sections !== undefined) {
        try {
            sections = typeof req.body.sections === 'string'
                ? JSON.parse(req.body.sections)
                : req.body.sections;
        } catch (error) {
            return res.status(400).json({ message: 'Sections must be valid JSON' });
        }

        if (!isValidResumeSections(sections)) {
            return res.status(400).json({
                message: 'Sections need a key, title, non-null content, and an optional numeric order',
            });
        }
    }

    const extension = path.extname(req.file.originalname).toLowerCase();
    const storageName = `${randomUUID()}${extension}`;
    const filePath = path.join(resumeUploadDirectory, storageName);

    try {
        const existingResume = await Resume.findOne({ user: req.user.userId })
            .select('file.storageName')
            .lean();
        const previousStorageName = existingResume?.file?.storageName;

        await fs.mkdir(resumeUploadDirectory, { recursive: true });
        await fs.writeFile(filePath, req.file.buffer, { flag: 'wx' });

        const resume = await Resume.findOneAndUpdate(
            { user: req.user.userId },
            {
                user: req.user.userId,
                file: {
                    originalName: path.basename(req.file.originalname.replace(/\\/g, '/')),
                    storageName,
                    mimeType: req.file.mimetype,
                    size: req.file.size,
                },
                sections,
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        if (previousStorageName && path.basename(previousStorageName) === previousStorageName) {
            const previousFilePath = path.join(resumeUploadDirectory, previousStorageName);
            try {
                await fs.unlink(previousFilePath);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.error('Failed to remove replaced resume file:', error);
                }
            }
        }

        return res.status(existingResume ? 200 : 201).json({
            message: 'Resume uploaded successfully',
            resume,
        });
    } catch (error) {
        try {
            await fs.unlink(filePath);
        } catch (cleanupError) {
            if (cleanupError.code !== 'ENOENT') {
                console.error('Failed to clean up incomplete resume upload:', cleanupError);
            }
        }

        console.error('Error uploading resume:', error);
        return res.status(500).json({ message: 'Failed to upload resume' });
    }
};

const getResume = async (req, res) => {
    try {
        const resume = await Resume.findOne({ user: req.user.userId }).lean();
        if (!resume) {
            return res.status(404).json({ message: 'Resume not found' });
        }

        return res.status(200).json({ resume });
    } catch (error) {
        console.error('Error fetching resume:', error);
        return res.status(500).json({ message: 'Failed to fetch resume' });
    }
};

const downloadResume = async (req, res) => {
    try {
        const resume = await Resume.findOne({ user: req.user.userId }).lean();
        if (!resume) {
            return res.status(404).json({ message: 'Resume not found' });
        }

        const { storageName, originalName } = resume.file;
        if (!storageName || path.basename(storageName) !== storageName) {
            return res.status(500).json({ message: 'Resume file reference is invalid' });
        }

        const filePath = path.join(resumeUploadDirectory, storageName);
        try {
            await fs.access(filePath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.status(404).json({ message: 'Resume file not found' });
            }
            throw error;
        }

        return res.download(filePath, path.basename(originalName.replace(/\\/g, '/')), (error) => {
            if (error) {
                console.error('Error downloading resume:', error);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Failed to download resume' });
                }
            }
        });
    } catch (error) {
        console.error('Error preparing resume download:', error);
        return res.status(500).json({ message: 'Failed to download resume' });
    }
};

const updateResumeSections = async (req, res) => {
    const { sections } = req.body;
    if (!isValidResumeSections(sections)) {
        return res.status(400).json({
            message: 'Sections must be an array of objects with key, title, non-null content, and optional numeric order',
        });
    }

    try {
        const resume = await Resume.findOneAndUpdate(
            { user: req.user.userId },
            { $set: { sections } },
            { new: true, runValidators: true }
        );
        if (!resume) {
            return res.status(404).json({ message: 'Resume not found' });
        }

        return res.status(200).json({ message: 'Resume sections updated successfully', resume });
    } catch (error) {
        console.error('Error updating resume sections:', error);
        return res.status(500).json({ message: 'Failed to update resume sections' });
    }
};

const deleteResume = async (req, res) => {
    try {
        const resume = await Resume.findOne({ user: req.user.userId });
        if (!resume) {
            return res.status(404).json({ message: 'Resume not found' });
        }

        await resume.deleteOne();

        const storageName = resume.file.storageName;
        if (storageName && path.basename(storageName) === storageName) {
            try {
                await fs.unlink(path.join(resumeUploadDirectory, storageName));
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.error('Failed to remove deleted resume file:', error);
                    return res.status(500).json({
                        message: 'Resume record was deleted, but its file could not be removed',
                    });
                }
            }
        }

        return res.status(200).json({ message: 'Resume deleted successfully' });
    } catch (error) {
        console.error('Error deleting resume:', error);
        return res.status(500).json({ message: 'Failed to delete resume' });
    }
};

module.exports = {
    registerUser,
    userLogin,
    userDetails,
    updateProfile,
    uploadResume,
    getResume,
    downloadResume,
    updateResumeSections,
    deleteResume,
};
