# Reconnect, Deployment, and Quality

## Purpose

Finish the product with safe reconnect handling, basic deployment support, and a test baseline.

## Scope

- Reconnect grace period.
- Room recovery while the server process is still alive.
- Forfeit handling after grace expiry.
- Environment-based client/server configuration.
- CORS and production setup.
- Logging for room and match lifecycle.
- Test and release checklist.

## Reconnect rules

- A disconnected player should retain their slot for a limited grace period.
- Reconnection should restore the same room and match state.
- If the grace period expires, the opponent should be able to continue or receive a forfeit win depending on match state.

## Deployment checklist

- Development start command for both server and client.
- Production client URL configuration.
- Server health endpoint.
- Explicit allowed origins for deployed clients.

## Quality checklist

- Room creation and join tests.
- Setup validation tests.
- Match engine tests.
- Browser multiplayer smoke tests.
- Mobile viewport sanity check.

## Exit criteria

- A player can disconnect and return without losing the match, as long as the grace period has not expired.
- The project can be started and verified with a repeatable process.
