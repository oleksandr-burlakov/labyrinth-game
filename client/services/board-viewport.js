const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Keeps a square board inside a fixed screen region while it is panned and zoomed. */
export class BoardViewport {
  constructor({ columns = 10, rows = 10, maxZoom = 2.5 } = {}) {
    this.columns = columns; this.rows = rows; this.maxZoom = maxZoom;
    this.reset();
  }

  reset() { this.region = { x: 0, y: 0, width: 1, height: 1 }; this.fitCell = 1; this.zoom = 1; this.panX = 0; this.panY = 0; }

  setRegion(region, { preserveView = true } = {}) {
    const previousCenter = preserveView ? this.centerCell() : null;
    this.region = { ...region };
    this.fitCell = Math.max(1, Math.min(region.width / this.columns, region.height / this.rows));
    if (previousCenter) this.centerOn(previousCenter.x, previousCenter.y); else this.clamp();
  }

  get cell() { return this.fitCell * this.zoom; }
  get boardWidth() { return this.columns * this.cell; }
  get boardHeight() { return this.rows * this.cell; }
  get x() { return this.region.x + (this.region.width - this.boardWidth) / 2 + this.panX; }
  get y() { return this.region.y + (this.region.height - this.boardHeight) / 2 + this.panY; }

  centerCell() { return this.toCell(this.region.x + this.region.width / 2, this.region.y + this.region.height / 2, false); }
  centerOn(x, y) { this.panX = (this.columns / 2 - x) * this.cell; this.panY = (this.rows / 2 - y) * this.cell; this.clamp(); }
  panBy(dx, dy) { this.panX += dx; this.panY += dy; this.clamp(); }

  zoomAt(nextZoom, screenX, screenY) {
    const anchor = this.toCell(screenX, screenY, false); this.zoom = clamp(nextZoom, 1, this.maxZoom);
    this.panX = screenX - this.region.x - (this.region.width - this.boardWidth) / 2 - anchor.x * this.cell;
    this.panY = screenY - this.region.y - (this.region.height - this.boardHeight) / 2 - anchor.y * this.cell;
    this.clamp();
  }

  clamp() {
    const maxX = Math.max(0, (this.boardWidth - this.region.width) / 2); const maxY = Math.max(0, (this.boardHeight - this.region.height) / 2);
    this.panX = clamp(this.panX, -maxX, maxX); this.panY = clamp(this.panY, -maxY, maxY);
  }

  toCell(screenX, screenY, clampToBoard = true) {
    const x = (screenX - this.x) / this.cell; const y = (screenY - this.y) / this.cell;
    return { x: clampToBoard ? clamp(Math.floor(x), 0, this.columns - 1) : x, y: clampToBoard ? clamp(Math.floor(y), 0, this.rows - 1) : y };
  }

  contains(screenX, screenY) { return screenX >= this.x && screenX < this.x + this.boardWidth && screenY >= this.y && screenY < this.y + this.boardHeight; }
  layout() { return { gridX: this.x, gridY: this.y, cell: this.cell, boardWidth: this.boardWidth }; }
}
