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

  generate() {
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

    // 3. Inject Entrances/Exits (Ported exactly from your Godot borders rules)

    // Left border opening
    const leftY = Math.floor(Math.random() * this.height);
    let leftWalls = 0;
    if (leftY === 0) leftWalls |= this.N;
    if (leftY === this.height - 1) leftWalls |= this.S;
    mapArray[leftY][0] = leftWalls;

    // Top border opening
    const topX = Math.floor(Math.random() * this.width);
    let topWall = 0;
    if (topX === 0) topWall |= this.W;
    if (topX === this.width - 1) topWall |= this.E;
    mapArray[0][topX] = topWall;

    // Right border opening
    const rightY = Math.floor(Math.random() * this.height);
    let rightWall = 0;
    if (rightY === 0) rightWall |= this.N;
    if (rightY === this.height - 1) rightWall |= this.S;
    mapArray[rightY][this.width - 1] = rightWall;

    // Bottom border opening
    const bottomX = Math.floor(Math.random() * this.width);
    let bottomWall = 0;
    if (bottomX === 0) bottomWall |= this.W;
    if (bottomX === this.width - 1) bottomWall |= this.E;
    mapArray[this.height - 1][bottomX] = bottomWall;

    return mapArray;
  }
}
