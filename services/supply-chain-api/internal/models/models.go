package models

// LocationType represents the type of supply chain location.
type LocationType string

const (
	LocationTypeSupplier   LocationType = "supplier"
	LocationTypeDC         LocationType = "dc"
	LocationTypeRestaurant LocationType = "restaurant"
)

// RouteType represents the type of supply chain route.
type RouteType string

const (
	RouteTypeSupplierToDC    RouteType = "supplier_to_dc"
	RouteTypeDCToRestaurant  RouteType = "dc_to_restaurant"
)

// Location represents a node in the supply chain network.
type Location struct {
	ID   string       `json:"id"`
	Name string       `json:"name"`
	Lat  float64      `json:"lat"`
	Lng  float64      `json:"lng"`
	Type LocationType `json:"type"`
}

// SupplyRoute represents an edge in the supply chain network.
type SupplyRoute struct {
	ID        string    `json:"id"`
	SourceID  string    `json:"sourceId"`
	DestID    string    `json:"destId"`
	RouteType RouteType `json:"routeType"`
	Volume    int       `json:"volume"`
	IsActive  bool      `json:"isActive"`
}

// VisualizationData bundles all data needed for the globe visualization.
type VisualizationData struct {
	Locations []Location    `json:"locations"`
	Routes    []SupplyRoute `json:"routes"`
}
