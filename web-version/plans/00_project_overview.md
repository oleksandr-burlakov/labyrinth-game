# Project Overview

## Goal

Build a two-player web labyrinth game where each player creates a maze for the opponent, then both race through hidden information to extract four treasures first.

## Confirmed game decisions

- Each player builds a separate maze for the other player.
- Maze setup is generate-then-edit.
- The server validates that the submitted maze is solvable.
- Every inner cell must be reachable.
- Each maze has four treasures.
- Each maze can have at most one walking stick, one crossbow, one pirate glass, and one bear trap.
- The first player is chosen randomly by the server after both mazes are ready.
- Turns alternate globally after the first player is selected.
- The host can configure a turn timer from 10 to 120 seconds, or disable it.
- Nicknames are per room only.
- Match state lives in memory while the server process stays alive.
- Reconnect is allowed during a grace period.

## Core rules to preserve in implementation

- A turn ends after one move attempt or after a wall hit.
- Treasures can be extracted through any border entrance.
- Walking stick grants +1 movement range to the finder.
- Crossbow grants +1 movement range to the creator of the maze once it is found.
- Pirate glass reveals the next cell in the movement direction.
- Bear trap makes the trapped player skip three rounds.

## What still needs to be specified

- Exact reconnect grace duration.
- Exact room lifecycle when one player disconnects before the match starts.
- How to represent and reveal fog-of-war data in the shared protocol.
- Whether mazes can be previewed by the creator before the match starts.
- Whether rematches should reuse the room or create a new one.
- Whether spectators, chat, accounts, history, or leaderboards are in scope for v1.

## Suggested development split

Start with the data model and protocol, then room/setup flow, then the server match engine, then the client presentation, then reconnect/deployment polish.
