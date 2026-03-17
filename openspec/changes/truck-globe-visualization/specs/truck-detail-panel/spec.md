## ADDED Requirements

### Requirement: Truck Detail Panel on Click
The system SHALL display a detail panel when a truck marker is clicked.

#### Scenario: Panel shows vehicle metadata
- **WHEN** a user clicks on a truck marker
- **THEN** a detail panel appears showing the vehicle name, type, and a status badge (live/stale/lost) with color matching the marker color

#### Scenario: Panel shows GPS information
- **WHEN** the truck detail panel is open
- **THEN** it displays current speed (mph), heading (degrees), and last ping time in human-readable relative format (e.g., "2 min ago")

#### Scenario: Panel shows route information
- **WHEN** the selected truck has an active route
- **THEN** the panel displays origin location name, destination location name, and estimated arrival time (if available)

#### Scenario: Panel shows stale warning
- **WHEN** the selected truck has gpsStatus `stale`
- **THEN** the panel displays a prominent orange warning banner showing "No GPS signal for X minutes"

#### Scenario: Panel shows lost warning
- **WHEN** the selected truck has gpsStatus `lost`
- **THEN** the panel displays a prominent red warning banner showing "GPS signal lost — last seen X minutes ago"

#### Scenario: Panel closes on re-click
- **WHEN** a user clicks on the same truck marker that is already selected
- **THEN** the detail panel closes

#### Scenario: Route polyline shown for selected truck
- **WHEN** a truck is selected and has an active route with waypoints
- **THEN** the planned route is drawn as a polyline on the globe surface
- **AND** the completed portion (origin to current truck position) is rendered in a dimmed color
- **AND** the remaining portion (current position to destination) is rendered in a bright color
