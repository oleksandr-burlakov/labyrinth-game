import { socket } from "../services/socket-service.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.add
      .text(400, 100, "Maze Online", { fontSize: "32px", fill: "#fff" })
      .setOrigin(0.5);

    // Generate HTML form dynamically through a template string
    const htmlForm = `
            <div style="color: white; font-family: Arial; text-align: center; background: #222; padding: 20px; border-radius: 8px;">
                <input type="text" id="nameInput" placeholder="Your name..." style="padding: 10px; width: 200px; font-size: 16px;"><br><br>
                <input type="text" id="roomInput" placeholder="Room name..." style="padding: 10px; width: 200px; font-size: 16px;"><br><br>
                <button id="createBtn" style="padding: 10px 20px; font-size: 16px; margin-right: 10px; cursor: pointer;">Create Room</button>
                <button id="joinBtn" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Join Room</button>
                <p id="errorLog" style="color: red; margin-top: 15px; font-weight: bold;"></p>
            </div>
        `;

    // Add the HTML element to the center of the screen
    const domElement = this.add.dom(400, 300).createFromHTML(htmlForm);

    // Button logic
    const createBtn = domElement.getChildByID("createBtn");
    const joinBtn = domElement.getChildByID("joinBtn");
    const roomInput = domElement.getChildByID("roomInput");
    const nameInput = domElement.getChildByID("nameInput");
    const errorLog = domElement.getChildByID("errorLog");

    createBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const room = roomInput.value.trim();
      if (name && room)
        socket.emit("create_room", { userName: name, roomName: room });
    });

    joinBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const room = roomInput.value.trim();
      if (name && room)
        socket.emit("join_room", { userName: name, roomName: room });
    });

    // Listen for responses from the server
    socket.on("room_created", (roomName) => {
      errorLog.style.color = "#0f0";
      errorLog.innerText = `Room [${roomName}] created! Awaiting opponent...`;
    });

    socket.on("room_error", (errorMsg) => {
      errorLog.style.color = "red";
      errorLog.innerText = errorMsg;
    });

    // When the second player connects — the server sends a start command
    socket.on("game_start", (gameData) => {
      // Disable menu scene listeners to prevent duplicates
      socket.off("room_created");
      socket.off("room_error");
      socket.off("game_start");

      // Start the game scene and pass the room data
      this.scene.start("MainScene", gameData);
    });
  }
}
