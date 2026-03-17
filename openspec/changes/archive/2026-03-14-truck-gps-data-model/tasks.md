## 1. Database Schema Migration — ✅ DONE

- [x] 1.1 Create `services/supply-chain-api/migrations/000003_vehicles_schema.up.sql` — `vehicle_type` enum (truck, van), `vehicle_status` enum (active, inactive, maintenance), `route_status` enum (planned, in_progress, completed), `vehicles` table, `gps_pings` table, `vehicle_routes` table, `device_api_keys` table
- [x] 1.2 Add unique constraint on `gps_pings (vehicle_id, recorded_at)` for deduplication
- [x] 1.3 Add indexes: `vehicles(status)`, `gps_pings(vehicle_id, received_at DESC)`, `vehicle_routes(vehicle_id, status)`, `device_api_keys(vehicle_id)`
- [x] 1.4 Add CHECK constraints: `gps_pings.lat` between -90 and 90, `gps_pings.lng` between -180 and 180
- [x] 1.5 Create `services/supply-chain-api/migrations/000003_vehicles_schema.down.sql` — drop tables and enums in reverse order

## 2. Seed Data Migration — ✅ DONE

- [x] 2.1 Create `services/supply-chain-api/migrations/000004_seed_vehicles.up.sql` — insert 20 vehicles (mix of trucks and vans, all active)
- [x] 2.2 Insert ~5 GPS pings per vehicle along realistic highway routes between CFA DCs (I-85, I-75, I-35, etc.)
- [x] 2.3 Insert one `in_progress` vehicle route per vehicle linking two existing CFA DC locations, with waypoints JSONB
- [x] 2.4 Insert device API keys for each vehicle (SHA-256 hashed, using a known dev key for testing)
- [x] 2.5 Create `services/supply-chain-api/migrations/000004_seed_vehicles.down.sql` — truncate all new tables

## 3. Go Models — ✅ DONE

- [x] 3.1 Create `services/supply-chain-api/internal/models/vehicle.go` — `Vehicle`, `GpsPing`, `VehicleRoute`, `DeviceApiKey` structs with JSON tags
- [x] 3.2 Add `GpsStatus` type (string enum: live, stale, lost) and `VehicleWithPosition` response struct (includes latest position + gpsStatus)
- [x] 3.3 Add `VehicleDetail` response struct (vehicle metadata + recent pings + current route + gpsStatus)
- [x] 3.4 Add `BulkPosition` response struct — extended with `VehicleName`, `OriginName`, `DestinationName`, `RouteStartedAt` fields (JOINed from vehicle_routes + locations)
- [x] 3.5 Add stale-threshold constants: `GpsLiveThreshold = 5 * time.Minute`, `GpsStaleThreshold = 15 * time.Minute`

## 4. sqlc Queries — ✅ DONE

- [x] 4.1 Create `services/supply-chain-api/sqlc/queries/vehicles.sql` — ListVehicles (with optional type filter), GetVehicleByID, InsertVehicle
- [x] 4.2 Create `services/supply-chain-api/sqlc/queries/gps_pings.sql` — InsertGpsPing (ON CONFLICT DO NOTHING), GetLatestPingByVehicle, ListRecentPings (limit 50), GetLatestPingsForAllActiveVehicles (lateral join)
- [x] 4.3 Create `services/supply-chain-api/sqlc/queries/vehicle_routes.sql` — GetActiveRouteByVehicle, ListRoutesByVehicle
- [x] 4.4 Add `services/supply-chain-api/sqlc/queries/device_api_keys.sql` — ValidateDeviceApiKey (lookup by vehicle_id + key_hash where revoked_at IS NULL)
- [x] 4.5 Run `make sqlc-generate` to regenerate Go code from queries

## 5. Device API Key Middleware — ✅ DONE

- [x] 5.1 Create `services/supply-chain-api/internal/auth/device_key.go` — middleware that extracts `X-Device-API-Key` header, hashes it (SHA-256), validates against `device_api_keys` table, injects vehicle_id into request context
- [x] 5.2 Reject with 401 if header is missing, key is invalid, or key is revoked

## 6. HTTP Handlers — ✅ DONE

- [x] 6.1 Add `HandleIngestGpsPing` handler — validate lat/lng range, insert ping, return 201
- [x] 6.2 Add `HandleListVehicles` handler — query vehicles with latest ping, compute gpsStatus, return JSON array
- [x] 6.3 Add `HandleGetVehicle` handler — query vehicle by ID with recent pings and current route, compute gpsStatus, return 200 or 404
- [x] 6.4 Add `HandleGetVehicleRoute` handler — return active route or 404
- [x] 6.5 Add `HandleBulkPositions` handler — lateral join query for latest ping per active vehicle, compute gpsStatus, return array. Extended SQL with JOINs to vehicle_routes + locations for origin/destination names.

## 7. Router Registration — ✅ DONE

- [x] 7.1 Register vehicle endpoints in `router.go` under `/api/v1/vehicles` group
- [x] 7.2 Apply Cognito JWT middleware to read endpoints (GET /vehicles, GET /vehicles/{id}, GET /vehicles/{id}/route, GET /vehicles/positions)
- [x] 7.3 Apply device API key middleware to write endpoint (POST /vehicles/{id}/gps)

## 8. Verify

- [x] 8.1 Run `cd services/supply-chain-api && go build ./...` — compiles without errors
- [ ] 8.2 Run `make migrate-up` — all migrations apply successfully
- [ ] 8.3 Run `make migrate-down && make migrate-up` — round-trip migration works
- [ ] 8.4 Run `make test` — all tests pass
- [ ] 8.5 Verify seed data: `make verify-seed` (or manual query) confirms vehicle and ping counts
