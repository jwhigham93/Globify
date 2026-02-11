package risk

import (
	"testing"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/models"
)

// ── Test fixtures ────────────────────────────────────────────────────────

var mockLocations = []models.Location{
	{ID: "sup-a", Name: "Supplier A", Lat: 30, Lng: -90, Type: models.LocationTypeSupplier},
	{ID: "sup-b", Name: "Supplier B", Lat: 35, Lng: -85, Type: models.LocationTypeSupplier},
	{ID: "sup-c", Name: "Supplier C", Lat: 40, Lng: -80, Type: models.LocationTypeSupplier},
	{ID: "dc-1", Name: "DC One", Lat: 33, Lng: -84, Type: models.LocationTypeDC},
	{ID: "dc-2", Name: "DC Two", Lat: 41, Lng: -88, Type: models.LocationTypeDC},
	{ID: "rest-1", Name: "Restaurant 1", Lat: 34, Lng: -84, Type: models.LocationTypeRestaurant},
}

var balancedRoutes = []models.SupplyRoute{
	{ID: "r1", SourceID: "sup-a", DestID: "dc-1", RouteType: models.RouteTypeSupplierToDC, Volume: 1000, IsActive: true},
	{ID: "r2", SourceID: "sup-b", DestID: "dc-1", RouteType: models.RouteTypeSupplierToDC, Volume: 1000, IsActive: true},
	{ID: "r3", SourceID: "sup-c", DestID: "dc-2", RouteType: models.RouteTypeSupplierToDC, Volume: 1000, IsActive: true},
	{ID: "r4", SourceID: "dc-1", DestID: "rest-1", RouteType: models.RouteTypeDCToRestaurant, Volume: 500, IsActive: true},
}

var dominantRoutes = []models.SupplyRoute{
	{ID: "r1", SourceID: "sup-a", DestID: "dc-1", RouteType: models.RouteTypeSupplierToDC, Volume: 8000, IsActive: true},
	{ID: "r2", SourceID: "sup-b", DestID: "dc-1", RouteType: models.RouteTypeSupplierToDC, Volume: 1000, IsActive: true},
	{ID: "r3", SourceID: "sup-c", DestID: "dc-2", RouteType: models.RouteTypeSupplierToDC, Volume: 1000, IsActive: true},
}

// ── ClassifyRiskLevel ────────────────────────────────────────────────────

func TestClassifyRiskLevel(t *testing.T) {
	tests := []struct {
		name        string
		volumeShare float64
		want        models.RiskLevel
	}{
		{"zero is low", 0, models.RiskLevelLow},
		{"10 is low", 10, models.RiskLevelLow},
		{"19.9 is low", 19.9, models.RiskLevelLow},
		{"20 is medium", 20, models.RiskLevelMedium},
		{"25 is medium", 25, models.RiskLevelMedium},
		{"34.9 is medium", 34.9, models.RiskLevelMedium},
		{"35 is high", 35, models.RiskLevelHigh},
		{"50 is high", 50, models.RiskLevelHigh},
		{"100 is high", 100, models.RiskLevelHigh},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ClassifyRiskLevel(tt.volumeShare)
			if got != tt.want {
				t.Errorf("ClassifyRiskLevel(%v) = %v, want %v", tt.volumeShare, got, tt.want)
			}
		})
	}
}

// ── ComputeSupplierRiskScores ────────────────────────────────────────────

