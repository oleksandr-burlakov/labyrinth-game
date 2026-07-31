import { ITEM_QUOTAS, MAZE_HEIGHT, MAZE_WIDTH, WALLS } from "./constants.js";
import { areWallsSymmetric, reachableCells } from "./maze.js";

export function validateMaze(maze, options = {}) {
  const width = options.width ?? MAZE_WIDTH; const height = options.height ?? MAZE_HEIGHT;
  const errors = [];
  if (!Array.isArray(maze) || maze.length !== height || maze.some((row) => !Array.isArray(row) || row.length !== width)) errors.push("maze dimensions must be 10x10");
  if (errors.length) return { valid: false, errors };
  if (maze.flat().some((cell) => !Number.isInteger(cell) || cell < 0 || cell > 15)) errors.push("maze cells must be wall bitmasks from 0 to 15");
  if (!areWallsSymmetric(maze, width, height)) errors.push("adjacent wall data is not symmetric");
  if (reachableCells(maze).size !== width * height) errors.push("all inner cells must be reachable");
  return { valid: errors.length === 0, errors };
}

export function validateItems(items = []) {
  const errors = []; const counts = Object.fromEntries(Object.keys(ITEM_QUOTAS).map((key) => [key, 0])); const positions = new Set();
  for (const item of items) {
    if (!item || !Object.hasOwn(ITEM_QUOTAS, item.type)) { errors.push("unknown item type"); continue; }
    if (!Number.isInteger(item.x) || !Number.isInteger(item.y) || item.x < 0 || item.x >= MAZE_WIDTH || item.y < 0 || item.y >= MAZE_HEIGHT) { errors.push("items must be placed inside the maze"); continue; }
    counts[item.type]++;
    if (counts[item.type] > ITEM_QUOTAS[item.type]) errors.push(`too many ${item.type} items`);
    const key = `${item.x},${item.y}`; if (positions.has(key)) errors.push("items cannot overlap"); positions.add(key);
  }
  for (const [type, quota] of Object.entries(ITEM_QUOTAS)) if (counts[type] !== quota) errors.push(`exactly ${quota} ${type} item${quota === 1 ? "" : "s"} ${quota === 1 ? "is" : "are"} required`);
  return { valid: errors.length === 0, errors, counts };
}

export function validateEntrances(maze, entrances = []) {
  const errors = [];
  const requiredSides = new Set(["north", "east", "south", "west"]);
  const seenSides = new Set(); const seenCells = new Set();
  if (!Array.isArray(entrances) || entrances.length !== 4) errors.push("exactly four entrances are required");
  for (const entrance of entrances) {
    if (!entrance || !requiredSides.has(entrance.side) || !Number.isInteger(entrance.x) || !Number.isInteger(entrance.y)) { errors.push("entrance coordinates or side are invalid"); continue; }
    const inBounds = entrance.x >= 0 && entrance.x < MAZE_WIDTH && entrance.y >= 0 && entrance.y < MAZE_HEIGHT;
    const onEdge = entrance.side === "north" ? entrance.y === 0 : entrance.side === "east" ? entrance.x === MAZE_WIDTH - 1 : entrance.side === "south" ? entrance.y === MAZE_HEIGHT - 1 : entrance.x === 0;
    if (!inBounds) errors.push("entrances must be inside the maze bounds");
    if (!onEdge) errors.push("entrances must be on their declared border");
    const cellKey = `${entrance.x},${entrance.y}`;
    if (seenSides.has(entrance.side) || seenCells.has(cellKey)) errors.push("entrances must use each edge and cell once");
    seenSides.add(entrance.side); seenCells.add(cellKey);
  }
  if (seenSides.size !== 4) errors.push("one entrance is required on each edge");
  if (Array.isArray(maze) && maze.length === MAZE_HEIGHT) {
    const declaredEntrances = new Set((entrances ?? []).map(({ x, y, side }) => `${x},${y},${side}`));
    const borderCells = [];
    for (let x = 0; x < MAZE_WIDTH; x++) { borderCells.push({ x, y: 0, side: "north" }, { x, y: MAZE_HEIGHT - 1, side: "south" }); }
    for (let y = 0; y < MAZE_HEIGHT; y++) { borderCells.push({ x: 0, y, side: "west" }, { x: MAZE_WIDTH - 1, y, side: "east" }); }
    for (const border of borderCells) {
      const wall = { north: WALLS.NORTH, east: WALLS.EAST, south: WALLS.SOUTH, west: WALLS.WEST }[border.side];
      const isEntrance = declaredEntrances.has(`${border.x},${border.y},${border.side}`);
      if (Number.isInteger(maze[border.y]?.[border.x]) && Boolean(maze[border.y][border.x] & wall) === isEntrance) errors.push(isEntrance ? "entrance border walls must be open" : "all non-entrance border walls must be closed");
    }
    for (const entrance of entrances) {
      const cell = maze[entrance.y]?.[entrance.x];
      const wall = { north: WALLS.NORTH, east: WALLS.EAST, south: WALLS.SOUTH, west: WALLS.WEST }[entrance.side];
      if (Number.isInteger(cell) && (cell & wall)) errors.push("entrance border walls must be open");
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateSetupSubmission(maze, entrances, items) {
  const mazeResult = validateMaze(maze);
  const entranceResult = validateEntrances(maze, entrances);
  const itemResult = validateItems(items);
  const entranceCells = new Set((entrances ?? []).map(({ x, y }) => `${x},${y}`));
  const itemErrors = (items ?? []).filter((item) => item && entranceCells.has(`${item.x},${item.y}`)).length ? ["items cannot be placed on entrances"] : [];
  return { valid: mazeResult.valid && entranceResult.valid && itemResult.valid && itemErrors.length === 0, errors: [...mazeResult.errors, ...entranceResult.errors, ...itemResult.errors, ...itemErrors] };
}
