import { describe, expect, it } from "vitest";
import { canSendMove, perspectiveFor, secondsRemaining } from "./match-view.js";

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
  });
  it("calculates a non-negative timer", () => {
    expect(secondsRemaining(1_050, 1_000)).toBe(1); expect(secondsRemaining(900, 1_000)).toBe(0);
  });
});
