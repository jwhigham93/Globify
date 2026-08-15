package api

import (
	"context"
	"database/sql"
	"encoding/binary"
	"encoding/json"
	"hash/fnv"
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

// Route-corridor clamp radii. A vehicle's candidate position is pulled back
// toward its route whenever it strays further than this, so the unbounded
// random walk below can't carry a truck out over open water. Vehicles with
// no active multi-point route (or an origin == destination metro loop) get
// the tighter point-radius instead of the intercity line-radius.
const (
	lineCorridorRadiusMiles  = 75.0
	pointCorridorRadiusMiles = 20.0
)

// Signal-outage window. Time is sliced into fixed windows, and each vehicle
// independently has outageChancePerWindow odds of going dark (skipping every
// ping) for the whole window. The decision is a pure hash of (vehicleID,
// windowIndex), so it's reproducible whether RunGPSSimulator runs from the
// local long-lived dev ticker or a fresh Lambda invocation per EventBridge
// tick — nothing needs to be persisted to remember "this vehicle is
// currently in an outage."
//
// A single skipped window (~10 min) lands a vehicle's ping age squarely in
// GpsStatusStale territory (5-15 min); an independent draw on the *next*
// window too pushes it into GpsStatusLost (>15 min). Because each window is
// drawn independently, outages of varying length and staggered timing occur
// naturally without tracking a duration anywhere.
//
// outageChancePerWindow is tuned so a couple of the fleet's ~20 vehicles are
// typically visible as stale/lost at any given moment (not just as a rare
// statistical treat) — see gps_simulator_test.go's visibility test for the
// math this is checked against.
const (
	outageWindow          = 10 * time.Minute
	outageChancePerWindow = 0.15
)

// Two vehicles are permanently pinned to a degraded state, on top of the
// probabilistic model above, so the demo always has at least one visibly
// stale and one visibly lost truck to point at rather than relying purely
// on the odds lining up. The simulator's part in this is simple — never
// ping them again — but that alone can't hold a vehicle's *displayed*
// status at a fixed point forever: ping age only ever grows over real time,
// so it would eventually carry both vehicles past the lost threshold. The
// actual pin (stale forever vs. lost forever) is applied at status-resolve
// time by models.ResolveGpsStatus, keyed on these same two IDs — see its
// doc comment. Both are also seeded pre-aged into these states (see
// 000004_seed_vehicles.up.sql) so a fresh DB shows them immediately.
var permanentlyDarkVehicleIDs = map[string]bool{
	"a1000000-0000-0000-0000-000000000009": true, // SC-T009 (Chicago) — pinned stale
	"a1000000-0000-0000-0000-000000000014": true, // SC-T014 (DC Metro) — pinned lost
}

// latLng is a bare coordinate pair, used both for corridor points and for
// decoding a route's `waypoints` JSONB column.
type latLng struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// RunGPSSimulator generates a small GPS movement for every active vehicle,
// persists the new ping, and broadcasts a position_update per vehicle so
// WebSocket clients receive real-time movement without a separate data source.
func RunGPSSimulator(ctx context.Context, pool *pgxpool.Pool, hub WSBroadcaster) {
	rows, err := pool.Query(ctx, `
		SELECT DISTINCT ON (gp.vehicle_id)
			gp.vehicle_id::text, gp.lat, gp.lng, gp.heading,
			ol.lat, ol.lng, dl.lat, dl.lng, vr.waypoints
		FROM gps_pings gp
		LEFT JOIN LATERAL (
			SELECT origin_id, destination_id, waypoints
			FROM vehicle_routes
			WHERE vehicle_id = gp.vehicle_id AND status = 'in_progress'
			ORDER BY started_at DESC NULLS LAST
			LIMIT 1
		) vr ON true
		LEFT JOIN locations ol ON ol.id = vr.origin_id
		LEFT JOIN locations dl ON dl.id = vr.destination_id
		ORDER BY gp.vehicle_id, gp.recorded_at DESC
	`)
	if err != nil {
		log.Error().Err(err).Msg("gps-sim: failed to query current positions")
		return
	}
	defer rows.Close()

	type vehiclePos struct {
		id           string
		lat          float64
		lng          float64
		heading      float64
		originLat    sql.NullFloat64
		originLng    sql.NullFloat64
		destLat      sql.NullFloat64
		destLng      sql.NullFloat64
		waypointsRaw []byte
	}

	var vehicles []vehiclePos
	for rows.Next() {
		var v vehiclePos
		if err := rows.Scan(
			&v.id, &v.lat, &v.lng, &v.heading,
			&v.originLat, &v.originLng, &v.destLat, &v.destLng, &v.waypointsRaw,
		); err != nil {
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
	updated, skipped := 0, 0

	for i, v := range vehicles {
		if permanentlyDarkVehicleIDs[v.id] {
			skipped++
			continue
		}

		if vehicleHasSignalOutage(v.id, now) {
			skipped++
			continue
		}

		// Apply a small random step biased by the current heading so trucks
		// drift in roughly the same direction rather than jumping randomly.
		headingRad := v.heading * math.Pi / 180.0
		// Forward bias component
		dLat := math.Cos(headingRad)*stepDeg*0.7 + (rand.Float64()*2-1)*stepDeg*0.3
		dLng := math.Sin(headingRad)*stepDeg*0.7 + (rand.Float64()*2-1)*stepDeg*0.3

		newLat := clampF(v.lat+dLat, -90, 90)
		newLng := clampF(v.lng+dLng, -180, 180)

		corridor, radiusMiles := buildCorridor(
			v.originLat, v.originLng, v.destLat, v.destLng, v.waypointsRaw, v.lat, v.lng,
		)
		newLat, newLng = clampToCorridor(newLat, newLng, corridor, radiusMiles)

		// New heading from old → new position
		newHeading := headingDeg(v.lat, v.lng, newLat, newLng)
		speed := 35.0 + rand.Float64()*30.0 // 35–65 mph

		// Spread pings by 1 ms to avoid collisions on the UNIQUE constraint.
		recordedAt := now.Add(time.Duration(i) * time.Millisecond)

		rowsAffected, err := insertPing(ctx, pool, v.id, newLat, newLng, newHeading, speed, recordedAt)
		if err != nil {
			log.Warn().Err(err).Str("vehicleId", v.id).Msg("gps-sim: insert failed")
			continue
		}
		// ON CONFLICT DO NOTHING can insert zero rows; only count and broadcast a
		// position that was actually persisted so clients don't see phantom moves.
		if rowsAffected == 0 {
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

	log.Info().Int("updated", updated).Int("skipped", skipped).Int("total", len(vehicles)).
		Msg("gps-sim: positions updated")
}

// insertPing persists one GPS ping, returning how many rows were actually
// written (0 if a concurrent tick already claimed this vehicle+timestamp via
// the UNIQUE constraint — expected under ON CONFLICT DO NOTHING, not an error).
func insertPing(
	ctx context.Context, pool *pgxpool.Pool,
	vehicleID string, lat, lng, heading, speedMph float64, recordedAt time.Time,
) (int64, error) {
	tag, err := pool.Exec(ctx,
		`INSERT INTO gps_pings (vehicle_id, lat, lng, heading, speed_mph, recorded_at)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (vehicle_id, recorded_at) DO NOTHING`,
		vehicleID, lat, lng, heading, speedMph, recordedAt,
	)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// buildCorridor assembles the polyline a vehicle should stay near — its
// route's origin, waypoints, and destination, in order — along with the
// clamp radius to use for it. A vehicle with no active route, or whose route
// is a same-location metro loop (origin == destination, no waypoints),
// yields a single-point corridor centered on its last known position with
// the tighter point radius.
func buildCorridor(
	originLat, originLng, destLat, destLng sql.NullFloat64,
	waypointsRaw []byte,
	lastLat, lastLng float64,
) ([]latLng, float64) {
	var pts []latLng
	if originLat.Valid && originLng.Valid {
		pts = append(pts, latLng{originLat.Float64, originLng.Float64})
	}
	if len(waypointsRaw) > 0 {
		var wps []latLng
		if err := json.Unmarshal(waypointsRaw, &wps); err == nil {
			pts = append(pts, wps...)
		}
	}
	if destLat.Valid && destLng.Valid {
		pts = append(pts, latLng{destLat.Float64, destLng.Float64})
	}

	if len(pts) < 2 {
		// No route, or a route whose only endpoint(s) collapse to one
		// point — bound movement around the vehicle's last known position
		// instead of an unbounded line.
		if len(pts) == 1 {
			return pts, pointCorridorRadiusMiles
		}
		return []latLng{{lastLat, lastLng}}, pointCorridorRadiusMiles
	}
	return pts, lineCorridorRadiusMiles
}

// clampToCorridor pulls (lat,lng) back within maxRadiusMiles of the nearest
// point on the corridor polyline, preserving the direction of travel from
// that nearest point. Uses a local equirectangular (flat-earth) projection
// around the corridor's first point — accurate enough at clamp-radius scale
// (tens of miles), not meant for long-range navigation.
func clampToCorridor(lat, lng float64, corridor []latLng, maxRadiusMiles float64) (float64, float64) {
	if len(corridor) == 0 {
		return lat, lng
	}

	ref := corridor[0]
	px, py := toMiles(latLng{lat, lng}, ref)

	bestX, bestY := toMiles(corridor[0], ref)
	bestDist := math.Hypot(px-bestX, py-bestY)

	for i := 0; i < len(corridor)-1; i++ {
		ax, ay := toMiles(corridor[i], ref)
		bx, by := toMiles(corridor[i+1], ref)
		nx, ny := nearestOnSegment(px, py, ax, ay, bx, by)
		if d := math.Hypot(px-nx, py-ny); d < bestDist {
			bestDist, bestX, bestY = d, nx, ny
		}
	}

	if bestDist <= maxRadiusMiles {
		return lat, lng
	}

	scale := maxRadiusMiles / bestDist
	clamped := fromMiles(bestX+(px-bestX)*scale, bestY+(py-bestY)*scale, ref)
	return clamped.Lat, clamped.Lng
}

const milesPerDegLat = 69.0

func milesPerDegLng(latDeg float64) float64 {
	return 69.172 * math.Cos(latDeg*math.Pi/180.0)
}

// toMiles/fromMiles convert to and from a local planar (miles) frame
// centered on ref, so corridor-clamp math can use plain 2D geometry.
func toMiles(p, ref latLng) (x, y float64) {
	return (p.Lng - ref.Lng) * milesPerDegLng(ref.Lat), (p.Lat - ref.Lat) * milesPerDegLat
}

func fromMiles(x, y float64, ref latLng) latLng {
	return latLng{
		Lat: ref.Lat + y/milesPerDegLat,
		Lng: ref.Lng + x/milesPerDegLng(ref.Lat),
	}
}

// nearestOnSegment returns the closest point to (px,py) on segment (ax,ay)-(bx,by).
func nearestOnSegment(px, py, ax, ay, bx, by float64) (float64, float64) {
	dx, dy := bx-ax, by-ay
	lenSq := dx*dx + dy*dy
	if lenSq == 0 {
		return ax, ay
	}
	t := ((px-ax)*dx + (py-ay)*dy) / lenSq
	if t < 0 {
		t = 0
	} else if t > 1 {
		t = 1
	}
	return ax + t*dx, ay + t*dy
}

// vehicleHasSignalOutage reports whether vehicleID should skip its ping at
// `now` — a deterministic hash of (vehicleID, current outage window), so
// the decision is reproducible across any invocation without persisting
// anything. See the outageWindow doc comment for why this reads as
// GpsStatusStale/GpsStatusLost on the frontend.
func vehicleHasSignalOutage(vehicleID string, now time.Time) bool {
	windowIndex := now.Unix() / int64(outageWindow.Seconds())
	windowRand := rand.New(rand.NewSource(windowSeed(vehicleID, windowIndex)))
	return windowRand.Float64() < outageChancePerWindow
}

// windowSeed derives a stable per-(vehicle, window) seed so outage decisions
// are reproducible without persisting anything.
func windowSeed(vehicleID string, windowIndex int64) int64 {
	h := fnv.New64a()
	h.Write([]byte(vehicleID))
	var buf [8]byte
	binary.BigEndian.PutUint64(buf[:], uint64(windowIndex))
	h.Write(buf[:])
	return int64(h.Sum64())
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
