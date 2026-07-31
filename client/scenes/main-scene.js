import { socket, EVENTS } from "../services/socket-service.js";
import { canSendMove, eventText, perspectiveFor, secondsRemaining } from "../services/match-view.js";

const ITEM_VISUALS = {
  treasure: { symbol: "◆", color: "#ffd166" }, walking_stick: { symbol: "│", color: "#8cff98" },
  crossbow: { symbol: "➳", color: "#ff9acb" }, pirate_glass: { symbol: "◉", color: "#8cddff" }, bear_trap: { symbol: "✹", color: "#ff8f8f" },
};
const DIRECTIONS = { up: "↑", left: "←", down: "↓", right: "→" };
const KEY_DIRECTIONS = { left: "left", right: "right", up: "up", down: "down", A: "left", D: "right", W: "up", S: "down" };

export class MainScene extends Phaser.Scene {
  constructor() { super("MainScene"); }

  init({ room } = {}) { this.room = room ?? null; this.pendingMove = false; this.connected = socket.connected; this.activity = []; this.flash = null; }

  create() {
    this.graphics = this.add.graphics();
    this.title = this.add.text(16, 14, "Labyrinth match", { fontSize: "22px", fill: "#fff" });
    this.status = this.add.text(16, 44, "", { fontSize: "16px", fill: "#aaa", wordWrap: { width: 760 } });
    this.score = this.add.text(16, 88, "", { fontSize: "15px", fill: "#ffd166", wordWrap: { width: 760 } });
    this.effects = this.add.text(16, 112, "", { fontSize: "14px", fill: "#8cddff", wordWrap: { width: 760 } });
    this.hint = this.add.text(16, 136, "", { fontSize: "14px", fill: "#aaa", wordWrap: { width: 760 } });
    this.log = this.add.text(16, 0, "", { fontSize: "13px", fill: "#ddd", wordWrap: { width: 360 } });
    this.banner = this.add.text(0, 0, "", { fontSize: "16px", fill: "#fff", backgroundColor: "#263445", padding: { x: 8, y: 5 } }).setVisible(false);
    this.overlay = this.add.text(0, 0, "", { fontSize: "20px", fill: "#fff", align: "center", backgroundColor: "#18202ddd", padding: { x: 16, y: 14 }, wordWrap: { width: 330 } }).setOrigin(0.5).setVisible(false);
    this.cursors = this.input.keyboard.createCursorKeys(); this.keys = this.input.keyboard.addKeys("W,A,S,D");
    this.createDirectionButtons();
    this.onState = ({ room, events = [] }) => { this.room = room; this.pendingMove = false; this.recordEvents(events); this.render(); };
    this.onWarning = () => { this.showBanner("Only 5 seconds remain!", "#ff8f8f"); this.render(); };
    this.onFinished = ({ result }) => { this.showBanner(result.winnerId === socket.id ? "You won!" : "Opponent won.", "#ffd166", 5000); this.render(); };
    this.onError = ({ message }) => { this.pendingMove = false; this.showBanner(message, "#ff8f8f", 3500); this.render(); };
    this.onDisconnect = () => { this.connected = false; this.render(); };
    this.onConnect = () => { this.connected = true; this.render(); };
    socket.on(EVENTS.STATE, this.onState); socket.on(EVENTS.TURN_WARNING, this.onWarning); socket.on(EVENTS.FINISHED, this.onFinished); socket.on(EVENTS.ERROR, this.onError);
    socket.on("disconnect", this.onDisconnect); socket.on("connect", this.onConnect); socket.on("reconnect_attempt", this.onDisconnect);
    this.onPointerDown = (pointer) => this.chooseStart(pointer); this.input.on("pointerdown", this.onPointerDown); this.scale.on("resize", this.render, this);
    this.events.once("shutdown", () => this.cleanup()); this.render();
  }

  cleanup() {
    socket.off(EVENTS.STATE, this.onState); socket.off(EVENTS.TURN_WARNING, this.onWarning); socket.off(EVENTS.FINISHED, this.onFinished); socket.off(EVENTS.ERROR, this.onError);
    socket.off("disconnect", this.onDisconnect); socket.off("connect", this.onConnect); socket.off("reconnect_attempt", this.onDisconnect);
    this.input.off("pointerdown", this.onPointerDown); this.scale.off("resize", this.render, this); this.bannerTimer && this.bannerTimer.remove();
  }

