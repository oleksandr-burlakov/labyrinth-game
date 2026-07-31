import { DIRECTIONS, ITEM_TYPES, MAZE_HEIGHT, MAZE_WIDTH, ROOM_PHASES, TURN_TRANSITION_MS } from "./constants.js";
import { inBounds } from "./maze.js";

const DIRECTION_TO_ENTRANCE = Object.freeze({ up: "north", right: "east", down: "south", left: "west" });
const clone = (value) => structuredClone(value);
const key = ({ x, y }) => `${x},${y}`;
const wallKey = (x, y, side) => `${x},${y},${side}`;

function fail(code, message) { return { ok: false, code, message, events: [] }; }
function stateFor(room, playerId) { return room.match?.playerStates?.[playerId]; }
function otherPlayerId(room, playerId) { return room.players.find((player) => player.id !== playerId)?.id ?? null; }
function entranceAt(maze, position, side) { return maze.entrances.some((entrance) => entrance.x === position.x && entrance.y === position.y && entrance.side === side); }
function fogFor(room, playerId) { return room.fog[playerId] ??= { discoveredCells: [], revealedEdges: [] }; }
function revealCell(room, playerId, position) {
  const fog = fogFor(room, playerId);
  if (!fog.discoveredCells.some((cell) => cell.x === position.x && cell.y === position.y)) fog.discoveredCells.push(clone(position));
}
function revealEdge(room, playerId, position, side, blocked) {
  const fog = fogFor(room, playerId); const edgeKey = wallKey(position.x, position.y, side);
  const existing = fog.revealedEdges.find((edge) => wallKey(edge.x, edge.y, edge.side) === edgeKey);
  if (existing) existing.blocked = blocked;
  else fog.revealedEdges.push({ ...position, side, blocked });
}
function movementAllowance(playerState) { return 1 + playerState.movementBonus; }
function consumeItem(room, playerId, targetOwnerId, position, events) {
  const maze = room.mazes[targetOwnerId]; const index = maze.items.findIndex((item) => item.x === position.x && item.y === position.y);
  if (index === -1) return;
  const item = maze.items[index]; const playerState = stateFor(room, playerId);
  if (item.type === ITEM_TYPES.TREASURE && playerState.carriedTreasure) return;
  maze.items.splice(index, 1);
  if (item.type === ITEM_TYPES.TREASURE) playerState.carriedTreasure = true;
  if (item.type === ITEM_TYPES.WALKING_STICK) playerState.movementBonus++;
  if (item.type === ITEM_TYPES.CROSSBOW) stateFor(room, targetOwnerId).movementBonus++;
  if (item.type === ITEM_TYPES.PIRATE_GLASS) playerState.hasPirateGlass = true;
  if (item.type === ITEM_TYPES.BEAR_TRAP) playerState.skipTurns += 3;
  events.push({ type: "item_picked", playerId, itemType: item.type, position: clone(position), bonusOwnerId: item.type === ITEM_TYPES.CROSSBOW ? targetOwnerId : playerId });
}
function beginTurn(room, playerId, now, events, transitionMs = 0) {
  const playerState = stateFor(room, playerId);
  const availableAt = now + transitionMs;
  room.turn = { activePlayerId: playerId, turnNumber: (room.turn?.turnNumber ?? 0) + 1, movesRemaining: movementAllowance(playerState), availableAt, deadlineAt: room.turnTimerSeconds ? availableAt + room.turnTimerSeconds * 1000 : null };
  events.push({ type: "turn_started", playerId, turn: clone(room.turn) });
}
function advanceTurn(room, now, events) {
  let nextPlayerId = otherPlayerId(room, room.turn.activePlayerId);
  while (nextPlayerId) {
    const nextState = stateFor(room, nextPlayerId);
    if (nextState.skipTurns > 0) {
      nextState.skipTurns--;
      events.push({ type: "turn_skipped", playerId: nextPlayerId, remainingSkips: nextState.skipTurns });
      nextPlayerId = otherPlayerId(room, nextPlayerId);
      continue;
    }
    beginTurn(room, nextPlayerId, now, events, TURN_TRANSITION_MS);
    return;
  }
}
function finishAttempt(room, now, events) {
  room.turn.movesRemaining--;
  if (room.turn.movesRemaining <= 0 && room.phase === ROOM_PHASES.PLAYING) advanceTurn(room, now, events);
}

export function initializeMatch(room) {
  const next = clone(room);
  next.phase = ROOM_PHASES.STARTING;
  next.turn = null; next.result = null; next.fog = {};
  next.match = { playerStates: {} };
  for (const player of next.players) {
    const targetMazeOwnerId = otherPlayerId(next, player.id);
    next.match.playerStates[player.id] = { targetMazeOwnerId, position: null, carriedTreasure: false, extractedTreasures: 0, movementBonus: 0, skipTurns: 0, hasPirateGlass: false };
    next.fog[player.id] = { discoveredCells: [], revealedEdges: [] };
  }
  return next;
}

