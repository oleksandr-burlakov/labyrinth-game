export function perspectiveFor(room, localPlayerId) {
  return room?.phase === "playing" && room.turn?.activePlayerId !== localPlayerId ? "observer" : "explorer";
}

/** True only when this exact cell edge faces outside the 10×10 maze. */
export function isOuterMazeEdge(x, y, side, width = 10, height = 10) {
  return (side === "north" && y === 0)
    || (side === "east" && x === width - 1)
    || (side === "south" && y === height - 1)
    || (side === "west" && x === 0);
}

export function canSendMove(room, localPlayerId, connected, pending, now = Date.now()) {
  return Boolean(connected && !pending && room?.phase === "playing" && room.turn?.activePlayerId === localPlayerId && room.turn.movesRemaining > 0 && (!room.turn.availableAt || now >= room.turn.availableAt));
}

export function secondsRemaining(deadlineAt, now = Date.now()) {
  return deadlineAt ? Math.max(0, Math.ceil((deadlineAt - now) / 1000)) : null;
}

export function eventText(event, players = []) {
  const name = players.find((player) => player.id === event.playerId)?.name ?? "Player";
  if (event.type === "move_succeeded") return `${name} moved ${event.direction}.`;
  if (event.type === "move_blocked") return `${name} could not move ${event.direction}.`;
  if (event.type === "item_picked") return `${name} found ${event.itemType.replaceAll("_", " ")}.`;
  if (event.type === "treasure_extracted") return `${name} extracted treasure ${event.extractedTreasures}/4.`;
  if (event.type === "turn_skipped") return `${name} skips a turn (${event.remainingSkips} trap turns remain).`;
  if (event.type === "turn_expired") return `${name}'s turn expired.`;
  if (event.type === "turn_started") return `${name}'s turn.`;
  if (event.type === "start_selected") return `${name} selected a start.`;
  if (event.type === "match_finished") return `${name} won the match!`;
  return event.type.replaceAll("_", " ");
}
