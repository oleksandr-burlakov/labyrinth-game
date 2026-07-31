import { PROTOCOL_VERSION } from "./constants.js";

export const EVENTS = Object.freeze({
  CREATE_ROOM: "room:create", JOIN_ROOM: "room:join", ROOM_SNAPSHOT: "room:snapshot", ERROR: "game:error",
  SUBMIT_MAZE: "setup:submit_maze", START_MATCH: "match:start", CHOOSE_START: "match:choose_start", MOVE: "match:move", STATE: "match:state", MATCH_EVENT: "match:event", TURN_WARNING: "match:turn_warning", FINISHED: "match:finished",
});

export function envelope(payload = {}) { return { protocolVersion: PROTOCOL_VERSION, ...payload }; }

export function validateEnvelope(payload) {
  return Boolean(payload && payload.protocolVersion === PROTOCOL_VERSION);
}
