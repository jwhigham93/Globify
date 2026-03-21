-- 000003_vehicles_schema.down.sql
-- Drop vehicle tracking tables in reverse dependency order

DROP TABLE IF EXISTS device_api_keys;
DROP TABLE IF EXISTS gps_pings;
DROP TABLE IF EXISTS vehicle_routes;
DROP TABLE IF EXISTS vehicles;

DROP TYPE IF EXISTS route_status;
DROP TYPE IF EXISTS vehicle_status;
DROP TYPE IF EXISTS vehicle_type;
