package risk

import (
	"math"
	"sort"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/models"
)

// ComputeDCDiversification calculates the diversification score for each DC
// using normalized Shannon entropy: H = (-Σ(p·ln(p))) / ln(n) × 100.
func ComputeDCDiversification(routes []models.SupplyRoute, locations []models.Location) []models.DCDiversificationScore {
	locationMap := make(map[string]models.Location, len(locations))
	for _, loc := range locations {
		locationMap[loc.ID] = loc
	}

	// Group supplier volumes by DC (destination).
	dcSupplierVolumes := make(map[string]map[string]int)

	for _, route := range routes {
		if route.RouteType != models.RouteTypeSupplierToDC {
			continue
		}
		if _, ok := dcSupplierVolumes[route.DestID]; !ok {
			dcSupplierVolumes[route.DestID] = make(map[string]int)
		}
		dcSupplierVolumes[route.DestID][route.SourceID] += route.Volume
	}

	scores := make([]models.DCDiversificationScore, 0, len(dcSupplierVolumes))

	for dcID, supplierMap := range dcSupplierVolumes {
		loc := locationMap[dcID]
		name := loc.Name
		if name == "" {
			name = dcID
		}

		supplierCount := len(supplierMap)
		totalVolume := 0
		for _, v := range supplierMap {
			totalVolume += v
		}

		// Build supplier breakdown.
		breakdown := make([]models.SupplierBreakdown, 0, supplierCount)
		for supplierID, volume := range supplierMap {
			sLoc := locationMap[supplierID]
			sName := sLoc.Name
			if sName == "" {
				sName = supplierID
			}
			var volumeShare float64
			if totalVolume > 0 {
				volumeShare = float64(volume) / float64(totalVolume) * 100
			}
			breakdown = append(breakdown, models.SupplierBreakdown{
				SupplierID:  supplierID,
				Name:        sName,
				VolumeShare: volumeShare,
			})
		}
		// Sort breakdown by volume share descending.
		sort.Slice(breakdown, func(i, j int) bool {
			return breakdown[i].VolumeShare > breakdown[j].VolumeShare
		})

		// Compute normalized Shannon entropy.
		var diversificationScore float64
		if supplierCount <= 1 {
			diversificationScore = 0
		} else {
			var entropy float64
			for _, b := range breakdown {
				p := b.VolumeShare / 100
				if p > 0 {
					entropy -= p * math.Log(p)
				}
			}
			maxEntropy := math.Log(float64(supplierCount))
			if maxEntropy > 0 {
				diversificationScore = (entropy / maxEntropy) * 100
			}
		}

		scores = append(scores, models.DCDiversificationScore{
			DCID:                 dcID,
			Name:                 name,
			SupplierCount:        supplierCount,
			DiversificationScore: math.Round(diversificationScore*10) / 10,
			SupplierBreakdown:    breakdown,
		})
	}

	// Sort by diversification score ascending (least diversified first).
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].DiversificationScore < scores[j].DiversificationScore
	})

	return scores
}
