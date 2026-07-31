# Client Rendering and Interaction

## Purpose

Turn the current Phaser prototype into a real multiplayer client that renders server state and sends player intent.

## Scope

- Render the assigned maze from server data.
- Show the local player, turn owner, score, and timer.
- Apply fog-of-war correctly.
- Hide undiscovered information.
- Send move attempts to the server.
- Show errors and rule feedback.

## UI requirements

- The client must clearly show whether it is the local player’s turn.
- Movement input must be disabled when it is not allowed.
- Wall collisions must be visible immediately.
- Item pickups must be obvious and readable.
- Timer expiry and reconnection must be shown without ambiguity.

## Fog rules

- Visited cell interiors remain visible.
- Undiscovered cells stay hidden.
- A wall becomes visible when it is revealed by interaction or an item rule.
- The client must not infer hidden maze details from local generation.

## Deliverables

- Updated scene flow.
- Snapshot rendering from server state.
- Movement controls wired to server actions.
- Minimal on-screen status UI.

## Exit criteria

- Two clients can connect to the same match and see the same authoritative progress.
