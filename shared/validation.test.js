import { describe, expect, it } from "vitest";
import { validateItems, validateMaze, validateSetupSubmission } from "./validation.js";
import { WALLS } from "./constants.js";
import { projectRoom } from "./models.js";

function openMaze() {
  return Array.from({ length: 10 }, (_, y) => Array.from({ length: 10 }, (_, x) =>
    (x === 0 ? WALLS.WEST : 0) | (x === 9 ? WALLS.EAST : 0) | (y === 0 ? WALLS.NORTH : 0) | (y === 9 ? WALLS.SOUTH : 0)));
}

describe("maze validation", () => {
  it("accepts a connected symmetric maze", () => expect(validateMaze(openMaze()).valid).toBe(true));
  it("rejects asymmetric walls and disconnected cells", () => {
    const maze = openMaze(); maze[0][0] |= WALLS.EAST; expect(validateMaze(maze).valid).toBe(false);
  });
  it("rejects malformed dimensions", () => expect(validateMaze([[0]]).valid).toBe(false));
});

describe("item validation", () => {
  it("requires exactly four treasures", () => {
    const items = [...Array.from({ length: 4 }, (_, x) => ({ type: "treasure", x, y: 0 })), { type: "walking_stick", x: 4, y: 0 }, { type: "crossbow", x: 5, y: 0 }, { type: "pirate_glass", x: 6, y: 0 }, { type: "bear_trap", x: 7, y: 0 }];
    expect(validateItems(items).valid).toBe(true);
    expect(validateItems(items.slice(0, 3)).valid).toBe(false);
  });
  it("rejects duplicate positions and over-quota items", () => {
    const items = [{ type: "treasure", x: 0, y: 0 }, { type: "treasure", x: 0, y: 0 }, { type: "treasure", x: 1, y: 0 }, { type: "treasure", x: 2, y: 0 }, { type: "treasure", x: 3, y: 0 }, { type: "treasure", x: 4, y: 0 }];
    expect(validateItems(items).valid).toBe(false);
  });
});

describe("recipient snapshots", () => {
  it("omit the opponent maze", () => {
    const room = { name: "r", phase: "playing", players: [], mazes: { a: { cells: [[1]], items: [] }, b: { cells: [[2]], items: [] } }, fog: {}, turn: null, result: null };
    const snapshot = projectRoom(room, "a");
    expect(snapshot.mazes).toEqual({ a: { cells: [[1]], items: [] } });
  });
});

describe("setup validation", () => {
  it("rejects missing or malformed entrances", () => expect(validateSetupSubmission(openMaze(), [], []).valid).toBe(false));
  it("requires every special item and rejects unintended exterior openings", () => {
    const maze = openMaze(); maze[0][1] &= ~WALLS.NORTH;
    const entrances = [{ x: 1, y: 0, side: "north" }, { x: 9, y: 1, side: "east" }, { x: 8, y: 9, side: "south" }, { x: 0, y: 6, side: "west" }];
    maze[1][9] &= ~WALLS.EAST; maze[9][8] &= ~WALLS.SOUTH; maze[6][0] &= ~WALLS.WEST;
    const items = [...Array.from({ length: 4 }, (_, x) => ({ type: "treasure", x: x + 1, y: 1 })), { type: "walking_stick", x: 5, y: 2 }, { type: "crossbow", x: 6, y: 2 }, { type: "pirate_glass", x: 7, y: 2 }, { type: "bear_trap", x: 8, y: 2 }];
    expect(validateSetupSubmission(maze, entrances, items).valid).toBe(true);
    maze[0][2] &= ~WALLS.NORTH;
    expect(validateSetupSubmission(maze, entrances, items).valid).toBe(false);
  });
});
