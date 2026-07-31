import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { DEFAULT_DIFFICULTY, EVENTS, isDifficulty, ROOM_PHASES, applyMove, chooseStart, envelope, expireTurn, initializeMatch, projectRoom, validateSetupSubmission } from "@labyrinth/shared";

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
const activeGames = new Map();
const turnTimers = new Map();
const playerRoomCodes = new Map();
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function validText(value, max = 32) { return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max; }
function error(socket, message, code = "INVALID_REQUEST", details = []) { socket.emit(EVENTS.ERROR, envelope({ code, message, details })); }
function findRoomByPlayerId(playerId) {
  const room = activeGames.get(playerRoomCodes.get(playerId));
  if (room?.players.some((player) => player.id === playerId)) return room;
  const fallback = [...activeGames.values()].find((candidate) => candidate.players.some((player) => player.id === playerId));
  if (fallback) playerRoomCodes.set(playerId, fallback.code);
  return fallback;
}
function generateRoomCode() {
  let code;
  do code = Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join(""); while (activeGames.has(code));
  return code;
}
function clearTurnTimers(roomCode) {
  const timers = turnTimers.get(roomCode);
  if (timers) { clearTimeout(timers.warning); clearTimeout(timers.expiry); turnTimers.delete(roomCode); }
}
function emitSnapshot(room, events = []) {
  for (const player of room.players) {
    const projected = projectRoom(room, player.id);
    const serverNow = Date.now();
    io.to(player.id).emit(EVENTS.ROOM_SNAPSHOT, envelope({ room: projected, serverNow }));
    if (room.match) io.to(player.id).emit(EVENTS.STATE, envelope({ room: projected, events, serverNow }));
  }
}
function scheduleTurn(room) {
  clearTurnTimers(room.code);
  if (room.phase !== ROOM_PHASES.PLAYING || !room.turn?.deadlineAt) return;
  const activePlayerId = room.turn.activePlayerId; const deadlineAt = room.turn.deadlineAt; const delay = Math.max(0, deadlineAt - Date.now());
  const warning = setTimeout(() => {
    const current = activeGames.get(room.code);
    if (current?.turn?.activePlayerId === activePlayerId && current.turn.deadlineAt === deadlineAt) io.to(activePlayerId).emit(EVENTS.TURN_WARNING, envelope({ secondsRemaining: 5 }));
  }, Math.max(0, delay - 5000));
  const expiry = setTimeout(() => {
    const current = activeGames.get(room.code);
    if (!current || current.turn?.activePlayerId !== activePlayerId || current.turn.deadlineAt !== deadlineAt) return;
    const result = expireTurn(current, { now: Date.now() });
    if (!result.ok) return;
    activeGames.set(current.code, result.room); emitSnapshot(result.room, result.events); scheduleTurn(result.room);
  }, delay + 5);
  turnTimers.set(room.code, { warning, expiry });
}
function applyResult(socket, room, result) {
  if (!result.ok) return error(socket, result.message, result.code);
  activeGames.set(room.code, result.room); emitSnapshot(result.room, result.events);
  if (result.room.phase === ROOM_PHASES.FINISHED) {
    clearTurnTimers(result.room.code);
    for (const player of result.room.players) io.to(player.id).emit(EVENTS.FINISHED, envelope({ result: result.room.result }));
  } else scheduleTurn(result.room);
}

