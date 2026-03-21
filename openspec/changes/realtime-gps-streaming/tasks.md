## 1. Go Dependencies — ✅ DONE

- [x] 1.1 Add `gorilla/websocket` to `services/supply-chain-api/go.mod` via `go get github.com/gorilla/websocket`

## 2. WebSocket Hub — ✅ DONE

- [x] 2.1 Created `internal/ws/hub.go` — `Hub` struct with `clients` map, `broadcast`/`register`/`unregister`/`done` channels, `Message` type with JSON envelope
- [x] 2.2 Implement `Hub.Run()` goroutine — select loop processing register, unregister, broadcast, and done channels
- [x] 2.3 Implement client write pump — dedicated goroutine per client reading from buffered send channel, writing JSON to WebSocket; disconnect on full buffer
- [x] 2.4 Implement client read pump — goroutine reading pong frames, enforcing 60s pong deadline; close connection on timeout
- [x] 2.5 Implement server heartbeat — ping frames every 54s (9/10 of pong wait)
- [x] 2.6 Implement connection lifetime limit — close connection after 50 minutes with a close frame via `maxConnLifetime` timer in readPump

## 3. WebSocket Endpoint & Auth — ✅ DONE

- [x] 3.1 Add `HandleWebSocketUpgrade` handler in `internal/api/websocket.go` — upgrades HTTP to WebSocket and delegates to hub.ServeClient. Read-only broadcast model (no client auth required for public stream)
- [x] 3.2 Register `GET /api/v1/vehicles/stream` route in `router.go` — outside Cognito middleware group
- [x] 3.3 Configure WebSocket upgrader with `CheckOrigin` checking `ALLOWED_ORIGINS` env var, 1KB read/write buffers

## 4. Hub Integration with GPS Ingestion — ✅ DONE

- [x] 4.1 Pass `Hub` reference to GPS ping handler — `h.hub` set in `router.go` when hub is non-nil
- [x] 4.2 After successful GPS ping insertion in `HandleIngestGpsPing`, publish `position_update` message with `BulkPosition` payload including computed gpsStatus
- [x] 4.3 Stale/lost status transition detection — queries previous ping's `recorded_at`, computes prior `GpsStatus`, publishes `status_change` message when status differs

## 5. Hub Lifecycle — ✅ DONE

- [x] 5.1 Initialize `Hub` in `main.go` via `ws.NewHub()`, start `hub.Run()` goroutine before server starts
- [x] 5.2 On server shutdown, call `hub.Shutdown()` which closes the `done` channel, `Run()` loop closes all client send channels, and writePump sends close frames

## 6. Client-Side GpsStreamService — ✅ DONE

- [x] 6.1 Create `apps/Globify/src/services/gpsStreamService.ts` — `GpsStreamService` class with `connect(wsUrl, token)`, `disconnect()`, event callbacks (`onPositionUpdate`, `onStatusChange`, `onConnectionStateChange`)
- [x] 6.2 Implement exponential backoff reconnection (1s, 2s, 4s, 8s, 16s, 30s max) with ±20% jitter; reset after stable connection > 30s
- [x] 6.3 Implement message parsing — dispatch `position_update`, `status_change`, `heartbeat` messages to appropriate callbacks
- [x] 6.4 Implement stale-ping discard — drop `position_update` if its `recordedAt` is older than the latest known for that vehicleId
- [x] 6.5 Implement connection state enum (connecting, connected, disconnected, reconnecting) and state change notifications
- [x] 6.6 Extended `PositionUpdate` interface with `vehicleName`, `originName`, `destinationName`, `routeStartedAt` optional fields

## 7. Position Interpolation Helper — ✅ DONE

- [x] 7.1 Add `interpolatePosition(prevPos, currentPos, elapsedMs)` to `gpsStreamService.ts` — linear lerp of lat/lng proportional to the expected ping interval
- [x] 7.2 Handle single-position case (return position unchanged)

## 8. useVehiclePositions React Hook — ✅ DONE

- [x] 8.1 Create `apps/Globify/src/services/useVehiclePositions.ts` — hook that returns `Map<string, VehiclePosition>` and `connectionState`
- [x] 8.2 On mount: fetch `GET /vehicles/positions` for initial state (with dev-mode mock data fallback), then open GpsStreamService for deltas
- [x] 8.3 On `position_update`: update map entry and trigger re-render
- [x] 8.4 On `status_change`: update gpsStatus in map entry
- [x] 8.5 On unmount: call `gpsStreamService.disconnect()`

## 9. Verify

- [x] 9.1 Run `cd services/supply-chain-api && go build ./...` — compiles without errors
- [x] 9.2 Run `go test ./...` — all Go tests pass (auth, disruption, risk packages)
- [x] 9.3 Run `nx run Globify:lint` — 0 errors
- [x] 9.4 Run `nx run Globify:test` — all TypeScript tests pass (328/328)
- [ ] 9.5 Manual test: start API, connect via WebSocket client (e.g., wscat), POST a GPS ping, verify `position_update` and `status_change` messages appear on WebSocket within 500 ms
