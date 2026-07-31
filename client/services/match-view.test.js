import { describe, expect, it } from "vitest";
import { canSendMove, isOuterMazeEdge, perspectiveFor, secondsRemaining } from "./match-view.js";

describe("match view helpers", () => {
  const room = { phase: "playing", turn: { activePlayerId: "a", movesRemaining: 1 } };
  it("selects explorer and observer perspectives from the authoritative turn", () => {
    expect(perspectiveFor(room, "a")).toBe("explorer");
    expect(perspectiveFor(room, "b")).toBe("observer");
  });
  it("only enables one connected active-player action at a time", () => {
    expect(canSendMove(room, "a", true, false)).toBe(true);
    expect(canSendMove(room, "b", true, false)).toBe(false);
    expect(canSendMove(room, "a", true, true)).toBe(false);
    expect(canSendMove({ ...room, turn: { ...room.turn, availableAt: 2_000 } }, "a", true, false, 1_999)).toBe(false);
    expect(canSendMove({ ...room, turn: { ...room.turn, availableAt: 2_000 } }, "a", true, false, 2_000)).toBe(true);
  });
  it("calculates a non-negative timer", () => {
    expect(secondsRemaining(1_050, 1_000)).toBe(1); expect(secondsRemaining(900, 1_000)).toBe(0);
  });
  it("identifies only edges that face outside the maze", () => {
    expect(isOuterMazeEdge(4, 0, "north")).toBe(true);
    expect(isOuterMazeEdge(9, 4, "east")).toBe(true);
    expect(isOuterMazeEdge(4, 9, "south")).toBe(true);
    expect(isOuterMazeEdge(0, 4, "west")).toBe(true);
    expect(isOuterMazeEdge(4, 0, "east")).toBe(false);
    expect(isOuterMazeEdge(0, 4, "north")).toBe(false);
    expect(isOuterMazeEdge(9, 4, "west")).toBe(false);
    expect(isOuterMazeEdge(4, 9, "east")).toBe(false);
  });
});
