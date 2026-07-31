import { ROOM_PHASES } from "./constants.js";

/** @typedef {{ x: number, y: number }} Coordinate */
/** @typedef {{ type: string, x: number, y: number }} ItemPlacement */
/** @typedef {{ width: number, height: number, cells: number[][], entrances: Coordinate[], items: ItemPlacement[] }} Maze */
/** @typedef {{ id: string, name: string, connected: boolean }} Player */
/** @typedef {{ activePlayerId: string, turnNumber: number, movesRemaining: number, availableAt: number, deadlineAt: number|null }} TurnState */
/** @typedef {{ discoveredCells: Coordinate[], revealedEdges: Array<Coordinate & {side: string, blocked: boolean}> }} FogState */
/** @typedef {{ winnerId: string|null, reason: string }} MatchResult */
/** @typedef {{ name: string, difficulty: "easy"|"normal"|"hard", phase: string, players: Player[], mazes: Record<string, Maze>, turn: TurnState|null, fog: Record<string, FogState>, result: MatchResult|null }} Room */

export function createRoom(name, player, difficulty = "normal") {
  return { code: name, difficulty, phase: ROOM_PHASES.WAITING, hostPlayerId: player.id, turnTimerSeconds: null, players: [player], setups: {}, mazes: {}, turn: null, fog: {}, match: null, result: null };
}

/** Return only the state that is safe for one recipient to receive. */
export function projectRoom(room, recipientId, phase = room.phase) {
  const ownMaze = room.mazes?.[recipientId];
  const projected = { ...room, phase, players: room.players.map((player) => ({ ...player })), mazes: {}, fog: {} };
  delete projected.match;
  if (ownMaze) projected.mazes[recipientId] = structuredClone(ownMaze);
  if (room.fog?.[recipientId]) projected.fog[recipientId] = structuredClone(room.fog[recipientId]);
  if (room.match) {
    // The recipient may observe the complete maze they authored, never the maze they explore.
    projected.mazes = ownMaze ? { [recipientId]: structuredClone(ownMaze) } : {};
    const ownState = room.match.playerStates[recipientId];
    const opponent = room.players.find((player) => player.id !== recipientId);
    const opponentState = opponent ? room.match.playerStates[opponent.id] : null;
    projected.match = {
      player: ownState ? structuredClone(ownState) : null,
      opponent: opponentState ? structuredClone(opponentState) : null,
      startsSelected: Boolean(ownState?.position),
      scores: room.players.map((player) => ({ id: player.id, name: player.name, extractedTreasures: room.match.playerStates[player.id]?.extractedTreasures ?? 0 })),
      visibleItems: ownState ? (room.mazes[ownState.targetMazeOwnerId]?.items ?? []).filter((item) => room.fog?.[recipientId]?.discoveredCells?.some((cell) => cell.x === item.x && cell.y === item.y)).map((item) => ({ ...item })) : [],
    };
  }
  return projected;
}
