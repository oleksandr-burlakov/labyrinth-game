import Phaser from "phaser";
import { io } from "socket.io-client";
import { MenuScene, MainScene } from "./scenes";
import { socket } from "./services/socket-service.js";

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 800,
  parent: "game-container",
  dom: {
    createContainer: true,
  },
  scene: [MainScene, MenuScene],
};

new Phaser.Game(config);
