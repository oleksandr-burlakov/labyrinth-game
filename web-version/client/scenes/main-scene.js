import { socket } from "../services/socket-service.js";
import { MazeGenerator } from "../services/maze-generator.js";

const tileMapDirection = {
  no: -1,
  up: 1,
  upLeft: 9,
  upRight: 3,
  upDown: 5,
  upLeftDown: 13,
  upRightDown: 7,
  down: 4,
  downLeft: 12,
  downRight: 6,
  left: 8,
  leftRight: 10,
  leftUpRight: 11,
  leftDownRight: 14,
  leftUpRightDown: 15,
  right: 2,
};

export class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  init(data) {
    console.log(data);
    if (data && data.roomName) {
      this.roomName = data.roomName;
      this.players = data.players;
      this.me = this.players.find((p) => p.id === socket.id);
    } else {
      this.roomName = "Test";
      this.players = [
        { id: "1", name: "Player 1" },
        { id: "2", name: "Player 2" },
      ];
      this.me = this.players[0];
    }
  }

  preload() {
    // Preload assets if needed
    this.load.spritesheet(
      "maze-tileset",
      "./assets/maze-tiles/new_cells_trans.png",
      {
        frameWidth: 64,
        frameHeight: 64,
      },
    );
  }

  create() {
    let verticalY = 20;
    this.add.text(20, verticalY, `Game in room: ${this.roomName}`, {
      fontSize: "20px",
      fill: "#0f0",
    });
    verticalY += 30;
    this.add.text(
      20,
      verticalY,
      `Players: ${this.players.map((p) => p.name).join(", ")}`,
      {
        fontSize: "14px",
        fill: "#aaa",
      },
    );
    verticalY += 30;
    this.add.text(20, verticalY, `You are playing online!`, {
      fontSize: "14px",
      fill: "#aaa",
    });
    verticalY += 30;

    this.drawGrid(verticalY);

    this.spawnPlayer();

    // Setup Keyboard input listeners
    this.cursors = this.input.keyboard.createCursorKeys();

    // Listen for player leaving the game
    socket.on("player_left", (msg) => {
      alert(msg);
      socket.off("player_left");
      this.scene.start("MenuScene"); // Return to menu
    });
  }

  update() {
    // Only move if a key was just pressed down (prevents runaway speeds)
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.tryMovePlayer(-1, 0);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.tryMovePlayer(1, 0);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.tryMovePlayer(0, -1);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.tryMovePlayer(0, 1);
    }
  }

  drawGrid(verticalOffset = 100, horizontalOffset = 100) {
    const mazeGenerator = new MazeGenerator(10, 10);
    this.generatedMaze = mazeGenerator.generate();
    const mapData = this.generatedMaze;

    this.map = this.make.tilemap({
      data: mapData,
      tileWidth: 64, // Width of each individual tile in pixels
      tileHeight: 64, // Height of each individual tile in pixels
      width: 10, // Number of tiles wide
      height: 10, // Number of tiles high,
    });

    // 4. Link your loaded PNG asset to the tilemap
    // Params: (name_inside_tilemap_system, texture_cache_key)
    const tileset = this.map.addTilesetImage(
      "maze-tileset-inline",
      "maze-tileset",
    );

    // 5. Create a renderable layer using that tileset data
    // This instantly matches the 2D array coordinates to the segmented grid of the PNG.
    this.mazeLayer = this.map.createLayer(
      0,
      tileset,
      horizontalOffset,
      verticalOffset,
    );

    // this.mazeLayer.forEachTile((tile) => {
    //   tile.alpha = 0;
    // });
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const tile = this.mazeLayer.getTileAt(x, y);
        if (tile) {
          //   tile.alpha = 0;
        }
      }
    }
  }

  spawnPlayer() {
    // 1. Pick a random grid coordinate (0 to 9) that is NOT a completely solid wall (15) or empty space (-1)
    let validPosition = false;
    let gridX = 0;
    let gridY = 0;

    while (!validPosition) {
      gridX = Phaser.Math.Between(0, 9);
      gridY = Phaser.Math.Between(0, 9);
      const tileValue = this.generatedMaze[gridY][gridX];

      if (tileValue !== 15 && tileValue !== -1) {
        validPosition = true;
      }
    }

    // Keep track of player's grid coordinates internally
    this.playerGridX = gridX;
    this.playerGridY = gridY;

    // 2. Create the 'X' text component
    this.playerVisual = this.add.text(0, 0, "X", {
      fontSize: "32px",
      fontStyle: "bold",
      fill: "#ff0000",
    });
    this.playerVisual.setOrigin(0.5); // Centers the anchor point inside the X text box
    this.playerVisual.setDepth(10);

    // 3. Move 'X' to its spot and reveal initial room
    this.updatePlayerVisualPosition();
    this.revealFogOfWar(this.playerGridX, this.playerGridY);
  }

  tryMovePlayer(deltaX, deltaY) {
    const currentTileValue =
      this.generatedMaze[this.playerGridY][this.playerGridX];

    // Check for wall blocks using Bitwise checks
    // up: 1, right: 2, down: 4, left: 8
    if (deltaY === -1 && currentTileValue & 1) return; // Blocked north
    if (deltaX === 1 && currentTileValue & 2) return; // Blocked east
    if (deltaY === 1 && currentTileValue & 4) return; // Blocked south
    if (deltaX === -1 && currentTileValue & 8) return; // Blocked west

    // Calculate target coordinate
    const targetX = this.playerGridX + deltaX;
    const targetY = this.playerGridY + deltaY;

    // Boundaries safety check
    if (targetX >= 0 && targetX < 10 && targetY >= 0 && targetY < 10) {
      this.playerGridX = targetX;
      this.playerGridY = targetY;

      this.updatePlayerVisualPosition();
      this.revealFogOfWar(this.playerGridX, this.playerGridY);
    }
  }

  updatePlayerVisualPosition() {
    // Calculates screen coordinates centering the 'X' directly inside the 64x64 grid square
    const screenX =
      this.mapXOffset + this.playerGridX * this.tileSize + this.tileSize / 2;
    const screenY =
      this.mapYOffset + this.playerGridY * this.tileSize + this.tileSize / 2;

    this.playerVisual.setPosition(screenX, screenY);
  }

  revealFogOfWar(gridX, gridY) {
    // Fetch the tile instance inside our layer map and reveal it
    const tile = this.mazeLayer.getTileAt(gridX, gridY);
    if (tile) {
      tile.alpha = 1;
    }
  }
}
