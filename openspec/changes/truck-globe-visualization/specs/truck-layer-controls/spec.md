## ADDED Requirements

### Requirement: Truck Layer Toggle
The system SHALL provide a UI control to show or hide the truck marker layer.

#### Scenario: Toggle hides truck layer
- **WHEN** the user clicks the truck layer toggle button while trucks are visible
- **THEN** all truck markers and route polylines are hidden from the globe

#### Scenario: Toggle shows truck layer
- **WHEN** the user clicks the truck layer toggle button while trucks are hidden
- **THEN** all truck markers reappear at their current positions

#### Scenario: Default state is visible
- **WHEN** the globe first loads
- **THEN** the truck layer is visible by default

### Requirement: Active Truck Count Badge
The system SHALL display a count of active (live) trucks.

#### Scenario: Badge shows live truck count
- **WHEN** truck markers are visible
- **THEN** a badge near the toggle button displays "N trucks active" where N is the count of vehicles with gpsStatus `live`

#### Scenario: Badge updates in real time
- **WHEN** a vehicle's gpsStatus changes from `live` to `stale`
- **THEN** the active truck count decrements by one

#### Scenario: Badge hidden when layer is off
- **WHEN** the truck layer is toggled off
- **THEN** the truck count badge is hidden
