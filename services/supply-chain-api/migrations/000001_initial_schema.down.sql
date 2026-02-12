-- 000001_initial_schema.down.sql
-- Reverses the initial schema migration

DROP TABLE IF EXISTS supply_routes;
DROP TABLE IF EXISTS locations;
DROP TYPE IF EXISTS route_type;
DROP TYPE IF EXISTS location_type;
