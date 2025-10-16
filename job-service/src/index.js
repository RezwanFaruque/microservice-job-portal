require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { connectQueue } = require("./rabbitmq");
const routes = require('./routes');
const { startUserConsumer } = require('./consumer/userConsumer');


const app = express();
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;


mongoose.connect(MONGO_URI).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Failed to connect to MongoDB', err);
});

app.use(express.json());           // parse JSON
app.use(express.urlencoded({ extended: true })); // parse form data


// Ready for initialize rabbitmQ asyncronously
async function init(){
   try{
        await connectQueue();
        await startUserConsumer();
   }catch(error){
    console.log('Rabbit MQ connection failed')
   }
}

init();


app.use('/api/jobs', routes);
app.use('/', (req, res) => {
    res.send('Job Service is running');
});


app.listen(PORT, () => {
    console.log(`Job service running on port ${PORT}`);
});
