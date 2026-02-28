const mongoose=require ("mongoose");

const ImageSchema= new mongoose.Schema({
    uploader:{
        type:String ,
        required:true
    },
    roomId:{
        type:String,
        required:true,
        index:true
    },
    imageUrl:{
        type:String ,
        required:true
    },
    mimeType:{
        type:String,
    },
    size:{
        type:Number
    },
    status:{
        type:String,
        enum:["pending" , "approved" , "rejected"],
        default:"pending",
        index:true
    },
    flaggedReason:{
        type:String,
        default:null
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
})

module.exports=mongoose.model("image" , ImageSchema)