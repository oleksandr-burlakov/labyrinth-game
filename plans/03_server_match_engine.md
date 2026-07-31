# Server Match Engine

## Purpose

Move the actual game rules to the server so turns, movement, items, scoring, and victory are authoritative.

## Scope

- Randomly choose the first player after setup.
- Alternate turns globally.
- Apply one move attempt per turn.
- End the turn after a wall hit.
- Apply item effects.
- Track treasure extraction.
- Track trap penalties and movement bonuses.
- End the match when a player extracts four treasures.

## Rule model

- Player state should include current position, carried treasure, extracted count, active penalties, and persistent bonuses.
- Maze state should include walls, entrances, items, discovered fog, and ownership.
- Turn state should include active player, timer settings, and whether the turn is in progress.

## Item behavior

- Walking stick: the finder can move one extra cell per turn.
- Crossbow: the maze creator gains the extra movement bonus when the opponent finds it.
- Pirate glass: the finder sees the next cell in the chosen direction.
- Bear trap: the finder skips their next three turns.

## Deliverables

- A deterministic match engine module.
- Server events for valid moves, invalid moves, turn changes, item pickups, timer expiration, and match end.
- Tests for wall collisions, treasure extraction, item effects, trap skipping, and win conditions.

## Exit criteria

- Given the same room state and move input, the server always produces the same next state.
- No client can advance the match state without server approval.
