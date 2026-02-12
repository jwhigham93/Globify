package models

// RiskLevel classifies supplier concentration risk.
type RiskLevel string

const (
	RiskLevelLow    RiskLevel = "low"
	RiskLevelMedium RiskLevel = "medium"
	RiskLevelHigh   RiskLevel = "high"
)

// SupplierRiskScore captures concentration risk for an individual supplier.
type SupplierRiskScore struct {
	SupplierID  string    `json:"supplierId"`
	Name        string    `json:"name"`
	TotalVolume int       `json:"totalVolume"`
	VolumeShare float64   `json:"volumeShare"`
	RiskScore   float64   `json:"riskScore"`
	RiskLevel   RiskLevel `json:"riskLevel"`
	DCCount     int       `json:"dcCount"`
}

// SupplierBreakdown describes one supplier's volume share within a DC.
type SupplierBreakdown struct {
	SupplierID  string  `json:"supplierId"`
	Name        string  `json:"name"`
	VolumeShare float64 `json:"volumeShare"`
}

// DCDiversificationScore captures supply diversification for a DC.
type DCDiversificationScore struct {
	DCID                 string              `json:"dcId"`
	Name                 string              `json:"name"`
	SupplierCount        int                 `json:"supplierCount"`
	DiversificationScore float64             `json:"diversificationScore"`
	SupplierBreakdown    []SupplierBreakdown `json:"supplierBreakdown"`
}

// RestaurantRiskScore captures risk for a restaurant based on its DC's diversification.
type RestaurantRiskScore struct {
	RestaurantID          string    `json:"restaurantId"`
	Name                  string    `json:"name"`
	ServingDCID           string    `json:"servingDcId"`
	DCDiversificationScore float64  `json:"dcDiversificationScore"`
	RiskScore             float64   `json:"riskScore"`
	RiskLevel             RiskLevel `json:"riskLevel"`
}

// NetworkRiskMetrics aggregates all risk metrics for the network.
type NetworkRiskMetrics struct {
	NetworkDiversificationScore float64                  `json:"networkDiversificationScore"`
	HHI                         float64                  `json:"hhi"`
	SupplierRisks               []SupplierRiskScore      `json:"supplierRisks"`
	DCDiversification           []DCDiversificationScore `json:"dcDiversification"`
	RestaurantRisks             []RestaurantRiskScore    `json:"restaurantRisks"`
}
