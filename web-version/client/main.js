import Phaser from "phaser";
import { MenuScene, MainScene, SetupScene } from "./scenes";
import { socket } from "./services/socket-service.js";

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 800,
  parent: "game-container",
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  dom: {
    createContainer: true,
  },
  scene: [MenuScene, MainScene, SetupScene],
};

new Phaser.Game(config);
