package models

import (
	"testing"
	"time"
)

func TestComputeGpsStatusThresholds(t *testing.T) {
	cases := []struct {
		name string
		age  time.Duration
		want GpsStatus
	}{
		{"fresh", 0, GpsStatusLive},
		{"just under live threshold", GpsLiveThreshold - time.Second, GpsStatusLive},
		{"just over live threshold", GpsLiveThreshold + time.Second, GpsStatusStale},
		{"just under stale threshold", GpsStaleThreshold - time.Second, GpsStatusStale},
		{"just over stale threshold", GpsStaleThreshold + time.Second, GpsStatusLost},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := ComputeGpsStatus(time.Now().Add(-c.age))
			if got != c.want {
				t.Errorf("age %v: got %v, want %v", c.age, got, c.want)
			}
		})
	}
}

func TestResolveGpsStatusPinnedVehiclesIgnorePingAge(t *testing.T) {
	for vehicleID, want := range pinnedVehicleStatuses {
		// A ping age that would normally compute to the opposite end of the
		// spectrum (fresh for the pinned-lost vehicle, ancient for the
		// pinned-stale one) must still resolve to the pinned status — that's
		// the entire point of pinning instead of relying on ping age.
		fresh := ResolveGpsStatus(vehicleID, time.Now())
		if fresh != want {
			t.Errorf("vehicle %s with a fresh ping: got %v, want pinned %v", vehicleID, fresh, want)
		}

		ancient := ResolveGpsStatus(vehicleID, time.Now().Add(-24*time.Hour))
		if ancient != want {
			t.Errorf("vehicle %s with a day-old ping: got %v, want pinned %v", vehicleID, ancient, want)
		}
	}
}

func TestResolveGpsStatusUnpinnedVehicleFallsBackToComputed(t *testing.T) {
	const unpinnedID = "some-other-vehicle-id"
	lastPingAt := time.Now().Add(-20 * time.Minute) // > GpsStaleThreshold
	got := ResolveGpsStatus(unpinnedID, lastPingAt)
	if got != GpsStatusLost {
		t.Errorf("got %v, want computed GpsStatusLost for an unpinned vehicle", got)
	}
}
