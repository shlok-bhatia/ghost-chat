const mongoose =require('mongoose');

const pinnedNoteSchema= new mongoose.Schema({
    roomId:{
        type:String,
        index:true,
        required:true,
    },
    user:{
        type:String,
        required:true,
    },
    text:{
        type:String,
        required:true,
    },
    pinnedAt:{
        type:Date,
        default:Date.now,
    },
    expiresAt:{
        type:Date
    }
});

pinnedNoteSchema.index(
    {pinnedAt:1},
    {expiresAfterSeconds : 30 * 24 * 60 *60}
)

module.exports=mongoose.model("pinnedNote" , pinnedNoteSchema)