export function chooseStart(room, playerId, position, { now = Date.now(), random = Math.random } = {}) {
  if (room.phase !== ROOM_PHASES.STARTING) return fail("START_SELECTION_CLOSED", "Starting positions can no longer be selected.");
  if (!inBounds(position?.x, position?.y)) return fail("INVALID_START", "Starting position must be inside the maze.");
  const next = clone(room); const playerState = stateFor(next, playerId);
  if (!playerState) return fail("NOT_IN_ROOM", "Player is not part of this match.");
  if (playerState.position) return fail("START_ALREADY_SELECTED", "Starting position was already selected.");
  const events = []; playerState.position = { x: position.x, y: position.y }; revealCell(next, playerId, playerState.position);
  consumeItem(next, playerId, playerState.targetMazeOwnerId, playerState.position, events);
  events.push({ type: "start_selected", playerId, position: clone(playerState.position) });
  if (next.players.every((player) => stateFor(next, player.id).position)) {
    next.phase = ROOM_PHASES.PLAYING;
    const firstPlayer = next.players[Math.floor(random() * next.players.length)].id;
    beginTurn(next, firstPlayer, now, events);
  }
  return { ok: true, room: next, events };
}

export function move(room, playerId, directionName, { now = Date.now() } = {}) {
  if (room.phase !== ROOM_PHASES.PLAYING) return fail("MATCH_NOT_PLAYING", "The match is not currently accepting moves.");
  if (room.turn?.activePlayerId !== playerId) return fail("NOT_YOUR_TURN", "It is not your turn.");
  if (room.turn?.availableAt && now < room.turn.availableAt) return fail("TURN_NOT_READY", "Wait for the previous move to finish.");
  const direction = DIRECTIONS[directionName]; if (!direction) return fail("INVALID_DIRECTION", "Direction must be up, right, down, or left.");
  const next = clone(room); const events = []; const playerState = stateFor(next, playerId); const maze = next.mazes[playerState.targetMazeOwnerId]; const position = playerState.position;
  const side = DIRECTION_TO_ENTRANCE[directionName]; const blockedByWall = Boolean(maze.cells[position.y][position.x] & direction.wall);
  const target = { x: position.x + direction.dx, y: position.y + direction.dy };
  if (blockedByWall || !inBounds(target.x, target.y)) {
    revealEdge(next, playerId, position, side, true);
    events.push({ type: "move_blocked", playerId, direction: directionName, position: clone(position) });
    finishAttempt(next, now, events);
    return { ok: true, room: next, events };
  }
  revealEdge(next, playerId, position, side, false); playerState.position = target; revealCell(next, playerId, target);
  events.push({ type: "move_succeeded", playerId, direction: directionName, position: clone(target) });
  consumeItem(next, playerId, playerState.targetMazeOwnerId, target, events);
  if (playerState.hasPirateGlass) {
    const forward = { x: target.x + direction.dx, y: target.y + direction.dy };
    const blockedAhead = Boolean(maze.cells[target.y][target.x] & direction.wall);
    revealEdge(next, playerId, target, side, blockedAhead);
    if (!blockedAhead && inBounds(forward.x, forward.y)) revealCell(next, playerId, forward);
  }
  finishAttempt(next, now, events);
  return { ok: true, room: next, events };
}

export function extractTreasure(room, playerId, directionName, { now = Date.now() } = {}) {
  if (room.phase !== ROOM_PHASES.PLAYING) return fail("MATCH_NOT_PLAYING", "The match is not currently accepting moves.");
  if (room.turn?.activePlayerId !== playerId) return fail("NOT_YOUR_TURN", "It is not your turn.");
  if (room.turn?.availableAt && now < room.turn.availableAt) return fail("TURN_NOT_READY", "Wait for the previous move to finish.");
  const direction = DIRECTIONS[directionName]; if (!direction) return fail("INVALID_DIRECTION", "Direction must be up, right, down, or left.");
  const next = clone(room); const events = []; const playerState = stateFor(next, playerId); const maze = next.mazes[playerState.targetMazeOwnerId]; const side = DIRECTION_TO_ENTRANCE[directionName];
  const target = { x: playerState.position.x + direction.dx, y: playerState.position.y + direction.dy };
  if (inBounds(target.x, target.y) || !entranceAt(maze, playerState.position, side)) return move(room, playerId, directionName, { now });
  if (!playerState.carriedTreasure) {
    revealEdge(next, playerId, playerState.position, side, false); events.push({ type: "move_blocked", playerId, direction: directionName, position: clone(playerState.position) }); finishAttempt(next, now, events);
    return { ok: true, room: next, events };
  }
  revealEdge(next, playerId, playerState.position, side, false); playerState.carriedTreasure = false; playerState.extractedTreasures++;
  events.push({ type: "treasure_extracted", playerId, position: clone(playerState.position), extractedTreasures: playerState.extractedTreasures });
  if (playerState.extractedTreasures >= 4) {
    next.phase = ROOM_PHASES.FINISHED; next.result = { winnerId: playerId, reason: "four_treasures_extracted" }; next.turn = null; events.push({ type: "match_finished", winnerId: playerId, reason: next.result.reason });
  } else finishAttempt(next, now, events);
  return { ok: true, room: next, events };
}

export function applyMove(room, playerId, directionName, options) {
  const playerState = stateFor(room, playerId); const direction = DIRECTIONS[directionName];
  if (playerState?.position && direction) {
    const target = { x: playerState.position.x + direction.dx, y: playerState.position.y + direction.dy };
    if (!inBounds(target.x, target.y)) return extractTreasure(room, playerId, directionName, options);
  }
  return move(room, playerId, directionName, options);
}

export function expireTurn(room, { now = Date.now() } = {}) {
  if (room.phase !== ROOM_PHASES.PLAYING || !room.turn?.deadlineAt || now < room.turn.deadlineAt) return fail("TURN_NOT_EXPIRED", "The active turn has not expired.");
  const next = clone(room); const events = [{ type: "turn_expired", playerId: next.turn.activePlayerId }]; advanceTurn(next, now, events);
  return { ok: true, room: next, events };
}
