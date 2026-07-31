# Labyrinth Game Plans

Current progress is tracked in [PROGRESS.md](./PROGRESS.md).

This folder splits the project into independent subplans so each part can be developed and reviewed on its own.

## Current roadmap

1. `00_project_overview.md` - product scope, rules, assumptions, and open questions.
2. `01_foundation_and_shared_models.md` - shared data model, protocol, and prototype cleanup.
3. `02_room_and_setup_flow.md` - room lifecycle, two-maze setup, and server validation.
4. `03_server_match_engine.md` - authoritative turn handling, items, fog, scoring, and victory.
5. `04_client_rendering_and_interaction.md` - Phaser UI, movement, fog of war, and feedback.
6. `05_reconnect_deployment_and_quality.md` - reconnect grace, deployment, logging, and tests.

## Working rule

Each file should stay focused on one layer of the game. When a subplan grows too large, split it into smaller files instead of expanding the parent indefinitely.
