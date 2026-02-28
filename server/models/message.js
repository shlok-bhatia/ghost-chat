const mongoose=require("mongoose");

const MessageSchema=new mongoose.Schema({
    user :{
        type:String,
        required:true,
    } ,
    roomId:{
        type:String,
        required:true,
        index:true,
    },
    imageId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"image",
        default:null,
    },
    text:{
        type:String,
        required:true,
    },
    createdAt:{
        type:Date,
        default:Date.now,
    }
    
});

//Auto delete after 7 days 
// MessageSchema.index(
//     { createdAt: 1 },
//     { expireAfterSeconds: 60 * 60 * 24 * 7 }
// );

module.exports=mongoose.model("Message" , MessageSchema)