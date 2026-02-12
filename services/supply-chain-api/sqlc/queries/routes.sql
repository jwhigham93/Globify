-- name: ListRoutes :many
SELECT id, source_id, dest_id, route_type, volume, is_active
FROM supply_routes
ORDER BY id;

-- name: ListRoutesByType :many
SELECT id, source_id, dest_id, route_type, volume, is_active
FROM supply_routes
WHERE route_type = $1
ORDER BY id;

-- name: ListRoutesBySourceId :many
SELECT id, source_id, dest_id, route_type, volume, is_active
FROM supply_routes
WHERE source_id = $1
ORDER BY id;

-- name: ListRoutesByDestId :many
SELECT id, source_id, dest_id, route_type, volume, is_active
FROM supply_routes
WHERE dest_id = $1
ORDER BY id;

-- name: ListActiveRoutes :many
SELECT id, source_id, dest_id, route_type, volume, is_active
FROM supply_routes
WHERE is_active = true
ORDER BY id;