func TestComputeSupplierRiskScores(t *testing.T) {
	t.Run("balanced suppliers have equal volume shares", func(t *testing.T) {
		scores := ComputeSupplierRiskScores(balancedRoutes, mockLocations)
		if len(scores) != 3 {
			t.Fatalf("expected 3 scores, got %d", len(scores))
		}
		for _, s := range scores {
			if diff := s.VolumeShare - 33.33; diff > 1 || diff < -1 {
				t.Errorf("expected ~33.33%% share, got %.2f%%", s.VolumeShare)
			}
			if s.RiskLevel != models.RiskLevelMedium {
				t.Errorf("expected medium risk, got %v", s.RiskLevel)
			}
		}
	})

	t.Run("identifies dominant supplier as high risk", func(t *testing.T) {
		scores := ComputeSupplierRiskScores(dominantRoutes, mockLocations)
		var dominant *models.SupplierRiskScore
		for i := range scores {
			if scores[i].SupplierID == "sup-a" {
				dominant = &scores[i]
				break
			}
		}
		if dominant == nil {
			t.Fatal("sup-a not found in scores")
		}
		if dominant.RiskScore != 80 {
			t.Errorf("expected risk score 80, got %.2f", dominant.RiskScore)
		}
		if dominant.RiskLevel != models.RiskLevelHigh {
			t.Errorf("expected high risk, got %v", dominant.RiskLevel)
		}
		if dominant.TotalVolume != 8000 {
			t.Errorf("expected total volume 8000, got %d", dominant.TotalVolume)
		}
		if dominant.DCCount != 1 {
			t.Errorf("expected 1 DC, got %d", dominant.DCCount)
		}
	})

	t.Run("counts DCs served per supplier", func(t *testing.T) {
		multiDcRoutes := []models.SupplyRoute{
			{ID: "r1", SourceID: "sup-a", DestID: "dc-1", RouteType: models.RouteTypeSupplierToDC, Volume: 1000, IsActive: true},
			{ID: "r2", SourceID: "sup-a", DestID: "dc-2", RouteType: models.RouteTypeSupplierToDC, Volume: 1000, IsActive: true},
		}
		scores := ComputeSupplierRiskScores(multiDcRoutes, mockLocations)
		if scores[0].DCCount != 2 {
			t.Errorf("expected 2 DCs, got %d", scores[0].DCCount)
		}
	})

	t.Run("sorted by risk score descending", func(t *testing.T) {
		scores := ComputeSupplierRiskScores(dominantRoutes, mockLocations)
		for i := 1; i < len(scores); i++ {
			if scores[i-1].RiskScore < scores[i].RiskScore {
				t.Errorf("scores not sorted descending at index %d", i)
			}
		}
	})

	t.Run("returns empty for no supplier routes", func(t *testing.T) {
		dcRoutes := []models.SupplyRoute{
			{ID: "r1", SourceID: "dc-1", DestID: "rest-1", RouteType: models.RouteTypeDCToRestaurant, Volume: 500, IsActive: true},
		}
		scores := ComputeSupplierRiskScores(dcRoutes, mockLocations)
		if len(scores) != 0 {
			t.Errorf("expected 0 scores, got %d", len(scores))
		}
	})
}

// ── ComputeDCDiversification ─────────────────────────────────────────────

func TestComputeDCDiversification(t *testing.T) {
	t.Run("single-supplier DC gets score 0", func(t *testing.T) {
		singleRoutes := []models.SupplyRoute{
			{ID: "r1", SourceID: "sup-a", DestID: "dc-2", RouteType: models.RouteTypeSupplierToDC, Volume: 3000, IsActive: true},
		}
		scores := ComputeDCDiversification(singleRoutes, mockLocations)
		var dc2 *models.DCDiversificationScore
		for i := range scores {
			if scores[i].DCID == "dc-2" {
				dc2 = &scores[i]
				break
			}
		}
		if dc2 == nil {
			t.Fatal("dc-2 not found")
		}
		if dc2.DiversificationScore != 0 {
			t.Errorf("expected 0, got %.1f", dc2.DiversificationScore)
		}
		if dc2.SupplierCount != 1 {
			t.Errorf("expected 1 supplier, got %d", dc2.SupplierCount)
		}
	})

	t.Run("evenly distributed DC gets score 100", func(t *testing.T) {
		evenRoutes := []models.SupplyRoute{
			{ID: "r1", SourceID: "sup-a", DestID: "dc-1", RouteType: models.RouteTypeSupplierToDC, Volume: 1000, IsActive: true},
			{ID: "r2", SourceID: "sup-b", DestID: "dc-1", RouteType: models.RouteTypeSupplierToDC, Volume: 1000, IsActive: true},
			{ID: "r3", SourceID: "sup-c", DestID: "dc-1", RouteType: models.RouteTypeSupplierToDC, Volume: 1000, IsActive: true},
		}
		scores := ComputeDCDiversification(evenRoutes, mockLocations)
		var dc1 *models.DCDiversificationScore
		for i := range scores {
			if scores[i].DCID == "dc-1" {
				dc1 = &scores[i]
				break
			}
		}
		if dc1 == nil {
			t.Fatal("dc-1 not found")
		}
		if dc1.DiversificationScore != 100 {
			t.Errorf("expected 100, got %.1f", dc1.DiversificationScore)
		}
		if dc1.SupplierCount != 3 {
			t.Errorf("expected 3 suppliers, got %d", dc1.SupplierCount)
		}
	})

	t.Run("dominated DC gets low score", func(t *testing.T) {
		unevenRoutes := []models.SupplyRoute{
			{ID: "r1", SourceID: "sup-a", DestID: "dc-1", RouteType: models.RouteTypeSupplierToDC, Volume: 9000, IsActive: true},
			{ID: "r2", SourceID: "sup-b", DestID: "dc-1", RouteType: models.RouteTypeSupplierToDC, Volume: 500, IsActive: true},
			{ID: "r3", SourceID: "sup-c", DestID: "dc-1", RouteType: models.RouteTypeSupplierToDC, Volume: 500, IsActive: true},
		}
		scores := ComputeDCDiversification(unevenRoutes, mockLocations)
		var dc1 *models.DCDiversificationScore
		for i := range scores {
			if scores[i].DCID == "dc-1" {
				dc1 = &scores[i]
				break
			}
		}
		if dc1 == nil {
			t.Fatal("dc-1 not found")
		}
		if dc1.DiversificationScore >= 50 {
			t.Errorf("expected < 50, got %.1f", dc1.DiversificationScore)
		}
	})

	t.Run("supplier breakdown sorted by volume share", func(t *testing.T) {
		scores := ComputeDCDiversification(balancedRoutes, mockLocations)
		var dc1 *models.DCDiversificationScore
		for i := range scores {
			if scores[i].DCID == "dc-1" {
				dc1 = &scores[i]
				break
			}
		}
		if dc1 == nil {
			t.Fatal("dc-1 not found")
		}
		if len(dc1.SupplierBreakdown) != 2 {
			t.Fatalf("expected 2 suppliers, got %d", len(dc1.SupplierBreakdown))
		}
		if dc1.SupplierBreakdown[0].VolumeShare < dc1.SupplierBreakdown[1].VolumeShare {
			t.Error("breakdown not sorted by volume share descending")
		}
	})
}

