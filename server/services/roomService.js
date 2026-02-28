const Room =require('../models/room');
const haversine=require('../utils/distance.js')

const radius =500; //metres

async function createOrFindRoom (lat , long){
    const rooms= await Room.find();

    for (const room of rooms){
        const d = haversine(lat , long , room.location.lat , room.location.long);

        if(d<=radius){
            return room.roomId;
        }
    }

    //if no nearby room craete it
    const roomId= `room_${lat.toFixed(5)}_${long.toFixed(5)}`;
    
    await Room.create({roomId , location:{lat , long}});

    return roomId;
}

module.exports=createOrFindRoom;