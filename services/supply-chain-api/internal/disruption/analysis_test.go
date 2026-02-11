package disruption

import (
	"testing"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/models"
)

// ── Test fixtures ────────────────────────────────────────────────────────

var locations = []models.Location{
	{ID: "sup-1", Name: "Supplier 1", Lat: 40, Lng: -90, Type: models.LocationTypeSupplier},
	{ID: "sup-2", Name: "Supplier 2", Lat: 42, Lng: -88, Type: models.LocationTypeSupplier},
	{ID: "dc-a", Name: "DC Alpha", Lat: 33, Lng: -84, Type: models.LocationTypeDC},
	{ID: "dc-b", Name: "DC Beta", Lat: 32, Lng: -96, Type: models.LocationTypeDC},
	{ID: "rest-1", Name: "Restaurant 1", Lat: 35, Lng: -80, Type: models.LocationTypeRestaurant},
	{ID: "rest-2", Name: "Restaurant 2", Lat: 30, Lng: -81, Type: models.LocationTypeRestaurant},
	{ID: "rest-3", Name: "Restaurant 3", Lat: 29, Lng: -95, Type: models.LocationTypeRestaurant},
}

var routes = []models.SupplyRoute{
	{ID: "r1", SourceID: "sup-1", DestID: "dc-a", RouteType: models.RouteTypeSupplierToDC, Volume: 1000, IsActive: true},
	{ID: "r2", SourceID: "sup-2", DestID: "dc-a", RouteType: models.RouteTypeSupplierToDC, Volume: 800, IsActive: true},
	{ID: "r3", SourceID: "sup-1", DestID: "dc-b", RouteType: models.RouteTypeSupplierToDC, Volume: 600, IsActive: true},
	// rest-1 served by dc-a only
	{ID: "r4", SourceID: "dc-a", DestID: "rest-1", RouteType: models.RouteTypeDCToRestaurant, Volume: 200, IsActive: true},
	// rest-2 served by BOTH dc-a and dc-b
	{ID: "r5", SourceID: "dc-a", DestID: "rest-2", RouteType: models.RouteTypeDCToRestaurant, Volume: 150, IsActive: true},
	{ID: "r6", SourceID: "dc-b", DestID: "rest-2", RouteType: models.RouteTypeDCToRestaurant, Volume: 100, IsActive: true},
	// rest-3 served by dc-b only
	{ID: "r7", SourceID: "dc-b", DestID: "rest-3", RouteType: models.RouteTypeDCToRestaurant, Volume: 300, IsActive: true},
	// Inactive route — should be ignored
	{ID: "r8", SourceID: "dc-b", DestID: "rest-1", RouteType: models.RouteTypeDCToRestaurant, Volume: 50, IsActive: false},
}

func setOf(ids ...string) map[string]struct{} {
	s := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		s[id] = struct{}{}
	}
	return s
}

func containsID(locs []models.Location, id string) bool {
	for _, l := range locs {
		if l.ID == id {
			return true
		}
	}
	return false
}

func routeIDs(rs []models.SupplyRoute) map[string]struct{} {
	m := make(map[string]struct{}, len(rs))
	for _, r := range rs {
		m[r.ID] = struct{}{}
	}
	return m
}

// ── BuildDependencyMap ────────────────────────────────────────────────────

