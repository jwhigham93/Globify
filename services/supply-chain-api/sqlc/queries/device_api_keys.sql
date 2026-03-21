-- name: ValidateDeviceApiKey :one
SELECT id, vehicle_id, key_hash, label, created_at, revoked_at
FROM device_api_keys
WHERE vehicle_id = $1 AND key_hash = $2 AND revoked_at IS NULL
LIMIT 1;
