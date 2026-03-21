## ADDED Requirements

### Requirement: Ingest GPS Ping
The system SHALL accept GPS pings from devices via a REST endpoint.

#### Scenario: Valid GPS ping is accepted
- **WHEN** a POST request is sent to `/api/v1/vehicles/{id}/gps` with valid `X-Device-API-Key` header and body `{ lat, lng, heading, speed_mph, recorded_at }`
- **THEN** the ping is stored in the `gps_pings` table with status 201

#### Scenario: Invalid lat/lng is rejected
- **WHEN** a POST request contains `lat` outside range [-90, 90] or `lng` outside range [-180, 180]
- **THEN** the request is rejected with status 400 and a descriptive error message

#### Scenario: Missing API key is rejected
- **WHEN** a POST request is sent without an `X-Device-API-Key` header
- **THEN** the request is rejected with status 401

#### Scenario: Invalid API key is rejected
- **WHEN** a POST request contains an `X-Device-API-Key` that does not match any active key
- **THEN** the request is rejected with status 401

#### Scenario: Duplicate ping is silently ignored
- **WHEN** a POST request contains a ping with the same `vehicle_id` and `recorded_at` as an existing record
- **THEN** the request returns status 201 (idempotent) without creating a duplicate

### Requirement: List Vehicles with Latest Position
The system SHALL return a list of vehicles with their latest known position and stale status.

#### Scenario: All active vehicles returned with positions
- **WHEN** a GET request is sent to `/api/v1/vehicles`
- **THEN** the response contains all vehicles with fields: `id`, `name`, `type`, `status`, `latestPosition` (lat, lng, heading, speed_mph, recorded_at), and `gpsStatus` (live, stale, or lost)

#### Scenario: GPS status is live
- **WHEN** a vehicle's latest ping `received_at` is less than 5 minutes ago
- **THEN** the vehicle's `gpsStatus` is `live`

#### Scenario: GPS status is stale
- **WHEN** a vehicle's latest ping `received_at` is between 5 and 15 minutes ago
- **THEN** the vehicle's `gpsStatus` is `stale`

#### Scenario: GPS status is lost
- **WHEN** a vehicle's latest ping `received_at` is more than 15 minutes ago OR the vehicle has no pings
- **THEN** the vehicle's `gpsStatus` is `lost`

#### Scenario: Filter vehicles by type
- **WHEN** a GET request is sent to `/api/v1/vehicles?type=truck`
- **THEN** only vehicles with type `truck` are returned

### Requirement: Get Single Vehicle Detail
The system SHALL return detailed information for a single vehicle.

#### Scenario: Vehicle detail with position history
- **WHEN** a GET request is sent to `/api/v1/vehicles/{id}`
- **THEN** the response contains vehicle metadata, the latest 50 GPS pings (most recent first), current route (if any), and `gpsStatus`

#### Scenario: Vehicle not found
- **WHEN** a GET request is sent to `/api/v1/vehicles/{id}` for a non-existent ID
- **THEN** the response is status 404

### Requirement: Get Vehicle Route
The system SHALL return the current route for a vehicle.

#### Scenario: Active route returned
- **WHEN** a GET request is sent to `/api/v1/vehicles/{id}/route` and the vehicle has an in-progress route
- **THEN** the response contains the route with origin/destination locations, waypoints, and status

#### Scenario: No active route
- **WHEN** a GET request is sent to `/api/v1/vehicles/{id}/route` and the vehicle has no in-progress route
- **THEN** the response is status 404

### Requirement: Bulk Latest Positions
The system SHALL return the latest position for all active vehicles in a single request.

#### Scenario: All active vehicle positions returned
- **WHEN** a GET request is sent to `/api/v1/vehicles/positions`
- **THEN** the response contains an array of `{ vehicle_id, lat, lng, heading, speed_mph, recorded_at, gpsStatus }` for all active vehicles with at least one ping

#### Scenario: Vehicles with no pings are excluded
- **WHEN** a GET request is sent to `/api/v1/vehicles/positions`
- **THEN** vehicles with no GPS pings are excluded from the response
