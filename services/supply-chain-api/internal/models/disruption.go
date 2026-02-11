package models

// DisabledNode describes a node removed from the network during disruption simulation.
type DisabledNode struct {
	ID   string       `json:"id"`
	Name string       `json:"name"`
	Type LocationType `json:"type"`
}

// DisruptionMetrics describes the impact of disabling a set of nodes.
type DisruptionMetrics struct {
	DisabledCount              int        `json:"disabledCount"`
	DisabledNodes              []DisabledNode `json:"disabledNodes"`
	AffectedRouteCount         int        `json:"affectedRouteCount"`
	OrphanedRestaurants        []Location `json:"orphanedRestaurants"`
	PartiallyServedRestaurants []Location `json:"partiallyServedRestaurants"`
}

// DisruptionRequest is the POST body for the disruption simulation endpoint.
type DisruptionRequest struct {
	DisabledIDs []string `json:"disabledIds"`
}
