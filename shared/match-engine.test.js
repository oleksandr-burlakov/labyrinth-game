import { describe, expect, it } from "vitest";
import { ITEM_TYPES, ROOM_PHASES, TURN_TRANSITION_MS, WALLS, applyMove, chooseStart, expireTurn, initializeMatch, projectRoom } from "./index.js";

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
    state = applyMove(state, "b", "right", { now: 101 + TURN_TRANSITION_MS }).room;
    state = applyMove(state, "b", "right", { now: 102 + TURN_TRANSITION_MS }).room;
    state = applyMove(state, "a", "right", { now: 102 + TURN_TRANSITION_MS * 2 }).room;
    expect(state.match.playerStates.a.skipTurns).toBe(3);
  });

  it("continues play after both players are caught in bear traps", () => {
    let state = started([{ type: ITEM_TYPES.BEAR_TRAP, x: 2, y: 1 }]);
    state.mazes.a.items = [{ type: ITEM_TYPES.BEAR_TRAP, x: 2, y: 1 }];
    state = applyMove(state, "a", "right", { now: 101 }).room;
    state = applyMove(state, "b", "right", { now: 101 + TURN_TRANSITION_MS }).room;

    expect(state.match.playerStates.a.skipTurns).toBe(0);
    expect(state.match.playerStates.b.skipTurns).toBe(0);
    expect(state.turn.activePlayerId).toBe("a");
    expect(state.turn.availableAt).toBe(101 + TURN_TRANSITION_MS * 2);
    expect(applyMove(state, "a", "up", { now: state.turn.availableAt }).ok).toBe(true);
  });

  it("delays a new turn without shortening its configured timer", () => {
    const state = started();
    const result = applyMove(state, "a", "right", { now: 101 });
    expect(result.room.turn.availableAt).toBe(101 + TURN_TRANSITION_MS);
    expect(applyMove(result.room, "b", "right", { now: 102 }).code).toBe("TURN_NOT_READY");
    expect(applyMove(result.room, "b", "right", { now: 101 + TURN_TRANSITION_MS }).ok).toBe(true);
    const timed = { ...state, turnTimerSeconds: 10 };
    const timedResult = applyMove(timed, "a", "right", { now: 200 });
    expect(timedResult.room.turn.deadlineAt).toBe(200 + TURN_TRANSITION_MS + 10_000);
  });

  it("extracts a carried treasure through an entrance and ends at four", () => {
    let state = started([{ type: ITEM_TYPES.TREASURE, x: 1, y: 1 }]);
    state.match.playerStates.a.extractedTreasures = 3;
    state.match.playerStates.a.position = { x: 1, y: 0 };
    const result = applyMove(state, "a", "up", { now: 101 });
    expect(result.room.phase).toBe(ROOM_PHASES.FINISHED); expect(result.room.result.winnerId).toBe("a");
    expect(result.room.match.playerStates.a.position).toEqual({ x: 1, y: 0 });
  });

  it("reveals the pirate glass forward cell only through an open edge and advances an expired turn", () => {
    let state = started([{ type: ITEM_TYPES.PIRATE_GLASS, x: 1, y: 1 }]);
    state = applyMove(state, "a", "right", { now: 101 }).room;
    expect(state.fog.a.discoveredCells).toContainEqual({ x: 3, y: 1 });
    expect(state.fog.a.revealedEdges).toContainEqual({ x: 2, y: 1, side: "east", blocked: false });
    state.turnTimerSeconds = 10; state.turn = { activePlayerId: "a", turnNumber: 4, movesRemaining: 1, deadlineAt: 200 };
    const expired = expireTurn(state, { now: 200 });
    expect(expired.room.turn.activePlayerId).toBe("b");
  });

  it("does not reveal a pirate-glass cell or item behind a wall", () => {
    const state = started([{ type: ITEM_TYPES.PIRATE_GLASS, x: 1, y: 1 }, { type: ITEM_TYPES.TREASURE, x: 3, y: 1 }]);
    state.mazes.b.cells[1][2] |= WALLS.EAST; state.mazes.b.cells[1][3] |= WALLS.WEST;
    const result = applyMove(state, "a", "right", { now: 101 });
    expect(result.room.fog.a.discoveredCells).not.toContainEqual({ x: 3, y: 1 });
    expect(result.room.fog.a.revealedEdges).toContainEqual({ x: 2, y: 1, side: "east", blocked: true });
    expect(projectRoom(result.room, "a").match.visibleItems).not.toContainEqual({ type: ITEM_TYPES.TREASURE, x: 3, y: 1 });
  });

  it("projects the authored maze for observation but not the target maze", () => {
    const snapshot = projectRoom(started(), "a");
    expect(Object.keys(snapshot.mazes)).toEqual(["a"]); expect(snapshot.match.player.targetMazeOwnerId).toBe("b");
    expect(snapshot.match.opponent.position).toEqual({ x: 1, y: 1 });
  });
});