  createDirectionButtons() {
    this.directionButtons = {};
    for (const [direction, symbol] of Object.entries(DIRECTIONS)) {
      const button = this.add.text(0, 0, symbol, { fontSize: "30px", fill: "#fff", backgroundColor: "#31516c", padding: { x: 18, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      button.on("pointerdown", () => this.sendMove(direction)); this.directionButtons[direction] = button;
    }
  }

  get localPlayer() { return this.room?.match?.player; }
  get layout() {
    const width = this.scale.width; const height = this.scale.height; const compact = width < 650;
    const cell = Math.max(26, Math.min(compact ? 42 : 54, Math.floor((width - (compact ? 28 : 260)) / 10), Math.floor((height - (compact ? 360 : 190)) / 10)));
    const boardWidth = cell * 10; return { width, height, compact, cell, boardWidth, gridX: compact ? Math.floor((width - boardWidth) / 2) : 24, gridY: compact ? 166 : 168 };
  }

  chooseStart(pointer) {
    if (this.room?.phase !== "starting" || this.localPlayer?.position || !this.connected) return;
    const { gridX, gridY, cell } = this.layout; const x = Math.floor((pointer.x - gridX) / cell); const y = Math.floor((pointer.y - gridY) / cell);
    if (x >= 0 && x < 10 && y >= 0 && y < 10) socket.emit(EVENTS.CHOOSE_START, { position: { x, y } });
  }

  sendMove(direction) {
    if (!canSendMove(this.room, socket.id, this.connected, this.pendingMove)) return;
    this.pendingMove = true; socket.emit(EVENTS.MOVE, { direction }); this.render();
  }

  update() {
    for (const [key, direction] of Object.entries(KEY_DIRECTIONS)) {
      const input = this.cursors[key] ?? this.keys[key]; if (input && Phaser.Input.Keyboard.JustDown(input)) this.sendMove(direction);
    }
    if (this.room?.turn?.deadlineAt) this.renderStatusOnly();
  }

  recordEvents(events) {
    for (const event of events) {
      this.activity.unshift(eventText(event, this.room.players));
      if (["move_blocked", "item_picked", "treasure_extracted"].includes(event.type)) this.flash = { ...event, until: Date.now() + 650 };
    }
    this.activity = this.activity.slice(0, 5);
  }

  showBanner(message, color = "#fff", duration = 2500) {
    this.banner.setText(message).setColor(color).setVisible(true); this.bannerTimer?.remove();
    this.bannerTimer = this.time.delayedCall(duration, () => this.banner.setVisible(false));
  }

  renderStatusOnly() { if (this.status?.active) this.renderStatus(); }

  render() {
    if (!this.room || !this.graphics) return;
    const layout = this.layout; this.positionUi(layout); this.drawBoard(layout); this.renderStatus();
    const disconnected = !this.connected;
    const finished = this.room.phase === "finished";
    this.overlay.setPosition(layout.width / 2, layout.height / 2).setVisible(disconnected || finished);
    if (disconnected) this.overlay.setText("Connection lost\nReconnecting…\n\nInput is disabled.");
    else if (finished) this.overlay.setText(this.room.result?.winnerId === socket.id ? "You won!\nAll four treasures extracted." : "Match finished\nYour opponent won.");
  }

  positionUi(layout) {
    const sideX = layout.gridX + layout.boardWidth + 24; const infoX = layout.compact ? 16 : sideX; const infoWidth = layout.compact ? layout.width - 32 : Math.max(180, layout.width - sideX - 16);
    for (const text of [this.title, this.status, this.score, this.effects, this.hint]) { text.setX(infoX); text.setStyle({ wordWrap: { width: infoWidth } }); }
    if (layout.compact) { this.log.setPosition(16, layout.gridY + layout.boardWidth + 118).setStyle({ wordWrap: { width: layout.width - 32 } }); }
    else { this.log.setPosition(infoX, 210).setStyle({ wordWrap: { width: infoWidth } }); }
    const cx = layout.compact ? layout.width / 2 : sideX + infoWidth / 2; const cy = layout.compact ? layout.height - 92 : Math.min(layout.height - 105, 520);
    this.directionButtons.up.setPosition(cx, cy - 58); this.directionButtons.left.setPosition(cx - 62, cy); this.directionButtons.down.setPosition(cx, cy); this.directionButtons.right.setPosition(cx + 62, cy);
    this.banner.setPosition(layout.width / 2, layout.gridY - 18).setOrigin(0.5);
  }

  drawBoard(layout) {
    const perspective = perspectiveFor(this.room, socket.id); const player = this.localPlayer;
    const fog = this.room.fog?.[socket.id] ?? { discoveredCells: [], revealedEdges: [] };
    const knownCells = new Set(fog.discoveredCells.map(({ x, y }) => `${x},${y}`)); const edges = new Map((fog.revealedEdges ?? []).map((edge) => [`${edge.x},${edge.y},${edge.side}`, edge]));
    const authoredMaze = this.room.mazes?.[socket.id]; const maze = perspective === "observer" ? authoredMaze : null;
    const items = perspective === "observer" ? authoredMaze?.items ?? [] : this.room.match?.visibleItems ?? [];
    this.graphics.clear();
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      const visible = perspective === "observer" || knownCells.has(`${x},${y}`); const left = layout.gridX + x * layout.cell; const top = layout.gridY + y * layout.cell;
      this.graphics.fillStyle(visible ? (perspective === "observer" ? 0x3b4d43 : 0x33485b) : 0x151a20, 1).fillRect(left, top, layout.cell, layout.cell);
      this.graphics.lineStyle(1, 0x54616d, .55).strokeRect(left, top, layout.cell, layout.cell);
      for (const [side, dx, dy, wall] of [["north", 0, 0, 1], ["east", 1, 0, 2], ["south", 0, 1, 4], ["west", 0, 0, 8]]) {
        const edge = edges.get(`${x},${y},${side}`); const blocked = perspective === "observer" ? Boolean(maze?.cells[y][x] & wall) : edge?.blocked;
        if (blocked) this.drawEdge(left, top, layout.cell, side, 0xf0f3f5, 3);
        if (visible && edge && !edge.blocked && (x === 0 || y === 0 || x === 9 || y === 9)) this.drawEdge(left, top, layout.cell, side, 0x55ddff, 4);
      }
    }
    if (perspective === "observer") for (const entrance of maze?.entrances ?? []) {
      const left = layout.gridX + entrance.x * layout.cell; const top = layout.gridY + entrance.y * layout.cell;
      this.drawEdge(left, top, layout.cell, entrance.side, 0x55ddff, 4);
    }
    for (const item of items) this.drawItem(layout, item);
    const marker = perspective === "observer" ? this.room.match?.opponent?.position : player?.position;
    if (marker) { const px = layout.gridX + marker.x * layout.cell + layout.cell / 2; const py = layout.gridY + marker.y * layout.cell + layout.cell / 2; this.graphics.fillStyle(perspective === "observer" ? 0xffa45c : 0x55ddff, 1).fillCircle(px, py, Math.max(8, layout.cell * .22)); }
    if (this.flash?.until > Date.now() && this.flash.position) { const { x, y } = this.flash.position; const left = layout.gridX + x * layout.cell; const top = layout.gridY + y * layout.cell; this.graphics.lineStyle(4, this.flash.type === "move_blocked" ? 0xff6b6b : 0xffd166, 1).strokeRect(left + 2, top + 2, layout.cell - 4, layout.cell - 4); }
  }

  drawEdge(left, top, cell, side, color, width) {
    this.graphics.lineStyle(width, color, 1);
    if (side === "north") this.graphics.lineBetween(left, top, left + cell, top);
    if (side === "east") this.graphics.lineBetween(left + cell, top, left + cell, top + cell);
    if (side === "south") this.graphics.lineBetween(left, top + cell, left + cell, top + cell);
    if (side === "west") this.graphics.lineBetween(left, top, left, top + cell);
  }

  drawItem(layout, item) {
    const visual = ITEM_VISUALS[item.type] ?? { symbol: "?", color: "#fff" }; const x = layout.gridX + item.x * layout.cell + layout.cell / 2; const y = layout.gridY + item.y * layout.cell + layout.cell / 2;
    this.graphics.fillStyle(Phaser.Display.Color.HexStringToColor(visual.color).color, 1).fillCircle(x, y, Math.max(5, layout.cell * .13));
  }

  renderStatus() {
    const layout = this.layout; const player = this.localPlayer; const perspective = perspectiveFor(this.room, socket.id); const isMyTurn = this.room.turn?.activePlayerId === socket.id; const remaining = secondsRemaining(this.room.turn?.deadlineAt);
    this.title.setText(`Room ${this.room.code} — ${perspective === "observer" ? "your maze" : "opponent maze"}`);
    if (this.room.phase === "starting") this.status.setText(player?.position ? "Start selected. Waiting for your opponent…" : "Choose any cell as your starting position.");
    else if (this.room.phase === "finished") this.status.setText("Match complete.");
    else this.status.setText(isMyTurn ? `Your turn: ${this.room.turn.movesRemaining} attempt(s)${remaining !== null ? ` · ${remaining}s` : " · no timer"}` : `Opponent's turn${remaining !== null ? ` · ${remaining}s` : ""}`);
    this.status.setColor(isMyTurn && remaining !== null && remaining <= 5 ? "#ff8f8f" : isMyTurn ? "#8cff98" : "#aaa");
    this.score.setText((this.room.match?.scores ?? []).map((entry) => `${entry.name}: ${entry.extractedTreasures}/4`).join("   "));
    this.effects.setText(`Inventory: ${player?.carriedTreasure ? "◆ treasure" : "no treasure"} · +${player?.movementBonus ?? 0} moves · ${player?.hasPirateGlass ? "pirate glass" : "no glass"}${player?.skipTurns ? ` · trap: ${player.skipTurns} turns` : ""}`);
    this.hint.setText(this.connected ? (perspective === "observer" ? "Watch your opponent explore the maze you built." : "Use arrows, WASD, or the direction pad.") : "Reconnecting…");
    this.log.setText(this.activity.join("\n"));
    const enabled = canSendMove(this.room, socket.id, this.connected, this.pendingMove); for (const button of Object.values(this.directionButtons)) button.setAlpha(enabled ? 1 : .35).disableInteractive();
    if (enabled) for (const button of Object.values(this.directionButtons)) button.setInteractive({ useHandCursor: true });
    if (layout.compact && layout.height < 650) this.hint.setVisible(false); else this.hint.setVisible(true);
  }
}
