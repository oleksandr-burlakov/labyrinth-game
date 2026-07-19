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

  socket.on("join_game", (roomId) => {
    socket.join(roomId);

    if (!activeGames[roomId]) {
      activeGames[roomId] = { players: [], maze: {} };
    }

    activeGames[roomId].players.push(socket.id);
    console.log(`User ${socket.id} joined room ${roomId}`);

    if (activeGames[roomId].players.length === 2) {
      io.to(roomId).emit("game_ready", {
        msg: "Both players ready. Let's build the maze!",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
