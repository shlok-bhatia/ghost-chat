const Message= require("../models/message");

async function saveMessage({roomId , text , user}){
    return await Message.create({
        roomId,
        text,
        user,
    })
}

async function getRecentMessages(roomId , days=7){
    const since= new Date();
    since.setDate(since.getDate()-days);

    return await Message.find({
        roomId,
        createdAt:{$gte : since}
    })
    .sort({createdAt:1})
    .limit(200)
}

module.exports={
    saveMessage,
    getRecentMessages
}
