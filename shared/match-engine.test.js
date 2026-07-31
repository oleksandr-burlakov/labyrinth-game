import { describe, expect, it } from "vitest";
import { ITEM_TYPES, ROOM_PHASES, WALLS, applyMove, chooseStart, expireTurn, initializeMatch, projectRoom } from "./index.js";

function maze(items = []) {
  const cells = Array.from({ length: 10 }, (_, y) => Array.from({ length: 10 }, (_, x) =>
    (x === 0 ? WALLS.WEST : 0) | (x === 9 ? WALLS.EAST : 0) | (y === 0 ? WALLS.NORTH : 0) | (y === 9 ? WALLS.SOUTH : 0)));
  cells[0][1] &= ~WALLS.NORTH;
  return { width: 10, height: 10, cells, entrances: [{ x: 1, y: 0, side: "north" }], items };
}
function room(items = []) {
  return { phase: ROOM_PHASES.SETUP, turnTimerSeconds: null, players: [{ id: "a", name: "A" }, { id: "b", name: "B" }], mazes: { a: maze(), b: maze(items) }, fog: {}, turn: null, result: null };
}
function started(items = []) {
  let state = initializeMatch(room(items));
  state = chooseStart(state, "a", { x: 1, y: 1 }, { random: () => 0, now: 100 }).room;
  return chooseStart(state, "b", { x: 1, y: 1 }, { random: () => 0, now: 100 }).room;
}

describe("match engine", () => {
  it("moves authoritatively and advances after one ordinary attempt", () => {
    const state = started(); const result = applyMove(state, "a", "right", { now: 101 });
    expect(result.ok).toBe(true); expect(result.room.match.playerStates.a.position).toEqual({ x: 2, y: 1 });
    expect(result.room.turn.activePlayerId).toBe("b");
  });

  it("consumes a blocked bonus attempt without ending the bonus turn", () => {
    const state = started([{ type: ITEM_TYPES.WALKING_STICK, x: 1, y: 1 }]);
    expect(state.match.playerStates.a.movementBonus).toBe(1);
    state.match.playerStates.a.position = { x: 1, y: 0 }; state.match.playerStates.a.movementBonus = 2; state.turn.movesRemaining = 3;
    const blocked = applyMove(state, "a", "up", { now: 101 });
    expect(blocked.room.turn.activePlayerId).toBe("a"); expect(blocked.room.turn.movesRemaining).toBe(2);
    expect(blocked.room.fog.a.revealedEdges).toContainEqual({ x: 1, y: 0, side: "north", blocked: false });
  });

  it("transfers crossbow bonus to the maze creator and skips trap finder turns", () => {
    let state = started([{ type: ITEM_TYPES.CROSSBOW, x: 2, y: 1 }, { type: ITEM_TYPES.BEAR_TRAP, x: 3, y: 1 }]);
    state = applyMove(state, "a", "right", { now: 101 }).room;
    expect(state.match.playerStates.b.movementBonus).toBe(1);
    state = applyMove(state, "b", "right", { now: 102 }).room;
    state = applyMove(state, "b", "right", { now: 103 }).room;
    state = applyMove(state, "a", "right", { now: 104 }).room;
    expect(state.match.playerStates.a.skipTurns).toBe(3);
  });

  it("extracts a carried treasure through an entrance and ends at four", () => {
    let state = started([{ type: ITEM_TYPES.TREASURE, x: 1, y: 1 }]);
    state.match.playerStates.a.extractedTreasures = 3;
    state.match.playerStates.a.position = { x: 1, y: 0 };
    const result = applyMove(state, "a", "up", { now: 101 });
    expect(result.room.phase).toBe(ROOM_PHASES.FINISHED); expect(result.room.result.winnerId).toBe("a");
    expect(result.room.match.playerStates.a.position).toEqual({ x: 1, y: 0 });
  });

  it("reveals only the pirate glass forward cell and advances an expired turn", () => {
    let state = started([{ type: ITEM_TYPES.PIRATE_GLASS, x: 1, y: 1 }]);
    state = applyMove(state, "a", "right", { now: 101 }).room;
    expect(state.fog.a.discoveredCells).toContainEqual({ x: 3, y: 1 });
    expect(state.fog.a.revealedEdges).toContainEqual({ x: 2, y: 1, side: "east", blocked: false });
    state.turnTimerSeconds = 10; state.turn = { activePlayerId: "a", turnNumber: 4, movesRemaining: 1, deadlineAt: 200 };
    const expired = expireTurn(state, { now: 200 });
    expect(expired.room.turn.activePlayerId).toBe("b");
  });

  it("projects the authored maze for observation but not the target maze", () => {
    const snapshot = projectRoom(started(), "a");
    expect(Object.keys(snapshot.mazes)).toEqual(["a"]); expect(snapshot.match.player.targetMazeOwnerId).toBe("b");
    expect(snapshot.match.opponent.position).toEqual({ x: 1, y: 1 });
  });
});
