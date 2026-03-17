## Why

The supply chain platform tracks suppliers, DCs, and restaurants — but has no concept of delivery vehicles. To visualize real-time truck positions on the globe, we first need a data model for vehicles, GPS pings, and vehicle routes, plus REST endpoints for ingestion and retrieval. This change also introduces stale-GPS detection so the frontend can warn when a truck hasn't reported its position in a configurable timeframe.

## What Changes

- Add three new PostgreSQL tables: `vehicles`, `gps_pings`, and `vehicle_routes`.
- Add new REST API endpoints for GPS ping ingestion, vehicle listing, single-vehicle detail, and bulk position retrieval.
- Implement stale-GPS detection logic: `live` (< 5 min since last ping), `stale` (5–15 min), `lost` (> 15 min).
- Add database migrations with seed data (sample fleet of ~20 trucks with mock GPS pings and routes).
- Generate sqlc code for all new queries.

## Capabilities

### New Capabilities
- `vehicle-data-model`: Database tables, types, and sqlc queries for vehicles, GPS pings, and vehicle routes.
- `vehicle-api-endpoints`: REST endpoints for GPS ping ingestion, vehicle listing, vehicle detail, and bulk position retrieval with stale status computation.

### Modified Capabilities

_(none — no existing spec-level requirements change)_

## Impact

- **New migrations:** `000003_vehicles_schema.up.sql` / `down.sql`, `000004_seed_vehicles.up.sql` / `down.sql`
- **New sqlc queries:** `vehicles.sql`, `gps_pings.sql`, `vehicle_routes.sql`
- **New model file:** `services/supply-chain-api/internal/models/vehicle.go`
- **Modified files:** `handlers.go` (new handler functions), `router.go` (new route registrations), `db.go` (regenerated sqlc interface)
- **Dependencies:** No new Go module dependencies. Uses existing `pgx/v5` and `chi/v5`.
