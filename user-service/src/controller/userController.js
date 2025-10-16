const user = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { publishMessage, queueName } = require("../rabbitmq");



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
                { expiresIn: '1h' });

            res.status(200).send({ message: 'Login successful', token , user: { userId: getuser._id, email: getuser.email, userType: getuser.userType } });
        }else{
            return res.status(400).send({ message: 'Invalid credentials' });
        }

    }catch( error ){
        console.error('Error during user login:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
}

module.exports = { registerUser , userLogin };
