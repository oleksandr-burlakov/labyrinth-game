# Room and Setup Flow

## Purpose

Implement the flow from entering a room to submitting both mazes and starting the match.

## Scope

- Create and join room flow.
- Nickname validation.
- Waiting state while a second player joins.
- Separate setup for each player.
- Maze generation and editing.
- Server-side setup validation.

## Setup rules to implement

- Each player creates the maze the opponent will play in.
- Each setup must start from a valid generated maze.
- The builder can edit a limited set of walls and entrances.
- The builder can place all allowed items in their maze.
- The submitted maze must remain private until play starts.

## Validation checklist

- Maze dimensions are correct.
- Border entrances are valid.
- Adjacent wall data matches between neighboring cells.
- All inner cells are reachable.
- The maze remains solvable after edits.
- Exactly four treasures exist.
- Item quotas are respected.
- No illegal overlaps exist.

## Deliverables

- Room create/join endpoints or socket events.
- Setup scene or setup mode in the client.
- Server validation errors with clear messages.
- Start-match transition once both submissions are accepted.

## Risks

- Players may submit invalid wall edits that create unreachable areas.
- The setup UI can become too large if generation, editing, and placement are not separated cleanly.
- The server must reject malformed payloads without crashing.

## Exit criteria

- Two players can join a room, each submit one maze, and the match can start reliably.
