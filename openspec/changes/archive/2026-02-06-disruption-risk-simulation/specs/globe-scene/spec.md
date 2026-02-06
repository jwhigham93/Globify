## ADDED Requirements

### Requirement: Disruption visual state for disabled points

The globe-scene SHALL support rendering points in a "disabled" visual state with grey color and reduced opacity when those points are in the disabled set.

#### Scenario: Disabled point renders grey

- **WHEN** a point's location ID is in the disabled nodes set
- **THEN** the point color accessor SHALL return `#666666` instead of the location type's default color

#### Scenario: Enabled point renders normally

- **WHEN** a point's location ID is NOT in the disabled nodes set
- **THEN** the point color accessor SHALL return the standard color for its location type

### Requirement: Point click callback for disruption toggle

The globe-scene SHALL invoke a click callback when supplier or DC points are clicked, passing the location data to the parent component for disruption state management.

#### Scenario: Clicking a supplier or DC point fires callback

- **WHEN** a user clicks on a supplier or DC point on the globe
- **THEN** the `onPointClick` callback SHALL be invoked with the clicked point's data and index

#### Scenario: Globe continues to support orbit controls alongside click

- **WHEN** a user clicks on a point
- **THEN** the click event SHALL be handled without interfering with orbit rotation/zoom controls
