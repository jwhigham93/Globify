-- name: ListVehicles :many
SELECT id, name, type, status, created_at, updated_at
FROM vehicles
WHERE (sqlc.narg('vehicle_type')::vehicle_type IS NULL OR type = sqlc.narg('vehicle_type'))
ORDER BY name;

-- name: GetVehicleByID :one
SELECT id, name, type, status, created_at, updated_at
FROM vehicles
WHERE id = $1;

-- name: InsertVehicle :one
INSERT INTO vehicles (name, type, status)
VALUES ($1, $2, $3)
RETURNING id, name, type, status, created_at, updated_at;
