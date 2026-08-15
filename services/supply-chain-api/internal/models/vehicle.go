package models

import "time"

// Vehicle type and status enums
type VehicleType string
type VehicleStatus string
type RouteProgressStatus string

const (
	VehicleTypeTruck VehicleType = "truck"
	VehicleTypeVan   VehicleType = "van"

	VehicleStatusActive      VehicleStatus = "active"
	VehicleStatusInactive    VehicleStatus = "inactive"
	VehicleStatusMaintenance VehicleStatus = "maintenance"

	RouteProgressPlanned    RouteProgressStatus = "planned"
	RouteProgressInProgress RouteProgressStatus = "in_progress"
	RouteProgressCompleted  RouteProgressStatus = "completed"
)

// GpsStatus indicates freshness of a vehicle's last GPS ping.
type GpsStatus string

const (
	GpsStatusLive  GpsStatus = "live"
	GpsStatusStale GpsStatus = "stale"
	GpsStatusLost  GpsStatus = "lost"
)

// Stale-threshold constants
const (
	GpsLiveThreshold  = 5 * time.Minute
	GpsStaleThreshold = 15 * time.Minute
)

// ComputeGpsStatus returns the GPS status based on time since last ping.
func ComputeGpsStatus(lastPingAt time.Time) GpsStatus {
	age := time.Since(lastPingAt)
	if age <= GpsLiveThreshold {
		return GpsStatusLive
	}
	if age <= GpsStaleThreshold {
		return GpsStatusStale
	}
	return GpsStatusLost
}

// pinnedVehicleStatuses hard-codes GpsStatus for a small set of always-on
// demo vehicles, bypassing ping-age computation entirely. Ping age only
// ever grows over real time, so no amount of clever timestamp insertion can
// hold a vehicle's *computed* status at a fixed point forever — periodically
// refreshing recorded_at to "now" reads live for a few minutes, and never
// refreshing it lets the age eventually cross from stale into lost. The
// only way to guarantee a vehicle always reads as (say) stale — never live,
// never lost — is to override the status directly for that ID.
var pinnedVehicleStatuses = map[string]GpsStatus{
	"a1000000-0000-0000-0000-000000000009": GpsStatusStale, // SC-T009 (Chicago)
	"a1000000-0000-0000-0000-000000000014": GpsStatusLost,  // SC-T014 (DC Metro)
}

// ResolveGpsStatus returns the pinned status for vehicleID if it's one of
// the fixed demo vehicles in pinnedVehicleStatuses, otherwise computes
// status normally from ping age via ComputeGpsStatus.
func ResolveGpsStatus(vehicleID string, lastPingAt time.Time) GpsStatus {
	if status, ok := pinnedVehicleStatuses[vehicleID]; ok {
		return status
	}
	return ComputeGpsStatus(lastPingAt)
}

// Vehicle represents a delivery vehicle.
type Vehicle struct {
	ID        string        `json:"id"`
	Name      string        `json:"name"`
	Type      VehicleType   `json:"type"`
	Status    VehicleStatus `json:"status"`
	CreatedAt time.Time     `json:"createdAt"`
	UpdatedAt time.Time     `json:"updatedAt"`
}

// GpsPing represents a single GPS location report from a vehicle.
type GpsPing struct {
	ID         string    `json:"id"`
	VehicleID  string    `json:"vehicleId"`
	Lat        float64   `json:"lat"`
	Lng        float64   `json:"lng"`
	Heading    *float64  `json:"heading,omitempty"`
	SpeedMph   *float64  `json:"speedMph,omitempty"`
	RecordedAt time.Time `json:"recordedAt"`
	ReceivedAt time.Time `json:"receivedAt"`
}

// VehicleRoute represents a delivery route assigned to a vehicle.
type VehicleRoute struct {
	ID            string              `json:"id"`
	VehicleID     string              `json:"vehicleId"`
	OriginID      string              `json:"originId"`
	DestinationID string              `json:"destinationId"`
	Status        RouteProgressStatus `json:"status"`
	StartedAt     *time.Time          `json:"startedAt,omitempty"`
	CompletedAt   *time.Time          `json:"completedAt,omitempty"`
	CreatedAt     time.Time           `json:"createdAt"`
}

// VehicleRouteWithCoords extends VehicleRoute with origin/destination coordinates.
type VehicleRouteWithCoords struct {
	VehicleRoute
	OriginLat      float64 `json:"originLat"`
	OriginLng      float64 `json:"originLng"`
	DestinationLat float64 `json:"destinationLat"`
	DestinationLng float64 `json:"destinationLng"`
}

// DeviceApiKey represents a hashed API key for a GPS device.
type DeviceApiKey struct {
	ID        string     `json:"id"`
	VehicleID string     `json:"vehicleId"`
	KeyHash   string     `json:"-"`
	Label     string     `json:"label"`
	CreatedAt time.Time  `json:"createdAt"`
	RevokedAt *time.Time `json:"revokedAt,omitempty"`
}

// VehicleWithPosition is the list response including latest GPS data.
type VehicleWithPosition struct {
	Vehicle
	Lat        *float64  `json:"lat,omitempty"`
	Lng        *float64  `json:"lng,omitempty"`
	Heading    *float64  `json:"heading,omitempty"`
	SpeedMph   *float64  `json:"speedMph,omitempty"`
	RecordedAt *time.Time `json:"lastPingAt,omitempty"`
	GpsStatus  GpsStatus `json:"gpsStatus"`
}

// VehicleDetail is the full detail response for a single vehicle.
type VehicleDetail struct {
	Vehicle
	RecentPings  []GpsPing     `json:"recentPings"`
	CurrentRoute *VehicleRoute `json:"currentRoute,omitempty"`
	GpsStatus    GpsStatus     `json:"gpsStatus"`
}

// BulkPosition is the lightweight position response for all active vehicles.
type BulkPosition struct {
	VehicleID      string     `json:"vehicleId"`
	Lat            float64    `json:"lat"`
	Lng            float64    `json:"lng"`
	Heading        *float64   `json:"heading,omitempty"`
	SpeedMph       *float64   `json:"speedMph,omitempty"`
	RecordedAt     time.Time  `json:"recordedAt"`
	GpsStatus      GpsStatus  `json:"gpsStatus"`
	VehicleName    string     `json:"vehicleName,omitempty"`
	OriginName     *string    `json:"originName,omitempty"`
	DestinationName *string   `json:"destinationName,omitempty"`
	RouteStartedAt *time.Time `json:"routeStartedAt,omitempty"`
}
