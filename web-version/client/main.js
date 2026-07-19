import Phaser from "phaser";
import { io } from "socket.io-client";

// Connect to the server using Socket.IO
const socket = io(
  import.meta.env.PROD
    ? "URL_TO_PROD_SERVER" // TODO: replace with your production server URL
    : "http://localhost:3001",
);

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    // Preload assets if needed
  }

  create() {
    this.add.text(20, 20, "Connecting to the game...", {
      fontSize: "20px",
      fill: "#fff",
    });

    // Tesk connect to the server and join a game room
    socket.emit("join_game", "room1");

    socket.on("game_ready", (data) => {
      this.add.text(20, 60, data.msg, { fontSize: "18px", fill: "#0f0" });
      this.drawGrid();
    });
  }

  drawGrid() {
    const cellSize = 40; // Size of each cell in the grid
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0xffffff, 0.5);

    // Draw a 10x10 grid
    for (let i = 0; i <= 10; i++) {
      // Vertical lines
      graphics.moveTo(100 + i * cellSize, 100);
      graphics.lineTo(100 + i * cellSize, 100 + 10 * cellSize);
      // Horizontal lines
      graphics.moveTo(100, 100 + i * cellSize);
      graphics.lineTo(100 + 10 * cellSize, 100 + i * cellSize);
    }
    graphics.strokePath();
  }
}

const config = {
  type: Phaser.AUTO,
  width: 600,
  height: 600,
  parent: "game-container",
  scene: MainScene,
};

new Phaser.Game(config);
