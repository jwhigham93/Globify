package risk

import (
	"math"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/models"
)

// ComputeNetworkHHI calculates the Herfindahl-Hirschman Index from supplier
// risk scores. HHI = Σ(market_share)² where market_share is in decimal (0-1).
func ComputeNetworkHHI(supplierRisks []models.SupplierRiskScore) float64 {
	if len(supplierRisks) == 0 {
		return 0
	}
	var hhi float64
	for _, s := range supplierRisks {
		share := s.VolumeShare / 100
		hhi += share * share
	}
	return hhi
}

// ComputeNetworkRiskMetrics computes all network risk metrics in one call.
func ComputeNetworkRiskMetrics(routes []models.SupplyRoute, locations []models.Location) models.NetworkRiskMetrics {
	supplierRisks := ComputeSupplierRiskScores(routes, locations)
	dcDiversification := ComputeDCDiversification(routes, locations)
	restaurantRisks := ComputeRestaurantRiskScores(routes, locations, dcDiversification)
	hhi := ComputeNetworkHHI(supplierRisks)
	networkDiversificationScore := math.Round((1-hhi)*100*10) / 10

	return models.NetworkRiskMetrics{
		NetworkDiversificationScore: networkDiversificationScore,
		HHI:                         math.Round(hhi*10000) / 10000,
		SupplierRisks:               supplierRisks,
		DCDiversification:           dcDiversification,
		RestaurantRisks:             restaurantRisks,
	}
}
