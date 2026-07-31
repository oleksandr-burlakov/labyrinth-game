import { io } from "socket.io-client";
import { EVENTS } from "@labyrinth/shared";

// Connect to the server using Socket.IO
export const socket = io(
  import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001",
);

export { EVENTS };
