## ADDED Requirements

### Requirement: Vehicles Table
The system SHALL store vehicle metadata in a `vehicles` table.

#### Scenario: Vehicle record is stored with all fields
- **WHEN** a vehicle is inserted into the `vehicles` table
- **THEN** the record SHALL contain `id` (TEXT PK), `name` (TEXT NOT NULL), `type` (vehicle_type enum: truck, van), `status` (vehicle_status enum: active, inactive, maintenance), `current_route_id` (TEXT FK nullable to vehicle_routes), `created_at` (TIMESTAMPTZ), and `updated_at` (TIMESTAMPTZ)

#### Scenario: Vehicle status is indexed
- **WHEN** vehicles are queried by status
- **THEN** an index on `status` accelerates the query

### Requirement: GPS Pings Table
The system SHALL store GPS position reports in a `gps_pings` table.

#### Scenario: GPS ping is stored with dual timestamps
- **WHEN** a GPS ping is inserted
- **THEN** the record SHALL contain `id` (TEXT PK), `vehicle_id` (TEXT FK to vehicles), `lat` (DOUBLE PRECISION NOT NULL, range -90 to 90), `lng` (DOUBLE PRECISION NOT NULL, range -180 to 180), `heading` (DOUBLE PRECISION, 0-360), `speed_mph` (DOUBLE PRECISION), `recorded_at` (TIMESTAMPTZ NOT NULL — device timestamp), and `received_at` (TIMESTAMPTZ NOT NULL DEFAULT now() — server timestamp)

#### Scenario: Duplicate pings are rejected
- **WHEN** a GPS ping with the same `vehicle_id` and `recorded_at` is inserted
- **THEN** the insert is ignored (ON CONFLICT DO NOTHING) without error

#### Scenario: Latest ping per vehicle is queryable efficiently
- **WHEN** the latest ping for each active vehicle is queried
- **THEN** an index on `(vehicle_id, received_at DESC)` accelerates the query

### Requirement: Vehicle Routes Table
The system SHALL store planned vehicle routes in a `vehicle_routes` table.

#### Scenario: Route with waypoints is stored
- **WHEN** a vehicle route is inserted
- **THEN** the record SHALL contain `id` (TEXT PK), `vehicle_id` (TEXT FK to vehicles), `origin_location_id` (TEXT FK to locations), `dest_location_id` (TEXT FK to locations), `status` (route_status enum: planned, in_progress, completed), `planned_departure` (TIMESTAMPTZ), `actual_departure` (TIMESTAMPTZ nullable), `planned_arrival` (TIMESTAMPTZ), and `waypoints` (JSONB — array of {lat, lng, sequence})

#### Scenario: Route is indexed by vehicle and status
- **WHEN** routes are queried by vehicle ID and status
- **THEN** an index on `(vehicle_id, status)` accelerates the query

### Requirement: Device API Key Authentication
The system SHALL authenticate GPS device endpoints using API key headers validated against a `device_api_keys` table.

#### Scenario: Device API key is stored securely
- **WHEN** a device API key is created
- **THEN** the key is stored as a SHA-256 hash in `device_api_keys` with fields `id` (TEXT PK), `vehicle_id` (TEXT FK to vehicles), `key_hash` (TEXT NOT NULL), `created_at` (TIMESTAMPTZ), and `revoked_at` (TIMESTAMPTZ nullable)

#### Scenario: Revoked key is rejected
- **WHEN** a request uses a device API key that has a non-null `revoked_at`
- **THEN** the request is rejected with 401 Unauthorized

### Requirement: Seed Data
The system SHALL include seed migration with sample vehicles and GPS pings for development.

#### Scenario: Seed vehicles are created
- **WHEN** the seed migration runs
- **THEN** approximately 20 vehicles are inserted with realistic names, types, and active status

#### Scenario: Seed GPS pings are created
- **WHEN** the seed migration runs
- **THEN** each vehicle has at least 5 recent GPS pings along realistic highway routes between CFA distribution centers

#### Scenario: Seed vehicle routes are created
- **WHEN** the seed migration runs
- **THEN** each vehicle has one in-progress route linking two existing CFA locations

#### Scenario: Migration is reversible
- **WHEN** the down migration runs
- **THEN** all seed data and schema objects are removed cleanly
