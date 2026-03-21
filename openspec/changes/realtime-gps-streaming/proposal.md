## Why

Polling the REST API for truck positions every second wastes bandwidth and adds latency. A WebSocket connection allows the server to push GPS position updates to all connected globe clients in real time as they arrive, enabling smooth truck animation on the map. This also lets the server broadcast stale/lost status transitions immediately rather than requiring clients to re-poll.

## What Changes

- Add a **WebSocket endpoint** (`GET /api/v1/vehicles/stream`) that upgrades to a WebSocket connection with JWT authentication via query parameter.
- Implement a **server-side hub** (single goroutine) that manages client connections and broadcasts GPS position updates, stale/lost status transitions, and heartbeat pings.
- Wire the GPS ping ingestion handler (from `truck-gps-data-model`) to publish to the hub on each new ping.
- Create a **client-side `GpsStreamService`** in the Globify app with exponential backoff reconnection, event emitter pattern, and position interpolation helper.
- Provide a **React hook** `useVehiclePositions()` that returns a live `Map<vehicleId, VehiclePosition>` updated via the WebSocket stream.

## Capabilities

### New Capabilities
- `websocket-gps-hub`: Server-side WebSocket hub for broadcasting vehicle position updates and status transitions to connected clients.
- `gps-stream-client`: Client-side WebSocket service with reconnection, event emitter, position interpolation, and React hook for live vehicle positions.

### Modified Capabilities

_(none — no existing spec-level requirements change)_

## Impact

- **New Go dependency:** `gorilla/websocket` added to `services/supply-chain-api/go.mod`.
- **New server files:** `services/supply-chain-api/internal/api/websocket.go` (hub + handler).
- **Modified server files:** `router.go` (register WS route), `handlers.go` (publish to hub on GPS ping ingestion).
- **New client files:** `apps/Globify/src/services/gpsStreamService.ts`, `apps/Globify/src/services/useVehiclePositions.ts`.
- **Deployment constraint:** WebSocket requires long-lived connections — compatible with App Runner (lite/full profiles) but **not** Lambda (ultra-lite profile).
