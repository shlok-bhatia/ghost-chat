const pinnedNote = require("./models/pinnedNote");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const connectDB = require('./config/db');
const { saveMessage, getRecentMessages } = require('./services/messageService');
const app = express();
const server = http.createServer(app);
const createOrFindRoom = require('./services/roomService');
// const cloudinary = require("./config/cloudinary");
const image = require("./models/image");

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

connectDB();

io.on("connection", socket => {
  console.log("User connected:", socket.id);

  socket.on("send-image", async ({ room, user, imageUrl, moderation }) => {
    try {
      console.log("Received send-image:", { room, user, imageUrl, moderation });

      let status = "approved";
      let flaggedReason = null;

      if (moderation?.length) {
        const mod = moderation[0];

        if (mod.status !== "approved") {
          status = "rejected";
          flaggedReason =
            mod.response?.moderation_labels?.[0]?.name || "NSFW";
        }
      }

      const imageMsg = await image.create({
        uploader: user,
        roomId: room,
        imageUrl,
        status,
        flaggedReason,
      });

      if (status === "approved") {
        io.to(room).emit("receive-message", {
          id: imageMsg._id,
          user,
          imageUri: imageUrl,
          createdAt: Date.now(),
          type: "image",
          senderId: socket.id,
        });
      }

      if (status === "rejected") {
        socket.emit("image-rejected", {
          reason: flaggedReason,
        });
      }


    } catch (err) {
      console.error("image upload error:", err)
    }
  });

  // user joins area room
  socket.on("join-with-locations", async ({ lat, long, username }) => {
    socket.username = username;
    const roomId = await createOrFindRoom(lat, long)
    socket.join(roomId);

    //sending back roomId to frontend
    socket.emit("room-joined", roomId);

    //load old messages
    const textMessages = await getRecentMessages(roomId, 7);

    const imageMessages = await image
      .find({ roomId, status: "approved" })
      .sort({ createdAt: -1 })

    const formattedImages = imageMessages.map(img => ({
      id:  img._id.toString(),
      user: img.uploader,
      imageUri: img.imageUrl,
      type: "image",
      flagged: img.status === "rejected",
      createdAt: img.createdAt,
    }));

    const formattedTexts = textMessages.map(msg => ({
      id:  msg._id.toString(),
      user: msg.user,
      text: msg.text,
      type: "user",
      createdAt: msg.createdAt,
    }));

    const combined = [...formattedTexts, ...formattedImages]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    socket.emit("room-history", combined);

    const userInRoom = io.sockets.adapter.rooms.get(roomId);
    console.log(userInRoom);
    const count = userInRoom ? userInRoom.size : 0;

    io.to(roomId).emit("room-users-count", count)


    console.log(`${socket.id} joined ${roomId} | users : ${count}`);

    const pinnedNotes = await pinnedNote.find({ roomId }).sort({ pinnedAt: -1 });
    socket.emit("pinned-notes", pinnedNotes);
  });

  // message inside room only
  socket.on("send-message", async ({ room, message }) => {
    //save to db
    await saveMessage({
      roomId: room,
      text: message.text,
      user: message.user,
    })


    io.to(room).emit("receive-message", {
      ...message,
      senderId: socket.id,
      createdAt: Date.now()
    });
  });


  // typing inside room
  socket.on("typing", ({ room, username }) => {
    socket.to(room).emit("user-typing", username);
  });

  socket.on("stop-typing", ({ room, username }) => {
    socket.to(room).emit("user-stop-typing", username);
  });

  socket.on("create-pinned-note", async ({ roomId, text, user }) => {
    if (!text || !text.trim()) return;
    const note = await pinnedNote.create({ roomId, text, user });

    io.to(roomId).emit("new-pinned-note", note);
  });

  socket.on("disconnect", () => {

    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        // remove typing state
        socket.to(room).emit("user-stop-typing", socket.username);

        const userInRoom = io.sockets.adapter.rooms.get(room);
        const count = userInRoom ? userInRoom.size : 0;

        io.to(room).emit("room-users-count", count);
        console.log(`${socket.id} left ${room} | users: ${count}`);

      }
    })
    console.log("User disconnected", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
})
