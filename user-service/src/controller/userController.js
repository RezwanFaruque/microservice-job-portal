const user = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const { publishMessage, queueName } = require("../rabbitmq");
const Resume = require("../models/Resume");

const resumeUploadDirectory = path.resolve(__dirname, "../../uploads/resumes");

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
    uploadResume,
    getResume,
    downloadResume,
    updateResumeSections,
    deleteResume,
};
