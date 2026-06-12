-- name: ListLocations :many
SELECT id, name, lat, lng, type
FROM locations
ORDER BY name;

-- name: GetLocation :one
SELECT id, name, lat, lng, type
FROM locations
WHERE id = $1;

-- name: ListLocationsByType :many
SELECT id, name, lat, lng, type
FROM locations
WHERE type = $1
ORDER BY name;

-- name: ListLocationsByIDs :many
SELECT id, name, lat, lng, type
FROM locations
WHERE id = ANY($1::text[])
ORDER BY name;
