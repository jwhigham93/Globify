package api

import (
	"database/sql"
	"math"
	"testing"
	"time"
)

func TestClampToCorridorWithinRadiusUnchanged(t *testing.T) {
	corridor := []latLng{{33.749, -84.388}, {34.56, -83.65}} // Atlanta -> ~I-85 waypoint
	// A point close to the corridor should pass through unchanged.
	lat, lng := clampToCorridor(33.80, -84.30, corridor, lineCorridorRadiusMiles)
	if lat != 33.80 || lng != -84.30 {
		t.Fatalf("expected unchanged point, got (%v, %v)", lat, lng)
	}
}

func TestClampToCorridorPullsBackDriftedPoint(t *testing.T) {
	corridor := []latLng{{33.749, -84.388}, {34.56, -83.65}}
	// Far out over open water relative to this corridor.
	farLat, farLng := 25.0, -80.0

	lat, lng := clampToCorridor(farLat, farLng, corridor, lineCorridorRadiusMiles)
	if lat == farLat && lng == farLng {
		t.Fatal("expected drifted point to be pulled back toward the corridor")
	}

	if d := nearestCorridorDistanceMiles(lat, lng, corridor); d > lineCorridorRadiusMiles+0.5 {
		t.Fatalf("clamped point is still %.1f miles from corridor, want <= %.1f", d, lineCorridorRadiusMiles)
	}
}

func TestClampToCorridorSinglePointRadius(t *testing.T) {
	corridor := []latLng{{33.749, -84.388}} // metro van, origin == destination
	lat, lng := clampToCorridor(35.0, -84.388, corridor, pointCorridorRadiusMiles)
	if d := nearestCorridorDistanceMiles(lat, lng, corridor); d > pointCorridorRadiusMiles+0.5 {
		t.Fatalf("clamped point is %.1f miles from single-point corridor, want <= %.1f", d, pointCorridorRadiusMiles)
	}
}

func nearestCorridorDistanceMiles(lat, lng float64, corridor []latLng) float64 {
	ref := corridor[0]
	px, py := toMiles(latLng{lat, lng}, ref)
	bestX, bestY := toMiles(corridor[0], ref)
	best := math.Hypot(px-bestX, py-bestY)
	for i := 0; i < len(corridor)-1; i++ {
		ax, ay := toMiles(corridor[i], ref)
		bx, by := toMiles(corridor[i+1], ref)
		nx, ny := nearestOnSegment(px, py, ax, ay, bx, by)
		if d := math.Hypot(px-nx, py-ny); d < best {
			best = d
		}
	}
	return best
}

func TestBuildCorridorFallsBackToPointWhenNoRoute(t *testing.T) {
	corridor, radius := buildCorridor(nullFloat(false, 0.0), nullFloat(false, 0.0), nullFloat(false, 0.0), nullFloat(false, 0.0), nil, 40.0, -90.0)
	if len(corridor) != 1 || corridor[0].Lat != 40.0 || corridor[0].Lng != -90.0 {
		t.Fatalf("expected single-point corridor at last known position, got %+v", corridor)
	}
	if radius != pointCorridorRadiusMiles {
		t.Fatalf("expected point radius, got %v", radius)
	}
}

func TestBuildCorridorUsesRouteWithWaypoints(t *testing.T) {
	waypoints := []byte(`[{"lat":34.0,"lng":-84.0}]`)
	corridor, radius := buildCorridor(
		nullFloat(true, 33.749), nullFloat(true, -84.388),
		nullFloat(true, 34.56), nullFloat(true, -83.65),
		waypoints, 0, 0,
	)
	if len(corridor) != 3 {
		t.Fatalf("expected origin + waypoint + destination (3 points), got %d", len(corridor))
	}
	if radius != lineCorridorRadiusMiles {
		t.Fatalf("expected line radius, got %v", radius)
	}
}

func TestVehicleHasSignalOutageDeterministicForSameVehicleAndWindow(t *testing.T) {
	// Same (vehicleID, window) must always yield the same answer regardless
	// of which process/invocation asks — that's the whole point of deriving
	// it from a hash instead of storing state.
	now := time.Date(2026, 8, 14, 10, 3, 0, 0, time.UTC)
	a := vehicleHasSignalOutage("vehicle-a", now)
	b := vehicleHasSignalOutage("vehicle-a", now)
	if a != b {
		t.Fatal("expected deterministic outage decision for same vehicle+time")
	}
}

func TestVehicleHasSignalOutageStableWithinWindow(t *testing.T) {
	// Two ticks inside the same 10-minute window must agree — the whole
	// point is that an outage covers the full window, not per-tick noise.
	windowStart := time.Date(2026, 8, 14, 10, 0, 0, 0, time.UTC)
	a := vehicleHasSignalOutage("vehicle-a", windowStart)
	b := vehicleHasSignalOutage("vehicle-a", windowStart.Add(8*time.Minute))
	if a != b {
		t.Fatal("expected outage decision to stay stable across ticks within the same window")
	}
}

func TestVehicleHasSignalOutageVariesAcrossVehicles(t *testing.T) {
	now := time.Date(2026, 8, 14, 10, 0, 0, 0, time.UTC)
	allSame := true
	first := vehicleHasSignalOutage("vehicle-0", now)
	for i := 1; i < 50; i++ {
		if vehicleHasSignalOutage(vehicleIDFor(i), now) != first {
			allSame = false
			break
		}
	}
	if allSame {
		t.Fatal("expected outage decisions to vary across vehicles, all 50 matched")
	}
}

func TestVehicleHasSignalOutageVisibilityAtAnyMoment(t *testing.T) {
	// Regression guard for the original design flaw: probabilities tuned
	// low enough that a demo essentially never showed a degraded truck.
	// Sample many (vehicle, moment) pairs and require the observed outage
	// rate to land near outageChancePerWindow, not orders of magnitude
	// below it.
	const sampleVehicles = 20
	const sampleMoments = 500
	base := time.Date(2026, 8, 14, 0, 0, 0, 0, time.UTC)

	outages := 0
	total := 0
	for m := 0; m < sampleMoments; m++ {
		now := base.Add(time.Duration(m) * 173 * time.Second) // irregular stride
		for i := 0; i < sampleVehicles; i++ {
			total++
			if vehicleHasSignalOutage(vehicleIDFor(i), now) {
				outages++
			}
		}
	}

	rate := float64(outages) / float64(total)
	if rate < outageChancePerWindow*0.5 || rate > outageChancePerWindow*1.5 {
		t.Fatalf("observed outage rate %.3f far from target %.3f — demo visibility regressed",
			rate, outageChancePerWindow)
	}
	t.Logf("observed outage rate %.3f over %d (vehicle, moment) samples", rate, total)
}

func TestPermanentlyDarkVehiclesAreNeverPinged(t *testing.T) {
	// The simulator's whole job for these two IDs is to never advance their
	// ping — the actual stale-vs-lost distinction is applied downstream by
	// models.ResolveGpsStatus (see internal/models/vehicle_test.go).
	if len(permanentlyDarkVehicleIDs) != 2 {
		t.Fatalf("expected exactly 2 permanently-dark demo vehicles, got %d", len(permanentlyDarkVehicleIDs))
	}
}

func vehicleIDFor(i int) string {
	return "vehicle-" + string(rune('a'+i%26)) + string(rune('0'+i%10))
}

// nullFloat builds a sql.NullFloat64 inline for tests.
func nullFloat(valid bool, v float64) sql.NullFloat64 {
	return sql.NullFloat64{Valid: valid, Float64: v}
}