io.on("connection", (socket) => {
  socket.on(EVENTS.CREATE_ROOM, (payload = {}) => {
    const userName = payload.userName?.trim(); const timer = payload.turnTimerSeconds; const difficulty = payload.difficulty ?? DEFAULT_DIFFICULTY;
    if (!validText(userName)) return error(socket, "Nickname is required.");
    if (!(timer === null || timer === undefined || (Number.isInteger(timer) && timer >= 10 && timer <= 120))) return error(socket, "Timer must be disabled or between 10 and 120 seconds.");
    if (!isDifficulty(difficulty)) return error(socket, "Difficulty must be easy, normal, or hard.");
    const code = generateRoomCode(); const player = { id: socket.id, name: userName, connected: true, submitted: false };
    const room = { code, difficulty, phase: ROOM_PHASES.WAITING, hostPlayerId: player.id, turnTimerSeconds: timer ?? null, players: [player], setups: {}, mazes: {}, turn: null, fog: {}, match: null, result: null };
    activeGames.set(code, room); playerRoomCodes.set(socket.id, code); socket.join(code); emitSnapshot(room);
  });

  socket.on(EVENTS.JOIN_ROOM, (payload = {}) => {
    const roomCode = payload.roomCode?.trim().toUpperCase(); const userName = payload.userName?.trim(); const room = activeGames.get(roomCode);
    if (!validText(userName) || !/^[A-Z2-9]{6}$/.test(roomCode ?? "")) return error(socket, "Nickname and a valid six-character room code are required.");
    if (!room) return error(socket, "Room does not exist.", "ROOM_NOT_FOUND");
    if (room.players.length >= 2) return error(socket, "Room is full.", "ROOM_FULL");
    room.players.push({ id: socket.id, name: userName, connected: true, submitted: false }); room.phase = ROOM_PHASES.SETUP; playerRoomCodes.set(socket.id, roomCode);
    socket.join(roomCode); emitSnapshot(room);
  });

  socket.on(EVENTS.SUBMIT_MAZE, (payload = {}) => {
    const room = findRoomByPlayerId(socket.id);
    if (!room || room.phase !== ROOM_PHASES.SETUP) return error(socket, "Maze setup is not currently open.", "SETUP_CLOSED");
    const player = room.players.find((candidate) => candidate.id === socket.id); const { maze } = payload;
    if (!maze || !Array.isArray(maze.cells) || !Array.isArray(maze.entrances) || !Array.isArray(maze.items)) return error(socket, "Setup submission must include maze cells, entrances, and items.", "INVALID_SETUP_PAYLOAD");
    const result = validateSetupSubmission(maze.cells, maze.entrances, maze.items, { difficulty: room.difficulty });
    if (!result.valid) return error(socket, "Maze setup is invalid.", "INVALID_MAZE", result.errors);
    room.mazes[player.id] = { width: 10, height: 10, cells: maze.cells, entrances: maze.entrances, items: maze.items };
    room.setups[player.id] = { submitted: true, submittedAt: Date.now() }; player.submitted = true;
    if (room.players.length === 2 && room.players.every((candidate) => candidate.submitted)) {
      const matchRoom = initializeMatch(room); activeGames.set(matchRoom.code, matchRoom); emitSnapshot(matchRoom);
      for (const participant of matchRoom.players) io.to(participant.id).emit(EVENTS.START_MATCH, envelope({ room: projectRoom(matchRoom, participant.id) }));
      return;
    }
    emitSnapshot(room);
  });

  socket.on(EVENTS.CHOOSE_START, (payload = {}) => {
    const room = findRoomByPlayerId(socket.id);
    if (!room) return error(socket, "Room does not exist.", "ROOM_NOT_FOUND");
    applyResult(socket, room, chooseStart(room, socket.id, payload.position));
  });

  socket.on(EVENTS.MOVE, (payload = {}) => {
    const room = findRoomByPlayerId(socket.id);
    if (!room) return error(socket, "Room does not exist.", "ROOM_NOT_FOUND");
    applyResult(socket, room, applyMove(room, socket.id, payload.direction));
  });

  socket.on("disconnect", () => {
    const room = findRoomByPlayerId(socket.id);
    if (room) { const player = room.players.find((candidate) => candidate.id === socket.id); player.connected = false; player.disconnectedAt = Date.now(); emitSnapshot(room); } playerRoomCodes.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

export { activeGames, app, io, generateRoomCode, playerRoomCodes };
