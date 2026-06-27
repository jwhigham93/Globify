package api

import (
	"context"
	"math"
	"math/rand"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/models"
)

// stepDeg is ~0.004 degrees ≈ 440 m per 2-minute tick — realistic truck speed
// at ~55 mph: 55 mph × (2/60) hr = 1.83 mi ≈ 2950 m on a direct path.
// We use a smaller step because movement is random (not directed).
const stepDeg = 0.004

// RunGPSSimulator generates a small GPS movement for every active vehicle,
// persists the new ping, and broadcasts a position_update per vehicle so
// WebSocket clients receive real-time movement without a separate data source.
func RunGPSSimulator(ctx context.Context, pool *pgxpool.Pool, hub WSBroadcaster) {
	rows, err := pool.Query(ctx, `
		SELECT DISTINCT ON (vehicle_id)
			vehicle_id::text, lat, lng, heading
		FROM gps_pings
		ORDER BY vehicle_id, recorded_at DESC
	`)
	if err != nil {
		log.Error().Err(err).Msg("gps-sim: failed to query current positions")
		return
	}
	defer rows.Close()

	type vehiclePos struct {
		id      string
		lat     float64
		lng     float64
		heading float64
	}

	var vehicles []vehiclePos
	for rows.Next() {
		var v vehiclePos
		if err := rows.Scan(&v.id, &v.lat, &v.lng, &v.heading); err != nil {
			log.Warn().Err(err).Msg("gps-sim: scan error, skipping row")
			continue
		}
		vehicles = append(vehicles, v)
	}
	if rows.Err() != nil {
		log.Error().Err(rows.Err()).Msg("gps-sim: rows error")
		return
	}

	now := time.Now().UTC()
	updated := 0

	for i, v := range vehicles {
		// Apply a small random step biased by the current heading so trucks
		// drift in roughly the same direction rather than jumping randomly.
		headingRad := v.heading * math.Pi / 180.0
		// Forward bias component
		dLat := math.Cos(headingRad)*stepDeg*0.7 + (rand.Float64()*2-1)*stepDeg*0.3
		dLng := math.Sin(headingRad)*stepDeg*0.7 + (rand.Float64()*2-1)*stepDeg*0.3

		newLat := clampF(v.lat+dLat, -90, 90)
		newLng := clampF(v.lng+dLng, -180, 180)

		// New heading from old → new position
		newHeading := headingDeg(v.lat, v.lng, newLat, newLng)
		speed := 35.0 + rand.Float64()*30.0 // 35–65 mph

		// Spread pings by 1 ms to avoid collisions on the UNIQUE constraint.
		recordedAt := now.Add(time.Duration(i) * time.Millisecond)

		_, err := pool.Exec(ctx,
			`INSERT INTO gps_pings (vehicle_id, lat, lng, heading, speed_mph, recorded_at)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 ON CONFLICT (vehicle_id, recorded_at) DO NOTHING`,
			v.id, newLat, newLng, newHeading, speed, recordedAt,
		)
		if err != nil {
			log.Warn().Err(err).Str("vehicleId", v.id).Msg("gps-sim: insert failed")
			continue
		}
		updated++

		if hub != nil {
			hub.Broadcast("position_update", models.BulkPosition{
				VehicleID:  v.id,
				Lat:        newLat,
				Lng:        newLng,
				Heading:    &newHeading,
				SpeedMph:   &speed,
				RecordedAt: recordedAt,
				GpsStatus:  models.GpsStatusLive,
			})
		}
	}

	log.Info().Int("updated", updated).Int("total", len(vehicles)).Msg("gps-sim: positions updated")
}

func clampF(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func headingDeg(lat1, lng1, lat2, lng2 float64) float64 {
	h := math.Atan2(lng2-lng1, lat2-lat1) * 180.0 / math.Pi
	if h < 0 {
		h += 360
	}
	return h
}
