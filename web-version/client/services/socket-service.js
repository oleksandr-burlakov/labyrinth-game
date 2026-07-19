import { io } from "socket.io-client";

// Connect to the server using Socket.IO
export const socket = io(
  import.meta.env.PROD
    ? "URL_TO_PROD_SERVER" // TODO: replace with your production server URL
    : "http://localhost:3001",
);
