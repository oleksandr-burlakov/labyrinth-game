import { DIRECTIONS, MAZE_HEIGHT, MAZE_WIDTH, WALLS } from "./constants.js";

export function inBounds(x, y, width = MAZE_WIDTH, height = MAZE_HEIGHT) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < width && y < height;
}

export function cloneMaze(maze) { return maze.map((row) => [...row]); }

export function areWallsSymmetric(maze, width = MAZE_WIDTH, height = MAZE_HEIGHT) {
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const cell = maze[y][x];
    if (x + 1 < width && Boolean(cell & WALLS.EAST) !== Boolean(maze[y][x + 1] & WALLS.WEST)) return false;
    if (y + 1 < height && Boolean(cell & WALLS.SOUTH) !== Boolean(maze[y + 1][x] & WALLS.NORTH)) return false;
  }
  return true;
}

/** Count internal maze walls once each (east and south edges only). */
export function countInternalWalls(maze, width = MAZE_WIDTH, height = MAZE_HEIGHT) {
  let count = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const cell = maze[y]?.[x];
    if (!Number.isInteger(cell)) continue;
    if (x + 1 < width && cell & WALLS.EAST) count++;
    if (y + 1 < height && cell & WALLS.SOUTH) count++;
  }
  return count;
}

export function reachableCells(maze, start = { x: 0, y: 0 }) {
  const seen = new Set(); const queue = [start];
  while (queue.length) {
    const current = queue.shift(); const key = `${current.x},${current.y}`;
    if (seen.has(key) || !inBounds(current.x, current.y, maze[0]?.length ?? 0, maze.length)) continue;
    seen.add(key); const cell = maze[current.y][current.x];
    for (const direction of Object.values(DIRECTIONS)) if (!(cell & direction.wall)) queue.push({ x: current.x + direction.dx, y: current.y + direction.dy });
  }
  return seen;
}
