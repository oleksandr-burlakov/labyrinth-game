# Foundation and Shared Models

## Purpose

Stabilize the current prototype so the client and server agree on the same maze, turn, item, and room data.

## Problems in the current prototype

- Client and server do not share a single authoritative match state.
- The client generates and moves through a local maze that is not synchronized.
- Event names between server and client are inconsistent.
- Scene startup is fragile.
- Maze rendering depends on values that are not initialized consistently.
- Fog state is only partially modeled.

## Deliverables

- Shared serializable types for:
  - room
  - player
  - maze cell and wall data
  - entrances
  - item placement
  - turn state
  - fog discovery
  - match result
- A documented Socket.IO event contract.
- Server-side validation helpers for maze shape and wall symmetry.
- Basic tests for maze validity and shared data conversion.

## Design rules

- The server is the source of truth.
- Clients send intent, not final outcomes.
- All game state that matters for rules must be serializable.
- A single maze representation must work for setup, play, reconnection, and debugging.

## Open implementation questions

- Should shared models live in a dedicated package or inside the server folder for now?
- Should the wire protocol be versioned from the start?
- Should the client receive full hidden maze state during setup or only a limited preview?

## Exit criteria

- A room can be described, serialized, validated, and reloaded without losing meaning.
- The client and server can exchange a room snapshot without ad hoc field names.
