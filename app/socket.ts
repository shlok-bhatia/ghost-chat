import { io } from "socket.io-client";

export const socket = io("https://ghost-chat-uenp.onrender.com", {
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