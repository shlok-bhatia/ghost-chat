import { io } from "socket.io-client";

export const socket = io(" https://ghost-chat-uenp.onrender.com", {
     transports: ["polling", "websocket"],
  autoConnect: true,
  timeout: 20000, 
}
);

socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.log("Connection error:", err.message);
});

// ghost-chat-uenp.onrender.com