// ── ComputeNetworkHHI ────────────────────────────────────────────────────

func TestComputeNetworkHHI(t *testing.T) {
	tests := []struct {
		name     string
		routes   []models.SupplyRoute
		wantApprox float64
		tolerance  float64
	}{
		{
			name:       "balanced suppliers ~0.333",
			routes:     balancedRoutes,
			wantApprox: 0.333,
			tolerance:  0.01,
		},
		{
			name:       "dominant supplier ~0.66",
			routes:     dominantRoutes,
			wantApprox: 0.66,
			tolerance:  0.01,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			scores := ComputeSupplierRiskScores(tt.routes, mockLocations)
			hhi := ComputeNetworkHHI(scores)
			if diff := hhi - tt.wantApprox; diff > tt.tolerance || diff < -tt.tolerance {
				t.Errorf("HHI = %.4f, want ~%.3f (±%.3f)", hhi, tt.wantApprox, tt.tolerance)
			}
		})
	}

	t.Run("empty scores returns 0", func(t *testing.T) {
		hhi := ComputeNetworkHHI(nil)
		if hhi != 0 {
			t.Errorf("expected 0, got %f", hhi)
		}
	})
}

// ── ComputeNetworkRiskMetrics ────────────────────────────────────────────

func TestComputeNetworkRiskMetrics(t *testing.T) {
	t.Run("returns complete metrics", func(t *testing.T) {
		metrics := ComputeNetworkRiskMetrics(balancedRoutes, mockLocations)
		if len(metrics.SupplierRisks) != 3 {
			t.Errorf("expected 3 supplier risks, got %d", len(metrics.SupplierRisks))
		}
		if metrics.HHI == 0 {
			t.Error("HHI should not be 0 for non-empty routes")
		}
	})

	t.Run("balanced network has high diversification", func(t *testing.T) {
		metrics := ComputeNetworkRiskMetrics(balancedRoutes, mockLocations)
		if metrics.NetworkDiversificationScore <= 60 {
			t.Errorf("expected > 60, got %.1f", metrics.NetworkDiversificationScore)
		}
	})

	t.Run("concentrated network has low diversification", func(t *testing.T) {
		metrics := ComputeNetworkRiskMetrics(dominantRoutes, mockLocations)
		if metrics.NetworkDiversificationScore >= 40 {
			t.Errorf("expected < 40, got %.1f", metrics.NetworkDiversificationScore)
		}
	})
}
