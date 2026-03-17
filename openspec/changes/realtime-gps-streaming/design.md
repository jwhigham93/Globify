## Context

The `truck-gps-data-model` change adds REST endpoints for GPS ping ingestion and vehicle data retrieval. The frontend currently has no mechanism to receive live updates — it would need to poll `GET /vehicles/positions` repeatedly. The supply chain API is a Go service using chi router, running on App Runner (lite profile) or EKS (full profile).

The Globify app is a React Native / Expo app using React Three Fiber for 3D rendering. It already fetches data from the API at mount time and updates state via React hooks.

## Goals / Non-Goals

**Goals:**
- Push GPS position updates to connected globe clients in real time (< 500 ms from ping ingestion to client receipt).
- Support multiple simultaneous clients with a single hub goroutine (fan-out broadcast pattern).
- Provide a robust client-side service with exponential backoff reconnection and clean event emitter API.
- Provide a React hook that the globe visualization can consume directly.
- Handle stale/lost status transitions as server-pushed events.

**Non-Goals:**
- Client-to-server messages beyond WebSocket ping/pong (no vehicle control or command channel).
- Per-vehicle subscriptions or topic filtering (all connected clients receive all updates — the fleet is small enough).
- Supporting the ultra-lite (Lambda) deployment profile for WebSocket.
- Offline queueing of GPS positions on the client.

## Decisions

### 1. Protocol — WebSocket over SSE

**Choice:** Use WebSocket (`gorilla/websocket`) for bidirectional communication.

**Rationale:** WebSocket supports native ping/pong heartbeat frames, which lets us detect dead connections. SSE is server-push only and requires a separate mechanism for connection health. WebSocket is also more natural for future extensions (e.g., client subscribing to specific vehicles).

**Alternatives considered:**
- SSE (Server-Sent Events): Simpler server-side, but no heartbeat and no future client→server capability.
- gRPC streaming: Too heavy for a browser/React Native client without a proxy.

### 2. Authentication — JWT via query parameter

**Choice:** The WebSocket endpoint accepts a `token` query parameter (`/api/v1/vehicles/stream?token=<jwt>`). The server validates the JWT before completing the upgrade.

**Rationale:** The browser `WebSocket` API does not support custom headers. The standard workaround is passing the token as a query parameter. The token is validated once during the upgrade handshake, not on every message.

**Alternatives considered:**
- Cookie-based auth: Adds CSRF complexity and doesn't work well with Cognito tokens.
- First-message auth: Allows unauthenticated connections to briefly exist before validation.

### 3. Hub Architecture — Single goroutine with channel-based fan-out

**Choice:** A `Hub` struct with:
- `clients` map (conn → bool) protected by the hub's select loop
- `broadcast` channel receiving `BroadcastMessage` from the GPS ingestion handler
- `register` / `unregister` channels for client lifecycle
- Single goroutine runs a `select` loop processing all three channels

Each client has a dedicated write goroutine reading from a buffered `send` channel. If the send channel is full (slow client), the client is disconnected.

**Rationale:** This is the canonical Go WebSocket hub pattern (used by the gorilla/websocket chat example). It avoids mutex contention and handles all concurrency via channels.

### 4. Message Format — JSON with type discriminator

**Choice:** All messages are JSON with a `type` field:
- `{ type: "position_update", vehicleId, lat, lng, heading, speedMph, recordedAt, gpsStatus }`
- `{ type: "status_change", vehicleId, previousStatus, newStatus, lastPingAt }`
- `{ type: "heartbeat" }` (server → client, every 30s)

**Rationale:** JSON is universally supported by all WebSocket clients. The `type` discriminator allows the client to dispatch events to appropriate handlers. Binary protocols (protobuf) would save bandwidth but add serialization complexity for a low-throughput stream (~20 vehicles × 1 ping/30s = ~40 messages/min).

### 5. Client Reconnection — Exponential backoff with jitter

**Choice:** The `GpsStreamService` reconnects on disconnection with delays: 1s, 2s, 4s, 8s, 16s, 30s (max). Each delay has ±20% jitter to prevent thundering herd. Reconnect resets to 1s after a successful connection that lasts > 30s.

**Rationale:** Standard exponential backoff prevents server overload during outages while recovering quickly from transient network drops.

### 6. Initial Load Strategy — REST then WebSocket

**Choice:** On mount, the client:
1. Calls `GET /vehicles/positions` for current state of all vehicles.
2. Opens WebSocket for live deltas.
3. Applies WebSocket updates on top of the REST snapshot.

This avoids missing updates during the WebSocket connection setup.

**Rationale:** The REST endpoint provides a consistent snapshot. WebSocket only carries deltas. Without the initial REST load, the client would see no vehicles until each truck's next GPS ping arrives.

## Risks / Trade-offs

- **[Lambda incompatibility]** → WebSocket requires long-lived connections. Lambda Function URLs have a 15-minute timeout and don't support connection upgrades. Mitigation: document that real-time truck tracking requires lite or full deployment profile. The REST polling fallback from `truck-gps-data-model` remains available.
- **[Connection limit]** → App Runner has a 500 concurrent connection limit per instance. Mitigation: each globe client uses one connection. With <100 expected users, this is well within limits.
- **[Message ordering]** → GPS pings from different vehicles may arrive at the hub out of order relative to their `recorded_at` timestamps. Mitigation: the client-side hook uses `recorded_at` to discard older pings for the same vehicle.
- **[JWT expiry during WS session]** → JWT is validated only at connection time. A long-lived WebSocket may outlive the token. Mitigation: set a maximum connection lifetime (e.g., 50 min, less than the 60 min Cognito token TTL). Client reconnects with a fresh token.
