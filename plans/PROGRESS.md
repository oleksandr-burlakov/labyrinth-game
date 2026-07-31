# Labyrinth Game Implementation Progress

Use this file as the current roadmap checklist. Mark an item with `[x]` when its acceptance criteria are complete. Keep detailed implementation notes and task breakdowns in the linked subplans.

## Overall phases

- [x] Phase 0 — Project review and implementation roadmap ([00_project_overview.md](./00_project_overview.md))
- [x] Phase 1 — Foundation and shared models ([01_foundation_and_shared_models.md](./01_foundation_and_shared_models.md))
- [~] Phase 2 — Room and setup flow ([02_room_and_setup_flow.md](./02_room_and_setup_flow.md))
- [x] Phase 3 — Authoritative server match engine ([03_server_match_engine.md](./03_server_match_engine.md))
- [~] Phase 4 — Client rendering and interaction ([04_client_rendering_and_interaction.md](./04_client_rendering_and_interaction.md))
- [ ] Phase 5 — Reconnect, deployment, and quality ([05_reconnect_deployment_and_quality.md](./05_reconnect_deployment_and_quality.md))

## Phase 1 checklist

- [x] Add shared npm workspace
- [x] Define shared constants and JSDoc models
- [x] Add maze and item validation helpers
- [x] Add recipient-specific snapshot projection
- [x] Define protocol version and Socket.IO event constants
- [x] Convert server to ESM
- [x] Align client room events with the shared contract
- [x] Add Vitest validation coverage
- [x] Verify tests and client production build

## Phase 2 implementation checklist

- [x] Generate six-character room codes
- [x] Add host timer selection to room creation
- [x] Add room join-by-code flow
- [x] Add setup phase and dedicated setup scene
- [x] Generate valid mazes with four border entrances
- [x] Submit and validate private maze data server-side
- [x] Start match boundary after both valid submissions
- [ ] Add full two-minute reconnect retention and recovery
- [ ] Add end-to-end room/setup integration tests

## Phase 3 implementation checklist

- [x] Add deterministic authoritative match engine
- [x] Add private start selection and opponent-maze assignment
- [x] Validate moves, turns, extraction, item effects, and victory server-side
- [x] Add recipient-safe fog and match-state projections
- [x] Add turn expiry and five-second warning handling
- [x] Add engine coverage for movement, items, fog, timers, and winning

## How to use

## Phase 4 implementation checklist

- [x] Render authoritative explorer and authored-maze observer perspectives
- [x] Render exact fog edges, entrances, items, player state, scores, and timer
- [x] Add keyboard and touch movement controls with pending-input protection
- [x] Add activity feedback, match result, and connection overlays
- [x] Make menu, setup, and match scenes responsive for mobile portrait
- [x] Add client view-model coverage and verify production build
- [ ] Manually verify a synchronized two-client match on desktop and mobile portrait

When starting a phase, update its phase checkbox to `[~]` and add a short note below the phase checklist. Use `[x]` only when the phase exit criteria in its subplan are met. If a phase becomes large, split its work into a new numbered plan and link it here.
