import { socket, EVENTS } from "../services/socket-service.js";
import { MazeGenerator } from "../services/maze-generator.js";

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
  init({ room }) { this.room = room; this.maze = null; this.activeItem = null; this.drag = null; this.submitted = false; }

  create() {
    this.title = this.add.text(16, 16, `Room ${this.room.code} — Build the maze your opponent will play`, { fontSize: "18px", fill: "#fff" });
    this.status = this.add.text(16, 44, "Click near an edge to edit it. Drag to draw a wall line.", { fontSize: "14px", fill: "#aaa", wordWrap: { width: 740 } });
    this.createControls(); this.createDraft();
    this.input.on("pointerdown", this.handlePointerDown, this); this.input.on("pointermove", this.handlePointerMove, this); this.input.on("pointerup", () => { this.drag = null; });
    this.onRoom = ({ room }) => { this.room = room; if (room.phase === "playing" || room.phase === "starting") this.scene.start("MainScene", { room }); };
    this.onStart = ({ room }) => this.scene.start("MainScene", { room }); this.onError = ({ message, details = [] }) => this.setStatus(`${message} ${details.join("; ")}`, "#f88");
    socket.on(EVENTS.ROOM_SNAPSHOT, this.onRoom); socket.on(EVENTS.START_MATCH, this.onStart); socket.on(EVENTS.ERROR, this.onError);
    this.onResize = () => { this.layoutControls(); this.drawDraft(); }; this.scale.on("resize", this.onResize);
    this.events.once("shutdown", () => {
      socket.off(EVENTS.ROOM_SNAPSHOT, this.onRoom); socket.off(EVENTS.START_MATCH, this.onStart); socket.off(EVENTS.ERROR, this.onError); this.scale.off("resize", this.onResize);
      this.input.off("pointerdown", this.handlePointerDown, this); this.input.off("pointermove", this.handlePointerMove, this);
    });
  }

  getLayout() {
    const width = this.scale.width; const height = this.scale.height; const compact = width < 650;
    const cell = Math.max(25, Math.min(compact ? 38 : 56, Math.floor((width - (compact ? 30 : 240)) / 10), Math.floor((height - (compact ? 350 : 160)) / 10)));
    const boardWidth = cell * 10;
    return { width, height, compact, cell, boardWidth, gridX: compact ? Math.floor((width - boardWidth) / 2) : 120, gridY: compact ? 92 : 90, paletteX: compact ? 14 : 700, paletteY: compact ? 92 + boardWidth + 18 : 100 };
  }

  createControls() {
    this.generateControl = this.control("[ Generate ]", "#8cf", () => this.createDraft());
    this.cancelControl = this.control("[ Cancel item ]", "#ddd", () => { this.activeItem = null; this.drawDraft(); this.setStatus("Item placement cancelled."); });
    this.submitControl = this.control("[ Submit ]", "#8f8", () => this.submit()); this.layoutControls();
  }
  control(label, color, action) { const text = this.add.text(0, 0, label, { fontSize: "18px", fill: color }).setInteractive({ useHandCursor: true }); text.on("pointerdown", action); return text; }
  layoutControls() {
    if (!this.generateControl) return; const layout = this.getLayout(); const y = layout.compact ? layout.height - 42 : 720;
    this.title.setPosition(16, 16); this.status.setPosition(16, 44).setStyle({ wordWrap: { width: layout.width - 32 } });
    this.generateControl.setPosition(16, y); this.cancelControl.setPosition(layout.compact ? Math.floor(layout.width / 2) - 55 : 190, y); this.submitControl.setPosition(layout.compact ? layout.width - 100 : 400, y);
  }

  createDraft() {
    this.maze = { cells: new MazeGenerator(10, 10).generate(), entrances: [{ x: 1, y: 0, side: "north" }, { x: 8, y: 9, side: "south" }, { x: 9, y: 3, side: "east" }, { x: 0, y: 6, side: "west" }], items: [
      { type: "treasure", x: 1, y: 1 }, { type: "treasure", x: 3, y: 3 }, { type: "treasure", x: 6, y: 6 }, { type: "treasure", x: 8, y: 8 },
      { type: "walking_stick", x: 2, y: 7 }, { type: "crossbow", x: 7, y: 2 }, { type: "pirate_glass", x: 4, y: 5 }, { type: "bear_trap", x: 5, y: 4 },
    ] };
    this.activeItem = null; this.submitted = false; this.drawDraft(); this.setStatus("Draft ready. Move items or edit the maze before submitting.");
  }
  setStatus(message, color = "#aaa") { this.status.setText(message).setColor(color); }

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
    for (const item of this.maze.items) { const definition = ITEMS.find((candidate) => candidate.type === item.type); this.itemVisuals.push(this.add.text(gridX + item.x * cell + cell * .34, gridY + item.y * cell + cell * .22, definition.symbol, { fontSize: `${Math.max(14, cell * .42)}px`, fill: definition.color })); }
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
    const { paletteX: x, paletteY: y } = layout; this.paletteVisuals.push(this.add.text(x, y, "Required items", { fontSize: "16px", fill: "#fff" }));
    ITEMS.forEach((definition, index) => {
      const placed = this.maze.items.filter((item) => item.type === definition.type).length; const active = this.activeItem?.type === definition.type; const column = layout.compact ? index % 2 : 0; const row = layout.compact ? Math.floor(index / 2) : index;
      const text = this.add.text(x + column * Math.floor((layout.width - 28) / 2), y + 28 + row * (layout.compact ? 52 : 58), `${definition.symbol} ${definition.label}\n${placed}/${definition.quota}`, { fontSize: "14px", fill: active ? "#fff" : definition.color, backgroundColor: active ? "#555" : "#222", padding: { x: 5, y: 4 } }).setInteractive({ useHandCursor: true });
      text.on("pointerdown", () => this.selectPaletteItem(definition)); this.paletteVisuals.push(text);
    });
  }

  selectPaletteItem(definition) { if (this.maze.items.filter((item) => item.type === definition.type).length >= definition.quota) return this.setStatus(`All ${definition.label} items are already placed.`); this.activeItem = { type: definition.type }; this.drawDraft(); this.setStatus(`Place ${definition.label} on an empty, non-entrance cell.`); }
  getBoardCell(pointer) { const { gridX, gridY, cell } = this.getLayout(); const x = Math.floor((pointer.x - gridX) / cell); const y = Math.floor((pointer.y - gridY) / cell); return x >= 0 && x < 10 && y >= 0 && y < 10 ? { x, y } : null; }
  getNearestEdge(pointer, cell) { const layout = this.getLayout(); const localX = pointer.x - (layout.gridX + cell.x * layout.cell); const localY = pointer.y - (layout.gridY + cell.y * layout.cell); const choices = [{ side: "left", distance: localX }, { side: "right", distance: layout.cell - localX }, { side: "top", distance: localY }, { side: "bottom", distance: layout.cell - localY }].sort((a, b) => a.distance - b.distance); return choices[0].distance <= Math.max(8, layout.cell * .22) ? choices[0].side : null; }
  isExterior(cell, side) { return (side === "top" && cell.y === 0) || (side === "right" && cell.x === 9) || (side === "bottom" && cell.y === 9) || (side === "left" && cell.x === 0); }

  handlePointerDown(pointer) {
    const cell = this.getBoardCell(pointer); if (!cell) return; const item = this.maze.items.find((candidate) => candidate.x === cell.x && candidate.y === cell.y);
    if (item && !this.activeItem) { this.maze.items = this.maze.items.filter((candidate) => candidate !== item); this.activeItem = { type: item.type }; this.submitted = false; this.drawDraft(); return this.setStatus(`Picked up ${item.type}. Click an empty cell to place it.`); }
    if (this.activeItem) return this.placeActiveItem(cell); const side = this.getNearestEdge(pointer, cell); if (!side) return; if (this.isExterior(cell, side)) return this.relocateEntrance(cell, side);
    this.drag = { desiredWall: !(this.maze.cells[cell.y][cell.x] & WALL[side]), edited: new Set() }; this.applyWallEdit(cell, side);
  }
  handlePointerMove(pointer) { if (!pointer.isDown || !this.drag) return; const cell = this.getBoardCell(pointer); if (!cell) return; const side = this.getNearestEdge(pointer, cell); if (!side || this.isExterior(cell, side)) return; this.applyWallEdit(cell, side); }
  applyWallEdit(cell, side) { const editKey = `${cell.x},${cell.y},${side}`; if (this.drag.edited.has(editKey)) return; this.drag.edited.add(editKey); const neighbor = { x: cell.x + DELTA[side].x, y: cell.y + DELTA[side].y }; if (this.drag.desiredWall) { this.maze.cells[cell.y][cell.x] |= WALL[side]; this.maze.cells[neighbor.y][neighbor.x] |= WALL[OPPOSITE[side]]; } else { this.maze.cells[cell.y][cell.x] &= ~WALL[side]; this.maze.cells[neighbor.y][neighbor.x] &= ~WALL[OPPOSITE[side]]; } this.submitted = false; this.drawDraft(); this.setStatus(this.drag.desiredWall ? "Drawing walls…" : "Removing walls…"); }
  relocateEntrance(cell, edge) { const side = ENTRANCE_SIDE[edge]; if (this.maze.entrances.some((entrance) => entrance.side !== side && entrance.x === cell.x && entrance.y === cell.y)) return this.setStatus("Entrance cells must be distinct.", "#f88"); const previous = this.maze.entrances.find((entrance) => entrance.side === side); const flag = WALL[edge]; this.maze.cells[previous.y][previous.x] |= flag; this.maze.cells[cell.y][cell.x] &= ~flag; previous.x = cell.x; previous.y = cell.y; this.submitted = false; this.drawDraft(); this.setStatus(`${side} entrance moved.`); }
  placeActiveItem(cell) { if (this.maze.items.some((item) => item.x === cell.x && item.y === cell.y)) return this.setStatus("That cell already contains an item.", "#f88"); if (this.maze.entrances.some((entrance) => entrance.x === cell.x && entrance.y === cell.y)) return this.setStatus("Items cannot be placed on entrances.", "#f88"); this.maze.items.push({ type: this.activeItem.type, x: cell.x, y: cell.y }); this.activeItem = null; this.submitted = false; this.drawDraft(); this.setStatus("Item placed."); }
  submit() { if (this.activeItem) return this.setStatus("Place or cancel the active item before submitting.", "#f88"); this.submitted = true; socket.emit(EVENTS.SUBMIT_MAZE, { maze: this.maze }); this.setStatus("Maze submitted. Waiting for your opponent…"); }
}
