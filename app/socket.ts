import { io } from "socket.io-client";

export const socket = io("http://192.168.1.109:3000", {
    transports: ["websocket"],
     autoConnect: true,   
}
);

socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.log("Connection error:", err.message);
});

// ghost-chat-uenp.onrender.com