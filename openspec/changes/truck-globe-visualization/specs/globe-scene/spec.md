## ADDED Requirements

### Requirement: Globe Scene Truck Layer Integration
The GlobeScene SHALL render a truck marker layer using three-globe's customLayerData API, integrated with the existing render loop.

#### Scenario: Truck markers rendered from useVehiclePositions data
- **WHEN** the useVehiclePositions hook provides vehicle positions
- **THEN** the GlobeScene renders truck arrow markers at each vehicle's lat/lng via the customLayerData API

#### Scenario: Truck positions interpolated in render loop
- **WHEN** the useFrame render loop executes
- **THEN** truck marker positions are interpolated between their previous and current GPS positions for smooth animation

#### Scenario: Truck layer respects zoom visibility
- **WHEN** the camera distance is 150 or greater
- **THEN** the truck customLayer group is set to invisible
