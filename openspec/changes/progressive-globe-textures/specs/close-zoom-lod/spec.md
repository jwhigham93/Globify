## ADDED Requirements

### Requirement: Extended Zoom Range
The system SHALL allow the camera to zoom closer than the current minimum, enabling regional inspection with high-fidelity textures.

#### Scenario: Camera can zoom to minimum distance 101
- **WHEN** the user zooms in as far as possible
- **THEN** the camera distance stops at 101 (reduced from 107)

#### Scenario: Zoom breakpoints trigger tile level changes
- **WHEN** the camera distance crosses 140 (far to mid)
- **THEN** z1 tiles begin loading
- **WHEN** the camera distance crosses 120 (mid to close)
- **THEN** z2 tiles begin loading (replacing z1 for visible regions)

### Requirement: Marker Scaling at Close Zoom
The system SHALL scale marker geometry at close zoom distances to maintain consistent apparent size.

#### Scenario: Markers maintain apparent size below distance 107
- **WHEN** the camera distance is less than 107
- **THEN** marker geometry is scaled by factor `107 / currentDistance` so markers appear the same size as at distance 107

#### Scenario: Markers render at normal size above distance 107
- **WHEN** the camera distance is 107 or greater
- **THEN** marker geometry uses its default size with no scaling applied

### Requirement: Tile Loading Indicator
The system SHALL show a subtle loading indicator when tiles are being fetched.

#### Scenario: Loading indicator appears during tile fetch
- **WHEN** one or more tiles are being loaded from the CDN
- **THEN** a subtle loading indicator is visible in the UI

#### Scenario: Loading indicator disappears when tiles are loaded
- **WHEN** all queued tiles have finished loading
- **THEN** the loading indicator is hidden
