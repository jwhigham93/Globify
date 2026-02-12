package disruption

import (
	"sort"

	"github.com/jwhig/jw-dev/services/supply-chain-api/internal/models"
)

// DependencyMap describes the adjacency structure of the supply chain graph.
type DependencyMap struct {
	// DCToRestaurants maps DC id → restaurant ids served by that DC.
	DCToRestaurants map[string][]string
	// SupplierToDcs maps supplier id → DC ids fed by that supplier.
	SupplierToDcs map[string][]string
	// RestaurantToDcs maps restaurant id → DC ids that serve it.
	RestaurantToDcs map[string][]string
}

// BuildDependencyMap constructs adjacency maps from active routes.
func BuildDependencyMap(routes []models.SupplyRoute) DependencyMap {
	dm := DependencyMap{
		DCToRestaurants: make(map[string][]string),
		SupplierToDcs:   make(map[string][]string),
		RestaurantToDcs: make(map[string][]string),
	}

	for _, route := range routes {
		if !route.IsActive {
			continue
		}
		switch route.RouteType {
		case models.RouteTypeDCToRestaurant:
			dm.DCToRestaurants[route.SourceID] = append(dm.DCToRestaurants[route.SourceID], route.DestID)
			dm.RestaurantToDcs[route.DestID] = append(dm.RestaurantToDcs[route.DestID], route.SourceID)
		case models.RouteTypeSupplierToDC:
			dm.SupplierToDcs[route.SourceID] = append(dm.SupplierToDcs[route.SourceID], route.DestID)
		}
	}

	return dm
}

// GetAffectedRoutes returns routes where the source or destination is in the disabled set.
func GetAffectedRoutes(disabledIDs map[string]struct{}, routes []models.SupplyRoute) []models.SupplyRoute {
	if len(disabledIDs) == 0 {
		return []models.SupplyRoute{}
	}

	var affected []models.SupplyRoute
	for _, route := range routes {
		if !route.IsActive {
			continue
		}
		_, srcDisabled := disabledIDs[route.SourceID]
		_, dstDisabled := disabledIDs[route.DestID]
		if srcDisabled || dstDisabled {
			affected = append(affected, route)
		}
	}
	if affected == nil {
		return []models.SupplyRoute{}
	}
	return affected
}

// GetOrphanedRestaurants returns restaurants whose every serving DC is disabled.
func GetOrphanedRestaurants(
	disabledIDs map[string]struct{},
	routes []models.SupplyRoute,
	locations []models.Location,
) []models.Location {
	if len(disabledIDs) == 0 {
		return []models.Location{}
	}

	// Build restaurant → serving DCs from active dc_to_restaurant routes.
	restaurantToDcs := make(map[string][]string)
	for _, route := range routes {
		if !route.IsActive || route.RouteType != models.RouteTypeDCToRestaurant {
			continue
		}
		restaurantToDcs[route.DestID] = append(restaurantToDcs[route.DestID], route.SourceID)
	}

	locationMap := make(map[string]models.Location, len(locations))
	for _, loc := range locations {
		locationMap[loc.ID] = loc
	}

	var orphaned []models.Location
	for restaurantID, servingDCIDs := range restaurantToDcs {
		allDisabled := true
		for _, dcID := range servingDCIDs {
			if _, disabled := disabledIDs[dcID]; !disabled {
				allDisabled = false
				break
			}
		}
		if allDisabled {
			if loc, ok := locationMap[restaurantID]; ok {
				orphaned = append(orphaned, loc)
			}
		}
	}

	sort.Slice(orphaned, func(i, j int) bool {
		return orphaned[i].Name < orphaned[j].Name
	})

	if orphaned == nil {
		return []models.Location{}
	}
	return orphaned
}

// GetPartiallyServedRestaurants returns restaurants that lost some (but not all) serving DCs.
func GetPartiallyServedRestaurants(
	disabledIDs map[string]struct{},
	routes []models.SupplyRoute,
	locations []models.Location,
) []models.Location {
	if len(disabledIDs) == 0 {
		return []models.Location{}
	}

	// Build restaurant → unique serving DCs from active dc_to_restaurant routes.
	restaurantToDcs := make(map[string]map[string]struct{})
	for _, route := range routes {
		if !route.IsActive || route.RouteType != models.RouteTypeDCToRestaurant {
			continue
		}
		if _, ok := restaurantToDcs[route.DestID]; !ok {
			restaurantToDcs[route.DestID] = make(map[string]struct{})
		}
		restaurantToDcs[route.DestID][route.SourceID] = struct{}{}
	}

	locationMap := make(map[string]models.Location, len(locations))
	for _, loc := range locations {
		locationMap[loc.ID] = loc
	}

	var partial []models.Location
	for restaurantID, servingDCs := range restaurantToDcs {
		if len(servingDCs) < 2 {
			continue
		}
		disabledCount := 0
		for dcID := range servingDCs {
			if _, disabled := disabledIDs[dcID]; disabled {
				disabledCount++
			}
		}
		if disabledCount > 0 && disabledCount < len(servingDCs) {
			if loc, ok := locationMap[restaurantID]; ok {
				partial = append(partial, loc)
			}
		}
	}

	sort.Slice(partial, func(i, j int) bool {
		return partial[i].Name < partial[j].Name
	})

	if partial == nil {
		return []models.Location{}
	}
	return partial
}

// ComputeDisruptionMetrics calculates full disruption impact for a set of disabled nodes.
func ComputeDisruptionMetrics(
	disabledIDs []string,
	routes []models.SupplyRoute,
	locations []models.Location,
) models.DisruptionMetrics {
	if len(disabledIDs) == 0 {
		return models.DisruptionMetrics{
			DisabledCount:              0,
			DisabledNodes:              []models.DisabledNode{},
			AffectedRouteCount:         0,
			OrphanedRestaurants:        []models.Location{},
			PartiallyServedRestaurants: []models.Location{},
		}
	}

	locationMap := make(map[string]models.Location, len(locations))
	for _, loc := range locations {
		locationMap[loc.ID] = loc
	}

	disabledSet := make(map[string]struct{}, len(disabledIDs))
	var disabledNodes []models.DisabledNode
	for _, id := range disabledIDs {
		disabledSet[id] = struct{}{}
		if loc, ok := locationMap[id]; ok {
			disabledNodes = append(disabledNodes, models.DisabledNode{
				ID:   loc.ID,
				Name: loc.Name,
				Type: loc.Type,
			})
		}
	}

	affected := GetAffectedRoutes(disabledSet, routes)
	orphaned := GetOrphanedRestaurants(disabledSet, routes, locations)
	partial := GetPartiallyServedRestaurants(disabledSet, routes, locations)

	if disabledNodes == nil {
		disabledNodes = []models.DisabledNode{}
	}

	return models.DisruptionMetrics{
		DisabledCount:              len(disabledNodes),
		DisabledNodes:              disabledNodes,
		AffectedRouteCount:         len(affected),
		OrphanedRestaurants:        orphaned,
		PartiallyServedRestaurants: partial,
	}
}
