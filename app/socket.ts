import { io } from "socket.io-client";

export const socket = io("https://ghost-chat-uenp.onrender.com", {
    transports: ["websocket"],
     autoConnect: true,
});
