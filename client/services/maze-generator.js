export class MazeGenerator {
  constructor(width = 10, height = 10) {
    this.width = width;
    this.height = height;

    // Bitwise flags matching your object structure
    this.N = 1; // Up
    this.E = 2; // Right
    this.S = 4; // Down
    this.W = 8; // Left

    // Map delta vectors to direction flags
    this.cellWalls = {
      "1,0": this.E, // Moving Right
      "-1,0": this.W, // Moving Left
      "0,1": this.S, // Moving Down
      "0,-1": this.N, // Moving Up
    };
  }

  // Helper to check for unvisited neighboring tiles
  _getUnvisitedNeighbors(cx, cy, unvisitedSet) {
    const list = [];
    const directions = [
      { x: 1, y: 0 }, // East
      { x: -1, y: 0 }, // West
      { x: 0, y: 1 }, // South
      { x: 0, y: -1 }, // North
    ];

    for (const dir of directions) {
      const nx = cx + dir.x;
      const ny = cy + dir.y;
      const key = `${nx},${ny}`;

      if (unvisitedSet.has(key)) {
        list.push({ x: nx, y: ny, dx: dir.x, dy: dir.y });
      }
    }
    return list;
  }

  generate({ maxInternalWalls } = {}) {
    // 1. Initialize map array filled with solid walls (15 = N|E|S|W)
    // Structured as map[y][x] to directly feed into Phaser's tilemap system
    const mapArray = Array.from({ length: this.height }, () =>
      Array(this.width).fill(this.N | this.E | this.S | this.W),
    );

    const unvisited = new Set();
    const stack = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        unvisited.add(`${x},${y}`);
      }
    }

    let current = { x: 0, y: 0 };
    unvisited.delete(`0,0`);

    // 2. Main DFS Backtracking Loop
    while (unvisited.size > 0) {
      const neighbors = this._getUnvisitedNeighbors(
        current.x,
        current.y,
        unvisited,
      );

      if (neighbors.length > 0) {
        // Pick random unvisited neighbor
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        stack.push({ x: current.x, y: current.y });

        // Carve paths between cells by removing bitwise flags
        const dirFlag = this.cellWalls[`${next.dx},${next.dy}`];
        const oppFlag = this.cellWalls[`${-next.dx},${-next.dy}`];

        mapArray[current.y][current.x] -= dirFlag;
        mapArray[next.y][next.x] -= oppFlag;

        current = { x: next.x, y: next.y };
        unvisited.delete(`${next.x},${next.y}`);
      } else if (stack.length > 0) {
        current = stack.pop();
      }
    }

    // A perfect maze has the greatest possible wall density while still keeping
    // every cell reachable. Open random existing walls to meet lower difficulty caps.
    const internalWalls = [];
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
      if (x + 1 < this.width && (mapArray[y][x] & this.E)) internalWalls.push({ x, y, flag: this.E, oppositeFlag: this.W, nx: x + 1, ny: y });
      if (y + 1 < this.height && (mapArray[y][x] & this.S)) internalWalls.push({ x, y, flag: this.S, oppositeFlag: this.N, nx: x, ny: y + 1 });
    }
    const targetWallCount = Math.max(0, Math.min(internalWalls.length, maxInternalWalls ?? internalWalls.length));
    for (let index = internalWalls.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [internalWalls[index], internalWalls[swapIndex]] = [internalWalls[swapIndex], internalWalls[index]];
    }
    for (const wall of internalWalls.slice(0, internalWalls.length - targetWallCount)) {
      mapArray[wall.y][wall.x] &= ~wall.flag;
      mapArray[wall.ny][wall.nx] &= ~wall.oppositeFlag;
    }

    // Open exactly one distinct border cell on each edge. Internal walls remain symmetric.
    const positions = { north: { x: 1, y: 0, flag: this.N }, east: { x: this.width - 1, y: 3, flag: this.E }, south: { x: this.width - 2, y: this.height - 1, flag: this.S }, west: { x: 0, y: this.height - 4, flag: this.W } };
    for (const position of Object.values(positions)) mapArray[position.y][position.x] &= ~position.flag;
    return mapArray;
  }
}
