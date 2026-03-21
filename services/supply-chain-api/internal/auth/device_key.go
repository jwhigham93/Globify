package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

const deviceVehicleIDKey contextKey = "device_vehicle_id"

// VehicleIDFromContext extracts the vehicle ID injected by DeviceKeyMiddleware.
func VehicleIDFromContext(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(deviceVehicleIDKey).(string)
	return v, ok
}

// DeviceKeyMiddleware validates the X-Device-API-Key header against
// the device_api_keys table. On success, injects the vehicle_id into
// the request context.
func DeviceKeyMiddleware(pool *pgxpool.Pool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			apiKey := r.Header.Get("X-Device-API-Key")
			if apiKey == "" {
				http.Error(w, `{"error":"missing X-Device-API-Key header"}`, http.StatusUnauthorized)
				return
			}

			// Hash the provided key
			h := sha256.Sum256([]byte(apiKey))
			keyHash := hex.EncodeToString(h[:])

			// Look up in database
			var vehicleID string
			err := pool.QueryRow(r.Context(),
				`SELECT vehicle_id::text FROM device_api_keys
				 WHERE key_hash = $1 AND revoked_at IS NULL
				 LIMIT 1`, keyHash).Scan(&vehicleID)

			if err != nil {
				log.Debug().Err(err).Msg("device key lookup failed")
				http.Error(w, `{"error":"invalid or revoked API key"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), deviceVehicleIDKey, vehicleID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
