package risk

import (
	"math"
	"sort"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/models"
)

// ComputeRestaurantRiskScores calculates risk for each restaurant based on its
// serving DC's diversification. A restaurant served by a poorly-diversified DC
// inherits higher risk.
func ComputeRestaurantRiskScores(
	routes []models.SupplyRoute,
	locations []models.Location,
	dcDiversification []models.DCDiversificationScore,
) []models.RestaurantRiskScore {
	locationMap := make(map[string]models.Location, len(locations))
	for _, loc := range locations {
		locationMap[loc.ID] = loc
	}

	dcDivMap := make(map[string]float64, len(dcDiversification))
	for _, d := range dcDiversification {
		dcDivMap[d.DCID] = d.DiversificationScore
	}

	// Map each restaurant to its highest-volume serving DC.
	restaurantDC := make(map[string]string)
	restaurantDCVolume := make(map[string]int)

	for _, route := range routes {
		if route.RouteType != models.RouteTypeDCToRestaurant {
			continue
		}
		if route.Volume > restaurantDCVolume[route.DestID] {
			restaurantDC[route.DestID] = route.SourceID
			restaurantDCVolume[route.DestID] = route.Volume
		}
	}

	scores := make([]models.RestaurantRiskScore, 0, len(restaurantDC))

	for restaurantID, dcID := range restaurantDC {
		loc := locationMap[restaurantID]
		name := loc.Name
		if name == "" {
			name = restaurantID
		}

		dcDivScore, ok := dcDivMap[dcID]
		if !ok {
			dcDivScore = 50 // default moderate if unknown
		}

		// Invert: low DC diversification → high restaurant risk.
		riskScore := math.Round((100-dcDivScore)*10) / 10

		scores = append(scores, models.RestaurantRiskScore{
			RestaurantID:          restaurantID,
			Name:                  name,
			ServingDCID:           dcID,
			DCDiversificationScore: dcDivScore,
			RiskScore:             riskScore,
			RiskLevel:             ClassifyRiskLevel(riskScore),
		})
	}

	// Sort by risk score descending (highest risk first).
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].RiskScore > scores[j].RiskScore
	})

	return scores
}
