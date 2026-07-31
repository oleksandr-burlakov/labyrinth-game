import { socket, EVENTS } from "../services/socket-service.js";
import { canSendMove, eventText, isOuterMazeEdge, perspectiveFor, secondsRemaining } from "../services/match-view.js";
import { BoardViewport } from "../services/board-viewport.js";

const ITEM_VISUALS = {
  treasure: { symbol: "◆", color: "#ffd166" }, walking_stick: { symbol: "│", color: "#8cff98" },
  crossbow: { symbol: "➳", color: "#ff9acb" }, pirate_glass: { symbol: "◉", color: "#8cddff" }, bear_trap: { symbol: "✹", color: "#ff8f8f" },
};
const DIRECTIONS = { up: "↑", left: "←", down: "↓", right: "→" };
const KEY_DIRECTIONS = { left: "left", right: "right", up: "up", down: "down", A: "left", D: "right", W: "up", S: "down" };

export class MainScene extends Phaser.Scene {
  constructor() { super("MainScene"); }

  init({ room } = {}) {
    this.room = room ?? null; this.pendingMove = false; this.connected = socket.connected; this.activity = []; this.flash = null;
    this.presentationBusy = false; this.presentationPerspective = null; this.presentationQueue = []; this.presentationTimer = null; this.motionMarker = null;
    this.viewport = new BoardViewport(); this.touchPoints = new Map(); this.touchGesture = null;
  }

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
    this.motionMarker = this.add.circle(0, 0, 10, 0x55ddff).setDepth(5).setVisible(false);
    this.cursors = this.input.keyboard.createCursorKeys(); this.keys = this.input.keyboard.addKeys("W,A,S,D");
    this.createDirectionButtons();
    this.onState = ({ room, events = [] }) => this.receiveState(room, events);
    this.onWarning = () => { this.showBanner("Only 5 seconds remain!", "#ff8f8f"); this.render(); };
    this.onFinished = ({ result }) => { this.showBanner(result.winnerId === socket.id ? "You won!" : "Opponent won.", "#ffd166", 5000); this.render(); };
    this.onError = ({ message }) => { this.pendingMove = false; this.showBanner(message, "#ff8f8f", 3500); this.render(); };
    this.onDisconnect = () => { this.connected = false; this.render(); };
    this.onConnect = () => { this.connected = true; this.render(); };
    socket.on(EVENTS.STATE, this.onState); socket.on(EVENTS.TURN_WARNING, this.onWarning); socket.on(EVENTS.FINISHED, this.onFinished); socket.on(EVENTS.ERROR, this.onError);
    socket.on("disconnect", this.onDisconnect); socket.on("connect", this.onConnect); socket.on("reconnect_attempt", this.onDisconnect);
    this.onPointerDown = (pointer) => this.handlePointerDown(pointer); this.onPointerMove = (pointer) => this.handlePointerMove(pointer); this.onPointerUp = (pointer) => this.handlePointerUp(pointer);
    this.input.on("pointerdown", this.onPointerDown); this.input.on("pointermove", this.onPointerMove); this.input.on("pointerup", this.onPointerUp); this.scale.on("resize", this.render, this);
    this.events.once("shutdown", () => this.cleanup()); this.render();
  }

  cleanup() {
    socket.off(EVENTS.STATE, this.onState); socket.off(EVENTS.TURN_WARNING, this.onWarning); socket.off(EVENTS.FINISHED, this.onFinished); socket.off(EVENTS.ERROR, this.onError);
    socket.off("disconnect", this.onDisconnect); socket.off("connect", this.onConnect); socket.off("reconnect_attempt", this.onDisconnect);
    this.input.off("pointerdown", this.onPointerDown); this.input.off("pointermove", this.onPointerMove); this.input.off("pointerup", this.onPointerUp); this.scale.off("resize", this.render, this); this.bannerTimer && this.bannerTimer.remove(); this.presentationTimer?.remove();
    this.tweens.killTweensOf(this.graphics); this.tweens.killTweensOf(this.motionMarker); this.motionMarker?.destroy();
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
    const width = this.scale.width; const height = this.scale.height; const mobile = height <= 540 && width > height; const compact = !mobile && width < 650;
    let region;
    if (mobile) { const sideWidth = Math.min(270, Math.max(210, Math.floor(width * .39))); region = { x: 8, y: 48, width: Math.max(220, width - sideWidth - 24), height: Math.max(180, height - 58) }; }
    else { const cell = Math.max(26, Math.min(compact ? 42 : 54, Math.floor((width - (compact ? 28 : 260)) / 10), Math.floor((height - (compact ? 360 : 190)) / 10))); const boardWidth = cell * 10; region = { x: compact ? Math.floor((width - boardWidth) / 2) : 24, y: compact ? 166 : 168, width: boardWidth, height: boardWidth }; }
    this.viewport.setRegion(region); return { width, height, compact, mobile, region, ...this.viewport.layout() };
  }

  isTouch(pointer) { return pointer.pointerType === "touch"; }
  rememberTouch(pointer) { this.touchPoints.set(pointer.id, { x: pointer.x, y: pointer.y }); }
  touchPair() { return [...this.touchPoints.values()].slice(0, 2); }
  handlePointerDown(pointer) {
    if (!this.isTouch(pointer)) return this.chooseStart(pointer);
    this.rememberTouch(pointer);
    this.touchGesture = { x: pointer.x, y: pointer.y, moved: false, multi: this.touchPoints.size > 1 };
    if (this.touchPoints.size > 1) this.touchGesture.moved = true;
  }
  handlePointerMove(pointer) {
    if (!this.isTouch(pointer) || !this.touchPoints.has(pointer.id)) return;
    const previous = this.touchPoints.get(pointer.id); this.rememberTouch(pointer); const points = this.touchPair();
    if (points.length > 1) {
      const [a, b] = points; const distance = Math.hypot(a.x - b.x, a.y - b.y); const centerX = (a.x + b.x) / 2; const centerY = (a.y + b.y) / 2;
      if (this.touchGesture?.distance) { this.viewport.panBy(centerX - this.touchGesture.centerX, centerY - this.touchGesture.centerY); this.viewport.zoomAt(this.viewport.zoom * distance / this.touchGesture.distance, centerX, centerY); this.render(); }
      this.touchGesture = { distance, centerX, centerY, moved: true, multi: true }; return;
    }
    if (!this.touchGesture?.multi && Math.hypot(pointer.x - this.touchGesture.x, pointer.y - this.touchGesture.y) > 8) { this.touchGesture.moved = true; this.viewport.panBy(pointer.x - previous.x, pointer.y - previous.y); this.render(); }
  }
  handlePointerUp(pointer) {
    if (!this.isTouch(pointer)) return; const gesture = this.touchGesture; this.touchPoints.delete(pointer.id);
    if (!this.touchPoints.size && gesture && !gesture.moved) this.chooseStart(pointer);
    if (!this.touchPoints.size) this.touchGesture = null;
  }

  chooseStart(pointer) {
    if (this.room?.phase !== "starting" || this.localPlayer?.position || !this.connected) return;
    if (!this.viewport.contains(pointer.x, pointer.y)) return; const { x, y } = this.viewport.toCell(pointer.x, pointer.y);
    socket.emit(EVENTS.CHOOSE_START, { position: { x, y } });
  }

  sendMove(direction) {
    if (!canSendMove(this.room, socket.id, this.connected, this.pendingMove || this.presentationBusy)) return;
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

  shouldPresent(events) {
    return events.some((event) => ["move_succeeded", "move_blocked", "treasure_extracted", "turn_expired", "turn_skipped"].includes(event.type));
  }

  markerFor(room, perspective) {
    return perspective === "observer" ? room?.match?.opponent?.position : room?.match?.player?.position;
  }

  markerPoint(position, layout = this.layout) {
    return { x: layout.gridX + position.x * layout.cell + layout.cell / 2, y: layout.gridY + position.y * layout.cell + layout.cell / 2 };
  }

  outcomeMessage(events) {
    const item = events.find((event) => event.type === "item_picked");
    if (item) return { message: `Found ${item.itemType.replaceAll("_", " ")}!`, color: ITEM_VISUALS[item.itemType]?.color ?? "#ffd166" };
    if (events.some((event) => event.type === "treasure_extracted")) return { message: "Treasure extracted!", color: "#ffd166" };
    if (events.some((event) => event.type === "move_blocked")) return { message: "A wall blocks the way.", color: "#ff8f8f" };
    if (events.some((event) => event.type === "turn_expired")) return { message: "Turn expired.", color: "#ff8f8f" };
    if (events.some((event) => event.type === "turn_skipped")) return { message: "Turn skipped by trap.", color: "#ff8f8f" };
    return null;
  }

  receiveState(room, events) {
    this.pendingMove = false;
    if (!this.room || !this.shouldPresent(events)) {
      if (this.presentationBusy) this.presentationQueue.push({ room, events });
      else { this.room = room; this.recordEvents(events); this.render(); }
      return;
    }
    this.presentationQueue.push({ room, events }); this.processPresentationQueue();
  }

  processPresentationQueue() {
    if (this.presentationBusy || !this.presentationQueue.length) return;
    const next = this.presentationQueue.shift(); const previousRoom = this.room;
    if (!this.shouldPresent(next.events)) { this.room = next.room; this.recordEvents(next.events); this.render(); this.processPresentationQueue(); return; }
    if (!previousRoom?.match) { this.room = next.room; this.recordEvents(next.events); this.render(); this.processPresentationQueue(); return; }
    this.presentationBusy = true; this.presentationPerspective = perspectiveFor(previousRoom, socket.id); this.recordEvents(next.events);
    const outcome = this.outcomeMessage(next.events); if (outcome) this.showBanner(outcome.message, outcome.color, 900);
    const movement = next.events.find((event) => event.type === "move_succeeded"); const from = this.markerFor(previousRoom, this.presentationPerspective);
    if (!movement || !from) return this.finishMovePresentation(next);
    const layout = this.layout; const fromPoint = this.markerPoint(from, layout); const targetPoint = this.markerPoint(movement.position, layout);
    this.motionMarker.setFillStyle(this.presentationPerspective === "observer" ? 0xffa45c : 0x55ddff).setRadius(Math.max(8, layout.cell * .22)).setPosition(fromPoint.x, fromPoint.y).setVisible(true);
    this.render();
    this.tweens.add({ targets: this.motionMarker, x: targetPoint.x, y: targetPoint.y, duration: 250, ease: "Sine.inOut", onComplete: () => this.finishMovePresentation(next) });
  }

  finishMovePresentation(next) {
    this.motionMarker.setVisible(false); this.room = next.room; this.render();
    const availableAt = next.room.turn?.availableAt; const hold = availableAt ? Math.max(0, availableAt - Date.now()) : 600;
    this.presentationTimer = this.time.delayedCall(hold, () => this.completeMovePresentation());
  }

  completeMovePresentation() {
    const nextPerspective = perspectiveFor(this.room, socket.id);
    const release = () => { this.presentationPerspective = null; this.presentationBusy = false; this.flash = null; this.render(); this.processPresentationQueue(); };
    if (this.presentationPerspective === nextPerspective) return release();
    this.tweens.add({ targets: this.graphics, alpha: 0, duration: 100, onComplete: () => {
      this.presentationPerspective = null; this.render();
      this.tweens.add({ targets: this.graphics, alpha: 1, duration: 120, onComplete: release });
    } });
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
    if (layout.mobile) {
      const sideX = layout.region.x + layout.region.width + 10; const infoWidth = layout.width - sideX - 8;
      this.title.setPosition(8, 8).setStyle({ fontSize: "17px", wordWrap: { width: layout.width - 16 } });
      [this.status, this.score, this.effects, this.hint].forEach((text) => text.setX(sideX).setStyle({ fontSize: text === this.status ? "13px" : "12px", wordWrap: { width: infoWidth } }));
      this.status.setY(42); this.score.setY(78); this.effects.setY(110); this.hint.setPosition(sideX, 154); this.log.setPosition(sideX, 178).setStyle({ fontSize: "11px", wordWrap: { width: infoWidth } });
      const cx = sideX + infoWidth / 2; const cy = layout.height - 55; this.directionButtons.up.setPosition(cx, cy - 40); this.directionButtons.left.setPosition(cx - 44, cy); this.directionButtons.down.setPosition(cx, cy); this.directionButtons.right.setPosition(cx + 44, cy);
      this.banner.setPosition(layout.region.x + layout.region.width / 2, 30).setOrigin(.5); return;
    }
    const sideX = layout.gridX + layout.boardWidth + 24; const infoX = layout.compact ? 16 : sideX; const infoWidth = layout.compact ? layout.width - 32 : Math.max(180, layout.width - sideX - 16);
    for (const text of [this.title, this.status, this.score, this.effects, this.hint]) { text.setX(infoX); text.setStyle({ wordWrap: { width: infoWidth } }); }
    if (layout.compact) { this.log.setPosition(16, layout.gridY + layout.boardWidth + 118).setStyle({ wordWrap: { width: layout.width - 32 } }); }
    else { this.log.setPosition(infoX, 210).setStyle({ wordWrap: { width: infoWidth } }); }
    const cx = layout.compact ? layout.width / 2 : sideX + infoWidth / 2; const cy = layout.compact ? layout.height - 92 : Math.min(layout.height - 105, 520);
    this.directionButtons.up.setPosition(cx, cy - 58); this.directionButtons.left.setPosition(cx - 62, cy); this.directionButtons.down.setPosition(cx, cy); this.directionButtons.right.setPosition(cx + 62, cy);
    this.banner.setPosition(layout.width / 2, layout.gridY - 18).setOrigin(0.5);
  }

  drawBoard(layout) {
    const perspective = this.presentationPerspective ?? perspectiveFor(this.room, socket.id); const player = this.localPlayer;
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
        if (visible && edge && !edge.blocked && isOuterMazeEdge(x, y, side)) this.drawEdge(left, top, layout.cell, side, 0x55ddff, 4);
      }
    }
    if (perspective === "observer") for (const entrance of maze?.entrances ?? []) {
      const left = layout.gridX + entrance.x * layout.cell; const top = layout.gridY + entrance.y * layout.cell;
      this.drawEdge(left, top, layout.cell, entrance.side, 0x55ddff, 4);
    }
    for (const item of items) this.drawItem(layout, item);
    const marker = this.markerFor(this.room, perspective);
    if (marker && !this.motionMarker?.visible) { const px = layout.gridX + marker.x * layout.cell + layout.cell / 2; const py = layout.gridY + marker.y * layout.cell + layout.cell / 2; this.graphics.fillStyle(perspective === "observer" ? 0xffa45c : 0x55ddff, 1).fillCircle(px, py, Math.max(8, layout.cell * .22)); }
    if (this.flash?.until > Date.now() && this.flash.position) {
      const { x, y } = this.flash.position; const left = layout.gridX + x * layout.cell; const top = layout.gridY + y * layout.cell;
      if (this.flash.type === "move_blocked") this.drawEdge(left, top, layout.cell, { up: "north", right: "east", down: "south", left: "west" }[this.flash.direction], 0xff6b6b, 5);
      else this.graphics.lineStyle(4, 0xffd166, 1).strokeRect(left + 2, top + 2, layout.cell - 4, layout.cell - 4);
    }
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
    const layout = this.layout; const player = this.localPlayer; const perspective = this.presentationPerspective ?? perspectiveFor(this.room, socket.id); const isMyTurn = this.room.turn?.activePlayerId === socket.id; const remaining = secondsRemaining(this.room.turn?.deadlineAt);
    this.title.setText(`Room ${this.room.code} — ${perspective === "observer" ? "your maze" : "opponent maze"}`);
    if (this.room.phase === "starting") this.status.setText(player?.position ? "Start selected. Waiting for your opponent…" : "Choose any cell as your starting position.");
    else if (this.room.phase === "finished") this.status.setText("Match complete.");
    else if (this.presentationBusy) this.status.setText("Resolving move…");
    else this.status.setText(isMyTurn ? `Your turn: ${this.room.turn.movesRemaining} attempt(s)${remaining !== null ? ` · ${remaining}s` : " · no timer"}` : `Opponent's turn${remaining !== null ? ` · ${remaining}s` : ""}`);
    this.status.setColor(this.presentationBusy ? "#8cddff" : isMyTurn && remaining !== null && remaining <= 5 ? "#ff8f8f" : isMyTurn ? "#8cff98" : "#aaa");
    this.score.setText((this.room.match?.scores ?? []).map((entry) => `${entry.name}: ${entry.extractedTreasures}/4`).join("   "));
    this.effects.setText(`Inventory: ${player?.carriedTreasure ? "◆ treasure" : "no treasure"} · +${player?.movementBonus ?? 0} moves · ${player?.hasPirateGlass ? "pirate glass" : "no glass"}${player?.skipTurns ? ` · trap: ${player.skipTurns} turns` : ""}`);
    this.hint.setText(this.connected ? (layout.mobile ? "Drag maze · pinch to zoom" : perspective === "observer" ? "Watch your opponent explore the maze you built." : "Use arrows, WASD, or the direction pad.") : "Reconnecting…");
    this.log.setText(this.activity.join("\n"));
    const enabled = canSendMove(this.room, socket.id, this.connected, this.pendingMove || this.presentationBusy); for (const button of Object.values(this.directionButtons)) button.setAlpha(enabled ? 1 : .35).disableInteractive();
    if (enabled) for (const button of Object.values(this.directionButtons)) button.setInteractive({ useHandCursor: true });
    if (layout.compact && layout.height < 650) this.hint.setVisible(false); else this.hint.setVisible(true);
  }
}
