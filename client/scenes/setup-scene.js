import { socket, EVENTS } from "../services/socket-service.js";
import { MazeGenerator } from "../services/maze-generator.js";
import { getDifficultyWallLimit } from "@labyrinth/shared";
import { BoardViewport } from "../services/board-viewport.js";
import { addGameSprite, gameAsset, preloadGameAssets } from "../services/game-assets.js";

const ITEMS = [
  { type: "treasure", label: "Treasure ×4", symbol: "◆", color: "#fc5", quota: 4 },
  { type: "walking_stick", label: "Walking stick", symbol: "│", color: "#8f8", quota: 1 },
  { type: "crossbow", label: "Crossbow", symbol: "➳", color: "#f8c", quota: 1 },
  { type: "pirate_glass", label: "Pirate glass", symbol: "◉", color: "#8cf", quota: 1 },
  { type: "bear_trap", label: "Bear trap", symbol: "✹", color: "#f88", quota: 1 },
];
const WALL = { top: 1, right: 2, bottom: 4, left: 8 };
const OPPOSITE = { top: "bottom", right: "left", bottom: "top", left: "right" };
const DELTA = { top: { x: 0, y: -1 }, right: { x: 1, y: 0 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 } };
const ENTRANCE_SIDE = { top: "north", right: "east", bottom: "south", left: "west" };

export class SetupScene extends Phaser.Scene {
  constructor() { super("SetupScene"); }
  init({ room }) { this.room = room; this.maze = null; this.activeItem = null; this.drag = null; this.submitted = false; this.viewport = new BoardViewport(); this.touchPoints = new Map(); this.touchGesture = null; }
  preload() { preloadGameAssets(this); }

  create() {
    this.title = this.add.text(16, 16, `Room ${this.room.code} — Build the maze your opponent will play`, { fontSize: "18px", fill: "#fff" });
    this.status = this.add.text(16, 44, "Click near an edge to edit it. Drag to draw a wall line.", { fontSize: "14px", fill: "#aaa", wordWrap: { width: 740 } });
    this.createControls(); this.createDraft();
    this.input.on("pointerdown", this.handlePointerDown, this); this.input.on("pointermove", this.handlePointerMove, this); this.input.on("pointerup", this.handlePointerUp, this);
    this.onRoom = ({ room }) => { this.room = room; if (room.phase === "playing" || room.phase === "starting") this.scene.start("MainScene", { room }); };
    this.onStart = ({ room }) => this.scene.start("MainScene", { room }); this.onError = ({ message, details = [] }) => this.setStatus(`${message} ${details.join("; ")}`, "#f88");
    socket.on(EVENTS.ROOM_SNAPSHOT, this.onRoom); socket.on(EVENTS.START_MATCH, this.onStart); socket.on(EVENTS.ERROR, this.onError);
    this.onResize = () => { this.layoutControls(); this.drawDraft(); }; this.scale.on("resize", this.onResize);
    this.events.once("shutdown", () => {
      socket.off(EVENTS.ROOM_SNAPSHOT, this.onRoom); socket.off(EVENTS.START_MATCH, this.onStart); socket.off(EVENTS.ERROR, this.onError); this.scale.off("resize", this.onResize);
      this.input.off("pointerdown", this.handlePointerDown, this); this.input.off("pointermove", this.handlePointerMove, this); this.input.off("pointerup", this.handlePointerUp, this);
    });
  }

  getLayout() {
    const width = this.scale.width; const height = this.scale.height; const mobile = height <= 540 && width > height; const compact = !mobile && width < 650;
    let region; let paletteX; let paletteY;
    if (mobile) { const sideWidth = Math.min(285, Math.max(230, Math.floor(width * .42))); region = { x: 8, y: 66, width: Math.max(220, width - sideWidth - 24), height: Math.max(180, height - 118) }; paletteX = region.x + region.width + 10; paletteY = 66; }
    else { const cell = Math.max(25, Math.min(compact ? 38 : 56, Math.floor((width - (compact ? 30 : 240)) / 10), Math.floor((height - (compact ? 350 : 160)) / 10))); const boardWidth = cell * 10; region = { x: compact ? Math.floor((width - boardWidth) / 2) : 120, y: compact ? 92 : 90, width: boardWidth, height: boardWidth }; paletteX = compact ? 14 : 700; paletteY = compact ? 92 + boardWidth + 18 : 100; }
    this.viewport.setRegion(region); return { width, height, compact, mobile, region, paletteX, paletteY, ...this.viewport.layout() };
  }

