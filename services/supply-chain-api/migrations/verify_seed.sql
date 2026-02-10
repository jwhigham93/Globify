-- verify_seed.sql
-- Validates that seed data was loaded correctly

\echo '=== Location Counts ==='

SELECT 'Distribution Centers' AS entity, COUNT(*) AS count
FROM locations WHERE type = 'dc'
UNION ALL
SELECT 'Suppliers', COUNT(*)
FROM locations WHERE type = 'supplier'
UNION ALL
SELECT 'Restaurants', COUNT(*)
FROM locations WHERE type = 'restaurant'
UNION ALL
SELECT 'Total Locations', COUNT(*)
FROM locations;

\echo ''
\echo '=== Route Counts ==='

SELECT 'Supplier → DC' AS route_type, COUNT(*) AS count
FROM supply_routes WHERE route_type = 'supplier_to_dc'
UNION ALL
SELECT 'DC → Restaurant', COUNT(*)
FROM supply_routes WHERE route_type = 'dc_to_restaurant'
UNION ALL
SELECT 'Total Routes', COUNT(*)
FROM supply_routes;

\echo ''
\echo '=== Foreign Key Integrity ==='

SELECT 'Orphan source_id refs' AS check_name, COUNT(*) AS violations
FROM supply_routes sr
LEFT JOIN locations l ON sr.source_id = l.id
WHERE l.id IS NULL
UNION ALL
SELECT 'Orphan dest_id refs', COUNT(*)
FROM supply_routes sr
LEFT JOIN locations l ON sr.dest_id = l.id
WHERE l.id IS NULL;

\echo ''
\echo '=== Active Route Summary ==='

SELECT 'Active routes' AS status, COUNT(*) AS count
FROM supply_routes WHERE is_active = true
UNION ALL
SELECT 'Inactive routes', COUNT(*)
FROM supply_routes WHERE is_active = false;
