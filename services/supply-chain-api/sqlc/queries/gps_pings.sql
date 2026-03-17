-- name: InsertGpsPing :one
INSERT INTO gps_pings (vehicle_id, lat, lng, heading, speed_mph, recorded_at)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (vehicle_id, recorded_at) DO NOTHING
RETURNING id, vehicle_id, lat, lng, heading, speed_mph, recorded_at, received_at;

-- name: GetLatestPingByVehicle :one
SELECT id, vehicle_id, lat, lng, heading, speed_mph, recorded_at, received_at
FROM gps_pings
WHERE vehicle_id = $1
ORDER BY received_at DESC
LIMIT 1;

-- name: ListRecentPings :many
SELECT id, vehicle_id, lat, lng, heading, speed_mph, recorded_at, received_at
FROM gps_pings
WHERE vehicle_id = $1
ORDER BY received_at DESC
LIMIT 50;

-- name: GetLatestPingsForAllActiveVehicles :many
SELECT DISTINCT ON (v.id)
    v.id AS vehicle_id,
    v.name AS vehicle_name,
    v.type AS vehicle_type,
    v.status AS vehicle_status,
    p.lat,
    p.lng,
    p.heading,
    p.speed_mph,
    p.recorded_at,
    p.received_at
FROM vehicles v
LEFT JOIN LATERAL (
    SELECT lat, lng, heading, speed_mph, recorded_at, received_at
    FROM gps_pings
    WHERE vehicle_id = v.id
    ORDER BY received_at DESC
    LIMIT 1
) p ON true
WHERE v.status = 'active'
ORDER BY v.id;
