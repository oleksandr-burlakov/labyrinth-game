import { socket, EVENTS } from "../services/socket-service.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.title = this.add.text(0, 0, "Maze Online", { fontSize: "32px", fill: "#fff" }).setOrigin(0.5);

    // Generate HTML form dynamically through a template string
    const htmlForm = `
            <div style="color: white; font-family: Arial; text-align: center; background: #222; padding: 20px; border-radius: 8px;">
                <input type="text" id="nameInput" placeholder="Your name..." style="padding: 10px; width: 200px; font-size: 16px;"><br><br>
                <input type="text" id="roomInput" placeholder="Room code (to join)..." style="padding: 10px; width: 200px; font-size: 16px;"><br><br>
                <select id="timerInput" style="padding: 10px; width: 224px; font-size: 16px;">
                  <option value="">Timer disabled</option><option value="10">10 seconds</option><option value="30">30 seconds</option><option value="60">60 seconds</option><option value="90">90 seconds</option><option value="120">120 seconds</option>
                </select><br><br>
                <button id="createBtn" style="padding: 10px 20px; font-size: 16px; margin-right: 10px; cursor: pointer;">Create Room</button>
                <button id="joinBtn" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Join Room</button>
                <p id="errorLog" style="color: red; margin-top: 15px; font-weight: bold;"></p>
            </div>
        `;

    // Add the HTML element to the center of the screen
    const domElement = this.add.dom(0, 0).createFromHTML(htmlForm);

    // Button logic
    const createBtn = domElement.getChildByID("createBtn");
    const joinBtn = domElement.getChildByID("joinBtn");
    const roomInput = domElement.getChildByID("roomInput");
    const nameInput = domElement.getChildByID("nameInput");
    const timerInput = domElement.getChildByID("timerInput");
    const errorLog = domElement.getChildByID("errorLog");

    createBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      if (name) socket.emit(EVENTS.CREATE_ROOM, { userName: name, turnTimerSeconds: timerInput.value ? Number(timerInput.value) : null });
    });

    joinBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const roomCode = roomInput.value.trim();
      if (name && roomCode) socket.emit(EVENTS.JOIN_ROOM, { userName: name, roomCode });
    });

    // Listen for responses from the server
    socket.on(EVENTS.ROOM_SNAPSHOT, ({ room }) => {
      errorLog.style.color = "#0f0";
      errorLog.innerText = room.phase === "waiting" ? `Room code: ${room.code} (waiting for opponent)` : "Both players joined. Preparing setup...";
      if (room.phase === "setup") this.scene.start("SetupScene", { room });
    });

    socket.on(EVENTS.ERROR, ({ message }) => {
      errorLog.style.color = "red";
      errorLog.innerText = message;
    });

    // When the second player connects — the server sends a start command
    socket.on(EVENTS.START_MATCH, (gameData) => {
      // Disable menu scene listeners to prevent duplicates
      socket.off(EVENTS.ROOM_SNAPSHOT);
      socket.off(EVENTS.ERROR);
      socket.off(EVENTS.START_MATCH);

      // Start the game scene and pass the room data
      this.scene.start("MainScene", gameData);
    });
    this.layout = () => {
      const compact = this.scale.width < 650;
      this.title.setPosition(this.scale.width / 2, compact ? 70 : 100);
      domElement.setPosition(this.scale.width / 2, compact ? Math.min(330, this.scale.height / 2) : 300).setScale(compact ? .9 : 1);
    };
    this.layout(); this.scale.on("resize", this.layout);
    this.events.once("shutdown", () => { this.scale.off("resize", this.layout); socket.off(EVENTS.ROOM_SNAPSHOT); socket.off(EVENTS.ERROR); socket.off(EVENTS.START_MATCH); });
  }
}
