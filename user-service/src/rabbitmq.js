const amqp = require("amqplib");

let channel, connection;
const queueName = "user_events";

async function connectQueue() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
    channel = await connection.createChannel();
    await channel.assertQueue(queueName);
  } catch (error) {
    console.error("RabbitMQ connection failed", error);
  }
}

async function publishMessage(queue,message) {
  try{
      if(!channel){
       await connectQueue();
      }

      await channel.assertQueue(queue, { durable: true });
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
  }catch(error){
    console.log(error);
  }
}

module.exports = { connectQueue, publishMessage, queueName };
