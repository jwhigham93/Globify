-- 000003_vehicles_schema.up.sql
-- Creates vehicle tracking tables: vehicles, GPS pings, routes, device API keys

-- Enum types
CREATE TYPE vehicle_type AS ENUM ('truck', 'van');
CREATE TYPE vehicle_status AS ENUM ('active', 'inactive', 'maintenance');
CREATE TYPE route_status AS ENUM ('planned', 'in_progress', 'completed');

-- Vehicles table
CREATE TABLE vehicles (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    type       vehicle_type NOT NULL DEFAULT 'truck',
    status     vehicle_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GPS pings (time-series location data from vehicle devices)
CREATE TABLE gps_pings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    lat         DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lng         DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
    heading     DOUBLE PRECISION,       -- degrees 0-360
    speed_mph   DOUBLE PRECISION,       -- current speed in mph
    recorded_at TIMESTAMPTZ NOT NULL,   -- when device recorded this point
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- when server received it
    UNIQUE (vehicle_id, recorded_at)    -- deduplication constraint
);

-- Vehicle routes (planned/active delivery routes)
CREATE TABLE vehicle_routes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    origin_id       TEXT NOT NULL REFERENCES locations(id),
    destination_id  TEXT NOT NULL REFERENCES locations(id),
    status          route_status NOT NULL DEFAULT 'planned',
    waypoints       JSONB,              -- array of {lat, lng} waypoints
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Device API keys (for GPS device authentication)
CREATE TABLE device_api_keys (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    key_hash    TEXT NOT NULL,           -- SHA-256 hash of the API key
    label       TEXT NOT NULL DEFAULT 'default',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ             -- NULL = active, non-NULL = revoked
);

-- Indexes
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_gps_pings_vehicle_received ON gps_pings(vehicle_id, received_at DESC);
CREATE INDEX idx_vehicle_routes_vehicle_status ON vehicle_routes(vehicle_id, status);
CREATE INDEX idx_device_api_keys_vehicle ON device_api_keys(vehicle_id);
