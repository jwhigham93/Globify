-- name: GetActiveRouteByVehicle :one
SELECT id, vehicle_id, origin_id, destination_id, status, waypoints, started_at, completed_at, created_at
FROM vehicle_routes
WHERE vehicle_id = $1 AND status = 'in_progress'
ORDER BY created_at DESC
LIMIT 1;

-- name: ListRoutesByVehicle :many
SELECT id, vehicle_id, origin_id, destination_id, status, waypoints, started_at, completed_at, created_at
FROM vehicle_routes
WHERE vehicle_id = $1
ORDER BY created_at DESC;
