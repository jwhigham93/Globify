## ADDED Requirements

### Requirement: WebSocket Endpoint
The system SHALL provide a WebSocket endpoint for streaming vehicle position updates to connected clients.

#### Scenario: Successful WebSocket connection with valid JWT
- **WHEN** a client sends a GET request to `/api/v1/vehicles/stream?token=<valid-jwt>`
- **THEN** the server upgrades the connection to WebSocket and registers the client with the hub

#### Scenario: Connection rejected with invalid JWT
- **WHEN** a client sends a GET request to `/api/v1/vehicles/stream?token=<invalid-jwt>`
- **THEN** the server returns 401 Unauthorized without upgrading

#### Scenario: Connection rejected with missing token
- **WHEN** a client sends a GET request to `/api/v1/vehicles/stream` without a `token` query parameter
- **THEN** the server returns 401 Unauthorized

### Requirement: Hub Broadcasts Position Updates
The system SHALL broadcast GPS position updates to all connected WebSocket clients when a new ping is ingested.

#### Scenario: Position update broadcast on ping ingestion
- **WHEN** a GPS ping is ingested via `POST /api/v1/vehicles/{id}/gps`
- **THEN** a `position_update` message is sent to all connected WebSocket clients within 500 ms
- **AND** the message contains `vehicleId`, `lat`, `lng`, `heading`, `speedMph`, `recordedAt`, and `gpsStatus`

#### Scenario: Status change broadcast
- **WHEN** a vehicle's GPS status transitions (e.g., live → stale)
- **THEN** a `status_change` message is broadcast to all connected clients with `vehicleId`, `previousStatus`, `newStatus`, and `lastPingAt`

#### Scenario: Heartbeat sent periodically
- **WHEN** a client is connected
- **THEN** the server sends a `heartbeat` message every 30 seconds

#### Scenario: Slow client is disconnected
- **WHEN** a client's send buffer is full (client not reading messages)
- **THEN** the server closes that client's connection without affecting other clients

### Requirement: Client Disconnect and Cleanup
The system SHALL cleanly handle client disconnection.

#### Scenario: Client disconnects normally
- **WHEN** a WebSocket client closes the connection
- **THEN** the hub unregisters the client and frees resources

#### Scenario: Client network failure
- **WHEN** a client becomes unreachable (no pong response within 10 seconds)
- **THEN** the hub closes and unregisters the client connection

### Requirement: Connection Lifetime Limit
The system SHALL enforce a maximum connection lifetime to handle JWT token expiry.

#### Scenario: Connection closed after maximum lifetime
- **WHEN** a WebSocket connection has been open for 50 minutes
- **THEN** the server sends a close frame and disconnects the client
- **AND** the client is expected to reconnect with a fresh JWT
