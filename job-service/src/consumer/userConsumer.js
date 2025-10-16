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

        console.log('Job service waiting for message que from' + queueName);
        
        if(message != null){
            const { eventName , data} = JSON.parse(message.content.toString());
            if(eventName != undefined){
                try {

                    switch (eventName) {
                        case 'USER_REGISTERED':
                            await userChacheSync(data);
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


async function userChacheSync(data){

    const { id, userName , email , password , userType , company} = data;

    console.log('testing');
    UserCache.findOneAndUpdate(
        {userId : id},
        {userName , email , userType , company , createdAt},
        {upsert : true, new: true}
    )
}


module.exports = { startUserConsumer };






