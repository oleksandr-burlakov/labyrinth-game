export const PROTOCOL_VERSION = 2;
export const MAZE_WIDTH = 10;
export const MAZE_HEIGHT = 10;
export const WALLS = Object.freeze({ NORTH: 1, EAST: 2, SOUTH: 4, WEST: 8 });
export const ITEM_TYPES = Object.freeze({
  TREASURE: "treasure",
  WALKING_STICK: "walking_stick",
  CROSSBOW: "crossbow",
  PIRATE_GLASS: "pirate_glass",
  BEAR_TRAP: "bear_trap",
});
export const ITEM_QUOTAS = Object.freeze({
  treasure: 4,
  walking_stick: 1,
  crossbow: 1,
  pirate_glass: 1,
  bear_trap: 1,
});
export const ROOM_PHASES = Object.freeze({ WAITING: "waiting", SETUP: "setup", STARTING: "starting", PLAYING: "playing", FINISHED: "finished" });
export const DIRECTIONS = Object.freeze({
  up: { dx: 0, dy: -1, wall: WALLS.NORTH, opposite: WALLS.SOUTH },
  right: { dx: 1, dy: 0, wall: WALLS.EAST, opposite: WALLS.WEST },
  down: { dx: 0, dy: 1, wall: WALLS.SOUTH, opposite: WALLS.NORTH },
  left: { dx: -1, dy: 0, wall: WALLS.WEST, opposite: WALLS.EAST },
});
