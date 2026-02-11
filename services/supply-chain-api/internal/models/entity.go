package models

// SelectedSupplier is the entity detail response for a supplier location.
type SelectedSupplier struct {
	Type           string        `json:"type"`
	Location       Location      `json:"location"`
	DCCount        int           `json:"dcCount"`
	OutboundRoutes []SupplyRoute `json:"outboundRoutes"`
	TotalVolume    int           `json:"totalVolume"`
}

// SelectedDC is the entity detail response for a DC location.
type SelectedDC struct {
	Type                string        `json:"type"`
	Location            Location      `json:"location"`
	InboundRoutes       []SupplyRoute `json:"inboundRoutes"`
	OutboundRoutes      []SupplyRoute `json:"outboundRoutes"`
	TotalInboundVolume  int           `json:"totalInboundVolume"`
	TotalOutboundVolume int           `json:"totalOutboundVolume"`
}

// SelectedRestaurant is the entity detail response for a restaurant location.
type SelectedRestaurant struct {
	Type              string        `json:"type"`
	Location          Location      `json:"location"`
	InboundRoutes     []SupplyRoute `json:"inboundRoutes"`
	TotalInboundVolume int          `json:"totalInboundVolume"`
	ServingDCs        []string      `json:"servingDCs"`
}
