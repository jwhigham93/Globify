## ADDED Requirements

### Requirement: GpsStreamService
The system SHALL provide a client-side service for managing the WebSocket connection to the GPS streaming endpoint.

#### Scenario: Service connects and receives position updates
- **WHEN** `GpsStreamService.connect(wsUrl, jwtToken)` is called
- **THEN** a WebSocket connection is established
- **AND** incoming `position_update` messages trigger the `onPositionUpdate` callback

#### Scenario: Exponential backoff reconnection on disconnect
- **WHEN** the WebSocket connection is lost
- **THEN** the service attempts to reconnect with delays of 1s, 2s, 4s, 8s, 16s, 30s (max)
- **AND** after a stable connection (> 30 seconds), the backoff resets to 1s

#### Scenario: Connection state changes are emitted
- **WHEN** the WebSocket connection state changes (connecting, connected, disconnected, reconnecting)
- **THEN** the `onConnectionStateChange` callback is invoked with the new state

#### Scenario: Service disconnect stops reconnection
- **WHEN** `GpsStreamService.disconnect()` is called
- **THEN** the WebSocket is closed and no reconnection attempts are made

#### Scenario: Stale pings are discarded
- **WHEN** a `position_update` message arrives with a `recordedAt` older than the client's current known position for that vehicle
- **THEN** the update is discarded

### Requirement: useVehiclePositions React Hook
The system SHALL provide a React hook that returns live vehicle positions updated via the GPS stream.

#### Scenario: Initial load via REST then WebSocket
- **WHEN** the hook mounts
- **THEN** it fetches all current positions via `GET /vehicles/positions` (REST)
- **AND** opens a WebSocket connection for live deltas
- **AND** returns a `Map<vehicleId, VehiclePosition>` reflecting the combined state

#### Scenario: Live updates reflected in returned map
- **WHEN** a `position_update` message arrives via WebSocket
- **THEN** the hook updates the corresponding entry in the returned map
- **AND** the component re-renders with the new position

#### Scenario: Status changes reflected in returned map
- **WHEN** a `status_change` message arrives via WebSocket
- **THEN** the corresponding vehicle's `gpsStatus` is updated in the returned map

#### Scenario: Hook cleanup on unmount
- **WHEN** the component using the hook unmounts
- **THEN** the WebSocket connection is closed via `GpsStreamService.disconnect()`

### Requirement: Position Interpolation Helper
The system SHALL provide a helper to smooth vehicle movement between GPS updates.

#### Scenario: Position interpolated between pings
- **WHEN** two consecutive position updates are known for a vehicle
- **THEN** `interpolatePosition(prevPos, currentPos, elapsedMs)` returns a lat/lng between the two positions proportional to the elapsed time
- **AND** the interpolation uses linear interpolation (lerp) for both lat and lng

#### Scenario: No interpolation when only one position is known
- **WHEN** only one position update is known for a vehicle
- **THEN** `interpolatePosition` returns that position unchanged
