const { getChannel , queueName } = require('../rabbitmq');
const UserCache = require('../models/UserCache');


async function startUserConsumer (){

    const channel = getChannel();
    if(!channel){
        throw new Error("RabbitMQ connection failed!");
    }

    // clear old message
    await channel.purgeQueue(queueName);
    channel.consume(queueName , async(message) => { 
        if(message != null){
            const { event , data} = JSON.parse(message.content.toString());
            if(event != undefined){
                try {

                    switch (event) {
                        case 'USER_REGISTERED':
                            await userCacheSync(data);
                            break;
                    
                        default:
                            break;
                    }
                    
                    channel.ack(message);
                } catch (error) {
                    throw new Error("Error while handling events!");
                }
            }

        }
    })

}


async function userCacheSync(data) {
  try {
    const { _id, userName, email, userType, company, createdAt } = data;

    const updatedUser = await UserCache.findOneAndUpdate(
      { userId: _id },
      {
        userName,
        email,
        userType,
        company,
        createdAt: createdAt || new Date(),
      },
      { upsert: true, new: true }
    );
    return updatedUser;

  } catch (error) {
    console.error('Error syncing user cache:', error);
  }
}

module.exports = { startUserConsumer };