  createControls() {
    this.generateControl = this.control("[ Generate ]", "#8cf", () => this.createDraft());
    this.cancelControl = this.control("[ Cancel item ]", "#ddd", () => { this.activeItem = null; this.drawDraft(); this.setStatus("Item placement cancelled."); });
    this.submitControl = this.control("[ Submit ]", "#8f8", () => this.submit()); this.layoutControls();
  }
  control(label, color, action) { const text = this.add.text(0, 0, label, { fontSize: "18px", fill: color }).setInteractive({ useHandCursor: true }); text.on("pointerdown", action); return text; }
  layoutControls() {
    if (!this.generateControl) return; const layout = this.getLayout(); const y = layout.mobile ? layout.height - 38 : layout.compact ? layout.height - 42 : 720;
    this.title.setPosition(16, 16).setStyle({ fontSize: layout.mobile ? "15px" : "18px" }); this.status.setPosition(16, 40).setStyle({ fontSize: layout.mobile ? "12px" : "14px", wordWrap: { width: layout.width - 32 } });
    if (layout.mobile) { const x = layout.region.x; this.generateControl.setPosition(x, y); this.cancelControl.setPosition(x + 112, y); this.submitControl.setPosition(x + 240, y); }
    else { this.generateControl.setPosition(16, y); this.cancelControl.setPosition(layout.compact ? Math.floor(layout.width / 2) - 55 : 190, y); this.submitControl.setPosition(layout.compact ? layout.width - 100 : 400, y); }
  }

