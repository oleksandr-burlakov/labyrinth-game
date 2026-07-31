import { describe, expect, it } from "vitest";
import { countInternalWalls, validateMaze } from "@labyrinth/shared";
import { MazeGenerator } from "./maze-generator.js";

describe("MazeGenerator difficulty caps", () => {
  for (const maxInternalWalls of [45, 65, 81]) {
    it(`generates a connected maze with ${maxInternalWalls} internal walls`, () => {
      const maze = new MazeGenerator(10, 10).generate({ maxInternalWalls });
      expect(countInternalWalls(maze)).toBe(maxInternalWalls);
      expect(validateMaze(maze).valid).toBe(true);
    });
  }
});
