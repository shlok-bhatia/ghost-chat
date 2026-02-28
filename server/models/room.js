const mongoose= require("mongoose");

const roomSchema= new mongoose.Schema({
    roomId:{
        type:String,
        unique:true,
    },
    location:{
        lat:Number,
        long:Number
    },
    createdAt:{
        type:Date,
        default:Date.now,
    }
});

module.exports=mongoose.model("Room" , roomSchema)