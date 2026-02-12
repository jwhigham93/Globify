-- 000001_initial_schema.up.sql
-- Creates the supply chain database schema

-- Enum types matching TypeScript LocationType and RouteType
CREATE TYPE location_type AS ENUM ('supplier', 'dc', 'restaurant');
CREATE TYPE route_type AS ENUM ('supplier_to_dc', 'dc_to_restaurant');

-- Locations table (suppliers, DCs, restaurants)
CREATE TABLE locations (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat  DOUBLE PRECISION NOT NULL,
    lng  DOUBLE PRECISION NOT NULL,
    type location_type NOT NULL
);

-- Supply routes table (supplier→DC, DC→restaurant)
CREATE TABLE supply_routes (
    id         TEXT PRIMARY KEY,
    source_id  TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    dest_id    TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    route_type route_type NOT NULL,
    volume     INTEGER NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT true
);

-- Indexes for common query patterns
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_supply_routes_source_id ON supply_routes(source_id);
CREATE INDEX idx_supply_routes_dest_id ON supply_routes(dest_id);
CREATE INDEX idx_supply_routes_route_type ON supply_routes(route_type);
