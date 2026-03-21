## Context

The existing supply chain API has two tables — `locations` (suppliers, DCs, restaurants) and `supply_routes` — with REST endpoints for querying them. The API uses Go with chi router, pgx/v5 for PostgreSQL, and sqlc for type-safe query generation. Authentication is via Cognito JWT middleware. The database runs PostgreSQL 16.

Currently there is no vehicle, truck, or GPS concept in the system. The frontend shows a static supply chain network on the globe.

## Goals / Non-Goals

**Goals:**
- Define a relational model for vehicles, their GPS pings, and their planned routes.
- Expose REST endpoints for GPS ping ingestion (called by truck devices) and vehicle data retrieval (called by the frontend).
- Compute stale-GPS status at query time based on the elapsed interval since the last ping.
- Provide seed data for development and testing.

**Non-Goals:**
- Real-time WebSocket streaming (covered by `realtime-gps-streaming` change).
- Frontend rendering of trucks on the globe (covered by `truck-globe-visualization` change).
- Historical route analytics or reporting.
- Integration with actual GPS hardware or third-party fleet APIs.

## Decisions

### 1. Table Design — Three normalized tables

**Choice:**
- `vehicles` — static vehicle metadata (name, type, status).
- `gps_pings` — append-only table of position reports with both device timestamp (`recorded_at`) and server receive timestamp (`received_at`).
- `vehicle_routes` — planned routes with origin/destination location FKs and waypoints stored as JSONB.

**Rationale:** Separating pings from routes keeps the write-heavy GPS data (high insert rate) isolated from the relatively static route planning data. JSONB waypoints avoid a separate waypoints table while still being queryable.

**Alternatives considered:**
- Single `vehicle_positions` table with latest-only updates: Loses history, harder to compute speed/heading trends.
- PostGIS geometry columns: Adds a large extension dependency for simple lat/lng storage; not needed until spatial queries are required.

### 2. GPS Stale Detection — Query-time computation

**Choice:** Staleness is computed in the SQL query or in the handler rather than stored as a column. The latest ping's `received_at` is compared against `now()`:
- `received_at` within 5 min → `live`
- `received_at` 5–15 min ago → `stale`
- `received_at` > 15 min ago → `lost`
- No pings at all → `lost`

Thresholds are Go constants, not database values, for simplicity.

**Rationale:** Storing staleness would require a periodic background job to update. Computing at query time is simpler, always accurate, and the query volume for vehicle listing is low (< 1 QPS from the frontend).

**Alternatives considered:**
- Background worker updating a `status` column every minute: More complex, introduces eventual consistency.
- Database trigger on `gps_pings` insert: Triggers are harder to test and debug.

### 3. GPS Ping Ingestion Auth — API key header

**Choice:** GPS device endpoints (`POST /api/v1/vehicles/{id}/gps`) authenticate via an `X-Device-API-Key` header validated against a `device_api_keys` table (device_id, key_hash, created_at, revoked_at). This is separate from Cognito JWT auth used by the frontend.

**Rationale:** Truck GPS devices are embedded systems that can't easily run an OAuth2 flow. A pre-shared API key is simpler and follows standard IoT device authentication patterns. Keys are hashed (SHA-256) in the database.

**Alternatives considered:**
- Cognito JWT for devices: Requires token refresh logic on embedded devices — overly complex.
- No auth (rely on network security): Insecure; any actor could inject fake positions.

### 4. Ping Deduplication — Unique constraint on (vehicle_id, recorded_at)

**Choice:** Add a unique constraint on `(vehicle_id, recorded_at)` to prevent duplicate pings from the same device at the same timestamp. The ingestion endpoint uses `INSERT ... ON CONFLICT DO NOTHING`.

**Rationale:** GPS devices may retry sends on network failure, producing duplicates. The constraint ensures idempotency cheaply.

### 5. Index Strategy — Optimized for latest-ping queries

**Choice:**
- `gps_pings`: Index on `(vehicle_id, received_at DESC)` — efficiently retrieves the latest ping per vehicle.
- `vehicle_routes`: Index on `(vehicle_id, status)` — filters active routes quickly.
- `vehicles`: Index on `(status)` — filters active vehicles.

**Rationale:** The most common query pattern is "get the latest ping for each active vehicle" which benefits from the descending timestamp index with vehicle_id prefix.

## Risks / Trade-offs

- **[gps_pings table growth]** → Append-only table grows indefinitely. Mitigation: add a retention note in the migration comments. A future change can add partitioning or a cleanup job. For now, with ~20 trucks pinging every 30s, growth is ~58K rows/day — negligible for PostgreSQL.
- **[API key management]** → No admin UI for key rotation. Mitigation: keys are managed directly in the database for now. A key management endpoint can be added later.
- **[Seed data realism]** → Mock GPS pings won't represent real movement patterns. Mitigation: seed pings placed along realistic highway routes between CFA DCs; good enough for development and demo.

## Open Questions

_(none — all decisions resolved)_
