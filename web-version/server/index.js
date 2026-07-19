const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // TODO: replace to prod url
    methods: ["GET", "POST"],
  },
});

// For MVP let's keep track of active games in memory.
// In future, consider using a database or other persistent storage.
const activeGames = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("create_room", ({ userName, roomName }) => {
    if (activeGames[roomName]) {
      socket.emit("error", { msg: "Room already exists." });
      return;
    }

    activeGames[roomName] = {
      name: roomName,
      players: [{ id: socket.id, name: userName }],
      status: "waiting", // waiting, in_progress, finished
    };

    socket.join(roomName);
    socket.emit("room_created", roomName);
    console.log(`Room created: ${roomName} by user ${socket.id}`);
  });

  socket.on("join_room", ({ userName, roomName }) => {
    const room = activeGames[roomName];

    if (!room) {
      socket.emit("error", { msg: "Room does not exist." });
      return;
    }

    if (room.players.length >= 2) {
      socket.emit("error", { msg: "Room is full." });
      return;
    }

    room.players.push({ id: socket.id, name: userName });
    room.status = "in_progress"; // Start the game when two players join

    socket.join(roomName);
    socket.emit("room_joined", { roomName });

    io.to(roomName).emit("game_start", {
      roomName: roomName,
      players: room.players,
    });

    console.log(`User ${socket.id} joined room ${roomName}`);
  });

  socket.on("disconnect", () => {
    for (const roomName in activeGames) {
      const room = activeGames[roomName];
      if (room.players.some((player) => player.id === socket.id)) {
        const leftPlayer = room.players.find(
          (player) => player.id === socket.id,
        );
        io.to(roomName).emit(
          "player_left",
          `Opponent ${leftPlayer.name} has left the game.`,
        );
        delete activeGames[roomName]; // Remove the room if a player leaves
      }
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