func TestBuildDependencyMap(t *testing.T) {
	dm := BuildDependencyMap(routes)

	t.Run("DC→restaurant adjacency", func(t *testing.T) {
		dcA := dm.DCToRestaurants["dc-a"]
		if len(dcA) != 2 {
			t.Fatalf("expected 2 restaurants for dc-a, got %d", len(dcA))
		}
	})

	t.Run("supplier→DC adjacency", func(t *testing.T) {
		sup1 := dm.SupplierToDcs["sup-1"]
		if len(sup1) != 2 {
			t.Fatalf("expected 2 DCs for sup-1, got %d", len(sup1))
		}
		sup2 := dm.SupplierToDcs["sup-2"]
		if len(sup2) != 1 || sup2[0] != "dc-a" {
			t.Errorf("expected [dc-a] for sup-2, got %v", sup2)
		}
	})

	t.Run("restaurant→DCs inverse map", func(t *testing.T) {
		rest1 := dm.RestaurantToDcs["rest-1"]
		if len(rest1) != 1 || rest1[0] != "dc-a" {
			t.Errorf("rest-1 should only have dc-a, got %v", rest1)
		}
	})

	t.Run("ignores inactive routes", func(t *testing.T) {
		// rest-1 should only have dc-a (r8 with dc-b is inactive)
		rest1 := dm.RestaurantToDcs["rest-1"]
		if len(rest1) != 1 {
			t.Errorf("expected 1 DC for rest-1 (inactive excluded), got %d", len(rest1))
		}
	})
}

// ── GetAffectedRoutes ─────────────────────────────────────────────────────

func TestGetAffectedRoutes(t *testing.T) {
	t.Run("empty disabled set", func(t *testing.T) {
		result := GetAffectedRoutes(setOf(), routes)
		if len(result) != 0 {
			t.Errorf("expected 0 affected, got %d", len(result))
		}
	})

	t.Run("supplier disabled affects its routes", func(t *testing.T) {
		affected := GetAffectedRoutes(setOf("sup-1"), routes)
		ids := routeIDs(affected)
		if _, ok := ids["r1"]; !ok {
			t.Error("r1 should be affected")
		}
		if _, ok := ids["r3"]; !ok {
			t.Error("r3 should be affected")
		}
		if _, ok := ids["r2"]; ok {
			t.Error("r2 should not be affected")
		}
	})

	t.Run("DC disabled affects incoming and outgoing", func(t *testing.T) {
		affected := GetAffectedRoutes(setOf("dc-a"), routes)
		ids := routeIDs(affected)
		for _, expected := range []string{"r1", "r2", "r4", "r5"} {
			if _, ok := ids[expected]; !ok {
				t.Errorf("%s should be affected", expected)
			}
		}
	})

	t.Run("compound failures no double-counting", func(t *testing.T) {
		affected := GetAffectedRoutes(setOf("dc-a", "dc-b"), routes)
		if len(affected) != 7 { // all active routes
			t.Errorf("expected 7 affected, got %d", len(affected))
		}
		ids := routeIDs(affected)
		if len(ids) != len(affected) {
			t.Error("duplicate routes detected")
		}
	})

	t.Run("excludes inactive routes", func(t *testing.T) {
		affected := GetAffectedRoutes(setOf("dc-b"), routes)
		ids := routeIDs(affected)
		if _, ok := ids["r8"]; ok {
			t.Error("r8 is inactive and should not appear")
		}
	})
}

// ── GetOrphanedRestaurants ────────────────────────────────────────────────

func TestGetOrphanedRestaurants(t *testing.T) {
	t.Run("empty disabled set", func(t *testing.T) {
		result := GetOrphanedRestaurants(setOf(), routes, locations)
		if len(result) != 0 {
			t.Errorf("expected 0, got %d", len(result))
		}
	})

	t.Run("orphans single-DC restaurant", func(t *testing.T) {
		orphans := GetOrphanedRestaurants(setOf("dc-a"), routes, locations)
		if !containsID(orphans, "rest-1") {
			t.Error("rest-1 should be orphaned")
		}
		if containsID(orphans, "rest-2") {
			t.Error("rest-2 has alternate DC, should not be orphaned")
		}
	})

	t.Run("compound failure orphans all", func(t *testing.T) {
		orphans := GetOrphanedRestaurants(setOf("dc-a", "dc-b"), routes, locations)
		for _, id := range []string{"rest-1", "rest-2", "rest-3"} {
			if !containsID(orphans, id) {
				t.Errorf("%s should be orphaned", id)
			}
		}
	})

	t.Run("sorted alphabetically", func(t *testing.T) {
		orphans := GetOrphanedRestaurants(setOf("dc-a", "dc-b"), routes, locations)
		for i := 1; i < len(orphans); i++ {
			if orphans[i-1].Name > orphans[i].Name {
				t.Errorf("not sorted: %s > %s", orphans[i-1].Name, orphans[i].Name)
			}
		}
	})

	t.Run("disabling supplier does not orphan restaurants", func(t *testing.T) {
		orphans := GetOrphanedRestaurants(setOf("sup-1"), routes, locations)
		if len(orphans) != 0 {
			t.Errorf("expected 0 orphans, got %d", len(orphans))
		}
	})
}

