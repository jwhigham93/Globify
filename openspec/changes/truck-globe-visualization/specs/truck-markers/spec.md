## ADDED Requirements

### Requirement: Truck Marker Rendering
The system SHALL render delivery trucks on the globe as 3D arrow/chevron markers oriented by heading with GPS-status-based color coding.

#### Scenario: Live truck renders as green arrow
- **WHEN** a vehicle has gpsStatus `live`
- **THEN** a green (#33CC66) arrow marker is rendered at the vehicle's lat/lng on the globe surface, pointing in the direction of the vehicle's heading

#### Scenario: Stale truck renders as pulsing orange arrow
- **WHEN** a vehicle has gpsStatus `stale`
- **THEN** an orange (#EE8800) arrow marker is rendered at the vehicle's lat/lng
- **AND** the marker's emissive intensity pulses (oscillates) to draw attention

#### Scenario: Lost truck renders as static red arrow
- **WHEN** a vehicle has gpsStatus `lost`
- **THEN** a red (#CC2222) arrow marker is rendered at the vehicle's lat/lng with a static glow

#### Scenario: Marker heading matches vehicle direction
- **WHEN** a vehicle's heading is 90° (east)
- **THEN** the arrow marker points eastward along the globe surface

### Requirement: Smooth Position Interpolation
The system SHALL smoothly animate truck marker positions between GPS updates.

#### Scenario: Truck moves smoothly between pings
- **WHEN** a new GPS position update arrives for a vehicle
- **THEN** the marker smoothly transitions from its previous position to the new position over the expected ping interval
- **AND** no visible teleporting or jumping occurs

#### Scenario: Interpolation caps at last known position
- **WHEN** no new GPS update arrives after the expected ping interval
- **THEN** the marker stays at the last known position (no extrapolation beyond last update)

### Requirement: Truck Visibility based on Zoom Level
The system SHALL show truck markers only when zoomed in sufficiently.

#### Scenario: Trucks visible at close zoom
- **WHEN** the camera distance is less than 150
- **THEN** truck markers are visible on the globe

#### Scenario: Trucks hidden at far zoom
- **WHEN** the camera distance is 150 or greater
- **THEN** truck markers are hidden from view
