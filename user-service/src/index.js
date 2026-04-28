require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { connectQueue } = require("./rabbitmq");
const routes = require('./routes');


const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Failed to connect to MongoDB', err);
});

// Enable CORS for browser clients (e.g., React app on localhost:3000)
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());           // parse JSON
app.use(express.urlencoded({ extended: true })); // parse form data


connectQueue();

app.use('/api/users',routes);
app.use('/', (req, res) => {
    res.send('User Service is running');
});

app.listen(PORT, () => {
    console.log(`User service running on port ${PORT}`);
});