// ── GetPartiallyServedRestaurants ─────────────────────────────────────────

func TestGetPartiallyServedRestaurants(t *testing.T) {
	t.Run("empty disabled set", func(t *testing.T) {
		result := GetPartiallyServedRestaurants(setOf(), routes, locations)
		if len(result) != 0 {
			t.Errorf("expected 0, got %d", len(result))
		}
	})

	t.Run("identifies partially served restaurants", func(t *testing.T) {
		partial := GetPartiallyServedRestaurants(setOf("dc-a"), routes, locations)
		if !containsID(partial, "rest-2") {
			t.Error("rest-2 should be partially served")
		}
	})

	t.Run("excludes single-DC restaurants", func(t *testing.T) {
		partial := GetPartiallyServedRestaurants(setOf("dc-a"), routes, locations)
		if containsID(partial, "rest-1") {
			t.Error("rest-1 is single-DC, should be orphaned not partial")
		}
	})

	t.Run("all DCs disabled means orphaned not partial", func(t *testing.T) {
		partial := GetPartiallyServedRestaurants(setOf("dc-a", "dc-b"), routes, locations)
		if containsID(partial, "rest-2") {
			t.Error("rest-2 with all DCs disabled should be orphaned, not partial")
		}
	})
}

// ── ComputeDisruptionMetrics ──────────────────────────────────────────────

func TestComputeDisruptionMetrics(t *testing.T) {
	t.Run("empty disabled set returns zero impact", func(t *testing.T) {
		m := ComputeDisruptionMetrics(nil, routes, locations)
		if m.DisabledCount != 0 {
			t.Errorf("expected 0 disabled, got %d", m.DisabledCount)
		}
		if m.AffectedRouteCount != 0 {
			t.Errorf("expected 0 affected, got %d", m.AffectedRouteCount)
		}
		if len(m.OrphanedRestaurants) != 0 {
			t.Errorf("expected 0 orphaned, got %d", len(m.OrphanedRestaurants))
		}
	})

	t.Run("single DC disabled", func(t *testing.T) {
		m := ComputeDisruptionMetrics([]string{"dc-a"}, routes, locations)
		if m.DisabledCount != 1 {
			t.Errorf("expected 1, got %d", m.DisabledCount)
		}
		if m.AffectedRouteCount != 4 {
			t.Errorf("expected 4 affected routes, got %d", m.AffectedRouteCount)
		}
		if !containsID(m.OrphanedRestaurants, "rest-1") {
			t.Error("rest-1 should be orphaned")
		}
	})

	t.Run("supplier disabled", func(t *testing.T) {
		m := ComputeDisruptionMetrics([]string{"sup-1"}, routes, locations)
		if m.AffectedRouteCount != 2 {
			t.Errorf("expected 2 affected routes, got %d", m.AffectedRouteCount)
		}
		if len(m.OrphanedRestaurants) != 0 {
			t.Error("no restaurants should be orphaned")
		}
	})

	t.Run("multiple nodes disabled", func(t *testing.T) {
		m := ComputeDisruptionMetrics([]string{"dc-a", "dc-b"}, routes, locations)
		if m.DisabledCount != 2 {
			t.Errorf("expected 2, got %d", m.DisabledCount)
		}
		if len(m.OrphanedRestaurants) != 3 {
			t.Errorf("expected 3 orphaned, got %d", len(m.OrphanedRestaurants))
		}
		if len(m.PartiallyServedRestaurants) != 0 {
			t.Errorf("expected 0 partial (all orphaned), got %d", len(m.PartiallyServedRestaurants))
		}
	})
}