  createDraft() {
    this.maze = { cells: new MazeGenerator(10, 10).generate({ maxInternalWalls: this.wallLimit() }), entrances: [{ x: 1, y: 0, side: "north" }, { x: 8, y: 9, side: "south" }, { x: 9, y: 3, side: "east" }, { x: 0, y: 6, side: "west" }], items: [
      { type: "treasure", x: 1, y: 1 }, { type: "treasure", x: 3, y: 3 }, { type: "treasure", x: 6, y: 6 }, { type: "treasure", x: 8, y: 8 },
      { type: "walking_stick", x: 2, y: 7 }, { type: "crossbow", x: 7, y: 2 }, { type: "pirate_glass", x: 4, y: 5 }, { type: "bear_trap", x: 5, y: 4 },
    ] };
    this.activeItem = null; this.submitted = false; this.drawDraft(); this.setStatus(`Draft ready (${this.room.difficulty ?? "normal"} difficulty). ${this.wallStatus()} Move items or edit the maze before submitting.${this.getLayout().mobile ? " Two fingers pan and zoom." : ""}`);
  }
  setStatus(message, color = "#aaa") { this.status.setText(message).setColor(color); }
  wallLimit() { return getDifficultyWallLimit(this.room.difficulty); }
  wallCount() {
    let count = 0;
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      if (x < 9 && (this.maze.cells[y][x] & WALL.right)) count++;
      if (y < 9 && (this.maze.cells[y][x] & WALL.bottom)) count++;
    }
    return count;
  }
  wallStatus() { const limit = this.wallLimit(); return limit === null ? `${this.wallCount()} internal walls (Hard has no cap).` : `${this.wallCount()}/${limit} internal walls.`; }

  drawDraft() {
    if (!this.maze) return; const layout = this.getLayout(); const { gridX, gridY, cell } = layout;
    this.draftGraphics?.destroy(); this.draftGraphics = this.add.graphics(); this.itemVisuals?.forEach((visual) => visual.destroy()); this.itemVisuals = []; this.paletteVisuals?.forEach((visual) => visual.destroy()); this.paletteVisuals = [];
    this.draftGraphics.lineStyle(2, 0xffffff, 1);
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      const value = this.maze.cells[y][x]; const left = gridX + x * cell; const top = gridY + y * cell;
      if (value & WALL.top) this.draftGraphics.lineBetween(left, top, left + cell, top);
      if (value & WALL.right) this.draftGraphics.lineBetween(left + cell, top, left + cell, top + cell);
      if (value & WALL.bottom) this.draftGraphics.lineBetween(left, top + cell, left + cell, top + cell);
      if (value & WALL.left) this.draftGraphics.lineBetween(left, top, left, top + cell);
    }
    this.draftGraphics.lineStyle(4, 0x55ddff, 1); for (const entrance of this.maze.entrances) this.drawEntrance(entrance, layout);
    for (const item of this.maze.items) {
      const definition = ITEMS.find((candidate) => candidate.type === item.type); const asset = gameAsset(item.type, "board"); const x = gridX + item.x * cell + cell / 2; const y = gridY + item.y * cell + cell / 2;
      if (asset && this.textures.exists(asset.key)) this.itemVisuals.push(addGameSprite(this, item.type, "board", x, y).setDisplaySize(Math.max(14, cell * .58), Math.max(14, cell * .58)));
      else this.itemVisuals.push(this.add.text(gridX + item.x * cell + cell * .34, gridY + item.y * cell + cell * .22, definition.symbol, { fontSize: `${Math.max(14, cell * .42)}px`, fill: definition.color }));
    }
    this.drawPalette(layout);
  }

  drawEntrance(entrance, { gridX, gridY, cell }) {
    const left = gridX + entrance.x * cell; const top = gridY + entrance.y * cell;
    if (entrance.side === "north") this.draftGraphics.lineBetween(left, top, left + cell, top);
    if (entrance.side === "east") this.draftGraphics.lineBetween(left + cell, top, left + cell, top + cell);
    if (entrance.side === "south") this.draftGraphics.lineBetween(left, top + cell, left + cell, top + cell);
    if (entrance.side === "west") this.draftGraphics.lineBetween(left, top, left, top + cell);
  }
  drawPalette(layout) {
    const { paletteX: x, paletteY: y } = layout; this.paletteVisuals.push(this.add.text(x, y, `Required items\n${this.wallStatus()}`, { fontSize: "16px", fill: "#fff" }));
    ITEMS.forEach((definition, index) => {
      const placed = this.maze.items.filter((item) => item.type === definition.type).length; const active = this.activeItem?.type === definition.type; const twoColumns = layout.compact || layout.mobile; const column = twoColumns ? index % 2 : 0; const row = twoColumns ? Math.floor(index / 2) : index; const columnWidth = layout.mobile ? Math.floor((layout.width - x - 12) / 2) : Math.floor((layout.width - 28) / 2);
      const tileX = x + column * columnWidth; const tileY = y + 48 + row * (twoColumns ? (layout.mobile ? 42 : 52) : 58); const asset = gameAsset(definition.type, "inventory"); const labelX = asset && this.textures.exists(asset.key) ? tileX + (layout.mobile ? 28 : 38) : tileX;
      if (asset && this.textures.exists(asset.key)) { const image = addGameSprite(this, definition.type, "inventory", tileX + (layout.mobile ? 16 : 20), tileY + (layout.mobile ? 15 : 20)).setDisplaySize(layout.mobile ? 22 : 30, layout.mobile ? 22 : 30).setInteractive({ useHandCursor: true }); image.on("pointerdown", () => this.selectPaletteItem(definition)); this.paletteVisuals.push(image); }
      const text = this.add.text(labelX, tileY, `${asset && this.textures.exists(asset.key) ? "" : `${definition.symbol} `}${definition.label}\n${placed}/${definition.quota}`, { fontSize: layout.mobile ? "11px" : "14px", fill: active ? "#fff" : definition.color, backgroundColor: active ? "#555" : "#222", padding: { x: 5, y: 4 } }).setInteractive({ useHandCursor: true });
      text.on("pointerdown", () => this.selectPaletteItem(definition)); this.paletteVisuals.push(text);
    });
  }

  selectPaletteItem(definition) { if (this.maze.items.filter((item) => item.type === definition.type).length >= definition.quota) return this.setStatus(`All ${definition.label} items are already placed.`); this.activeItem = { type: definition.type }; this.drawDraft(); this.setStatus(`Place ${definition.label} on an empty, non-entrance cell.`); }
  getBoardCell(pointer) { return this.viewport.contains(pointer.x, pointer.y) ? this.viewport.toCell(pointer.x, pointer.y) : null; }
  getNearestEdge(pointer, cell) { const layout = this.getLayout(); const localX = pointer.x - (layout.gridX + cell.x * layout.cell); const localY = pointer.y - (layout.gridY + cell.y * layout.cell); const choices = [{ side: "left", distance: localX }, { side: "right", distance: layout.cell - localX }, { side: "top", distance: localY }, { side: "bottom", distance: layout.cell - localY }].sort((a, b) => a.distance - b.distance); return choices[0].distance <= Math.max(8, layout.cell * .22) ? choices[0].side : null; }
  isExterior(cell, side) { return (side === "top" && cell.y === 0) || (side === "right" && cell.x === 9) || (side === "bottom" && cell.y === 9) || (side === "left" && cell.x === 0); }

  isTouch(pointer) { return pointer.pointerType === "touch"; }
  rememberTouch(pointer) { this.touchPoints.set(pointer.id, { x: pointer.x, y: pointer.y }); }
  touchPair() { return [...this.touchPoints.values()].slice(0, 2); }
  handlePointerDown(pointer) {
    if (!this.isTouch(pointer)) return this.handleBoardPointerDown(pointer);
    this.rememberTouch(pointer);
    if (this.touchPoints.size > 1) { this.drag = null; this.touchGesture = { multi: true }; return; }
    this.touchGesture = { x: pointer.x, y: pointer.y, moved: false, editing: false, multi: false };
  }
  handlePointerMove(pointer) {
    if (!this.isTouch(pointer)) return this.handleBoardPointerMove(pointer);
    if (!this.touchPoints.has(pointer.id)) return; const previous = this.touchPoints.get(pointer.id); this.rememberTouch(pointer); const points = this.touchPair();
    if (points.length > 1) {
      const [a, b] = points; const distance = Math.hypot(a.x - b.x, a.y - b.y); const centerX = (a.x + b.x) / 2; const centerY = (a.y + b.y) / 2;
      if (this.touchGesture?.distance) { this.viewport.panBy(centerX - this.touchGesture.centerX, centerY - this.touchGesture.centerY); this.viewport.zoomAt(this.viewport.zoom * distance / this.touchGesture.distance, centerX, centerY); this.drawDraft(); }
      this.drag = null; this.touchGesture = { distance, centerX, centerY, moved: true, multi: true }; return;
    }
    if (this.touchGesture?.multi) return;
    if (Math.hypot(pointer.x - this.touchGesture.x, pointer.y - this.touchGesture.y) > 8) { this.touchGesture.moved = true; if (!this.touchGesture.editing) { this.touchGesture.editing = true; this.handleBoardPointerDown(pointer); } this.handleBoardPointerMove(pointer); }
  }
  handlePointerUp(pointer) {
    if (!this.isTouch(pointer)) { this.drag = null; return; }
    const gesture = this.touchGesture; this.touchPoints.delete(pointer.id);
    if (!this.touchPoints.size && gesture && !gesture.moved) this.handleBoardPointerDown(pointer);
    if (!this.touchPoints.size) { this.drag = null; this.touchGesture = null; }
  }
  handleBoardPointerDown(pointer) {
    const cell = this.getBoardCell(pointer); if (!cell) return; const item = this.maze.items.find((candidate) => candidate.x === cell.x && candidate.y === cell.y);
    if (item && !this.activeItem) { this.maze.items = this.maze.items.filter((candidate) => candidate !== item); this.activeItem = { type: item.type }; this.submitted = false; this.drawDraft(); return this.setStatus(`Picked up ${item.type}. Click an empty cell to place it.`); }
    if (this.activeItem) return this.placeActiveItem(cell); const side = this.getNearestEdge(pointer, cell); if (!side) return; if (this.isExterior(cell, side)) return this.relocateEntrance(cell, side);
    const desiredWall = !(this.maze.cells[cell.y][cell.x] & WALL[side]);
    if (desiredWall && this.wallLimit() !== null && this.wallCount() >= this.wallLimit()) return this.setStatus(`${this.room.difficulty} difficulty allows at most ${this.wallLimit()} internal walls.`, "#f88");
    this.drag = { desiredWall, edited: new Set() }; this.applyWallEdit(cell, side);
  }
  handleBoardPointerMove(pointer) { if (!pointer.isDown || !this.drag) return; const cell = this.getBoardCell(pointer); if (!cell) return; const side = this.getNearestEdge(pointer, cell); if (!side || this.isExterior(cell, side)) return; if (this.drag.desiredWall && this.wallLimit() !== null && this.wallCount() >= this.wallLimit()) { this.drag = null; return this.setStatus(`${this.room.difficulty} difficulty allows at most ${this.wallLimit()} internal walls.`, "#f88"); } this.applyWallEdit(cell, side); }
  applyWallEdit(cell, side) { const editKey = `${cell.x},${cell.y},${side}`; if (this.drag.edited.has(editKey)) return; this.drag.edited.add(editKey); const neighbor = { x: cell.x + DELTA[side].x, y: cell.y + DELTA[side].y }; if (this.drag.desiredWall) { this.maze.cells[cell.y][cell.x] |= WALL[side]; this.maze.cells[neighbor.y][neighbor.x] |= WALL[OPPOSITE[side]]; } else { this.maze.cells[cell.y][cell.x] &= ~WALL[side]; this.maze.cells[neighbor.y][neighbor.x] &= ~WALL[OPPOSITE[side]]; } this.submitted = false; this.drawDraft(); this.setStatus(this.drag.desiredWall ? "Drawing walls…" : "Removing walls…"); }
  relocateEntrance(cell, edge) { const side = ENTRANCE_SIDE[edge]; if (this.maze.entrances.some((entrance) => entrance.side !== side && entrance.x === cell.x && entrance.y === cell.y)) return this.setStatus("Entrance cells must be distinct.", "#f88"); const previous = this.maze.entrances.find((entrance) => entrance.side === side); const flag = WALL[edge]; this.maze.cells[previous.y][previous.x] |= flag; this.maze.cells[cell.y][cell.x] &= ~flag; previous.x = cell.x; previous.y = cell.y; this.submitted = false; this.drawDraft(); this.setStatus(`${side} entrance moved.`); }
  placeActiveItem(cell) { if (this.maze.items.some((item) => item.x === cell.x && item.y === cell.y)) return this.setStatus("That cell already contains an item.", "#f88"); if (this.maze.entrances.some((entrance) => entrance.x === cell.x && entrance.y === cell.y)) return this.setStatus("Items cannot be placed on entrances.", "#f88"); this.maze.items.push({ type: this.activeItem.type, x: cell.x, y: cell.y }); this.activeItem = null; this.submitted = false; this.drawDraft(); this.setStatus("Item placed."); }
  submit() { if (this.activeItem) return this.setStatus("Place or cancel the active item before submitting.", "#f88"); this.submitted = true; socket.emit(EVENTS.SUBMIT_MAZE, { maze: this.maze }); this.setStatus("Maze submitted. Waiting for your opponent…"); }
}
