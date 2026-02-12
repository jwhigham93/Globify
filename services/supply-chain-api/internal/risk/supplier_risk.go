package risk

import (
	"sort"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/models"
)

// Risk level thresholds (volume share percentage).
const (
	riskThresholdLow    = 20.0
	riskThresholdMedium = 35.0
)

// ClassifyRiskLevel maps a volume share percentage to a risk level.
func ClassifyRiskLevel(volumeShare float64) models.RiskLevel {
	switch {
	case volumeShare >= riskThresholdMedium:
		return models.RiskLevelHigh
	case volumeShare >= riskThresholdLow:
		return models.RiskLevelMedium
	default:
		return models.RiskLevelLow
	}
}

// ComputeSupplierRiskScores calculates concentration risk for each supplier.
// Risk score = supplier volume as a percentage of total network inbound DC volume.
func ComputeSupplierRiskScores(routes []models.SupplyRoute, locations []models.Location) []models.SupplierRiskScore {
	locationMap := make(map[string]models.Location, len(locations))
	for _, loc := range locations {
		locationMap[loc.ID] = loc
	}

	// Aggregate volume per supplier and track distinct DCs.
	supplierVolumes := make(map[string]int)
	supplierDCs := make(map[string]map[string]struct{})

	for _, route := range routes {
		if route.RouteType != models.RouteTypeSupplierToDC {
			continue
		}
		supplierVolumes[route.SourceID] += route.Volume
		if _, ok := supplierDCs[route.SourceID]; !ok {
			supplierDCs[route.SourceID] = make(map[string]struct{})
		}
		supplierDCs[route.SourceID][route.DestID] = struct{}{}
	}

	totalVolume := 0
	for _, v := range supplierVolumes {
		totalVolume += v
	}
	if totalVolume == 0 {
		return []models.SupplierRiskScore{}
	}

	scores := make([]models.SupplierRiskScore, 0, len(supplierVolumes))
	for supplierID, volume := range supplierVolumes {
		loc := locationMap[supplierID]
		name := loc.Name
		if name == "" {
			name = supplierID
		}
		volumeShare := float64(volume) / float64(totalVolume) * 100

		scores = append(scores, models.SupplierRiskScore{
			SupplierID:  supplierID,
			Name:        name,
			TotalVolume: volume,
			VolumeShare: volumeShare,
			RiskScore:   volumeShare,
			RiskLevel:   ClassifyRiskLevel(volumeShare),
			DCCount:     len(supplierDCs[supplierID]),
		})
	}

	// Sort by risk score descending (highest risk first).
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].RiskScore > scores[j].RiskScore
	})

	return scores
}
