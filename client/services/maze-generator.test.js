import { describe, expect, it } from "vitest";
import { countInternalWalls, validateMaze } from "@labyrinth/shared";
import { MazeGenerator, generateRandomItems } from "./maze-generator.js";

describe("MazeGenerator difficulty caps", () => {
  for (const maxInternalWalls of [45, 65, 81]) {
    it(`generates a connected maze with ${maxInternalWalls} internal walls`, () => {
      const maze = new MazeGenerator(10, 10).generate({ maxInternalWalls });
      expect(countInternalWalls(maze)).toBe(maxInternalWalls);
      expect(validateMaze(maze).valid).toBe(true);
    });
  }
});

describe("generateRandomItems", () => {
  it("places every required item on a unique, non-entrance cell", () => {
    const entrances = [{ x: 1, y: 0 }, { x: 8, y: 9 }, { x: 9, y: 3 }, { x: 0, y: 6 }]; const items = generateRandomItems(entrances, { random: () => .5 });
    expect(items).toHaveLength(8); expect(new Set(items.map(({ x, y }) => `${x},${y}`)).size).toBe(8); expect(items.some((item) => entrances.some((entrance) => entrance.x === item.x && entrance.y === item.y))).toBe(false);
    expect(items.filter((item) => item.type === "treasure")).toHaveLength(4); expect(items.map((item) => item.type).sort()).toEqual(["bear_trap", "crossbow", "pirate_glass", "treasure", "treasure", "treasure", "treasure", "walking_stick"]);
  });
});
