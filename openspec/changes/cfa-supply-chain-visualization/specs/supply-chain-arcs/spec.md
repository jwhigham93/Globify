# Spec: Supply Chain Arcs

## ADDED Requirements

### Requirement: Arc Visualization for Supply Routes

The system SHALL display animated arcs representing supply routes between locations on the globe.

#### Scenario: Supplier to DC arcs render with yellow-to-blue gradient

- **WHEN** a route exists from a supplier to a distribution center
- **THEN** an arc is rendered from the supplier location to the DC location
- **AND** the arc color gradient transitions from yellow (#FFFF00) at the source to blue (#00A3FF) at the destination

#### Scenario: DC to Restaurant arcs render with blue-to-https://www.chick-fil-a.com/locations/browsered gradient

- **WHEN** a route exists from a distribution center to a restaurant
- **THEN** an arc is rendered from the DC location to the restaurant location
- **AND** the arc color gradient transitions from blue (#00A3FF) at the source to CFA red (#E60E33) at the destination

#### Scenario: Arcs animate to show flow direction

- **WHEN** arcs are rendered on the globe
- **THEN** the arcs display animated dashes moving from source to destination
- **AND** the animation indicates the direction of supply flow

---

### Requirement: Volume-Based Arc Thickness

The system SHALL vary arc thickness based on route volume to visually distinguish high-volume routes.

#### Scenario: High-volume routes display thicker arcs

- **WHEN** a route has a high volume value
- **THEN** the arc stroke width is proportionally thicker than low-volume routes

#### Scenario: Arc thickness has minimum and maximum bounds

- **WHEN** arc thickness is calculated from volume
- **THEN** the thickness SHALL NOT be less than the minimum stroke width (0.1)
- **AND** the thickness SHALL NOT exceed the maximum stroke width (2.0)

---

### Requirement: Location Points for Supply Chain Entities

The system SHALL display distinct point markers for suppliers, distribution centers, and restaurants.

#### Scenario: Distribution centers render as points

- **WHEN** distribution center locations are loaded
- **THEN** points are rendered at each DC's latitude/longitude coordinates

#### Scenario: Restaurants render as points

- **WHEN** restaurant locations are loaded
- **THEN** points are rendered at each restaurant's latitude/longitude coordinates

#### Scenario: Suppliers render as points

- **WHEN** supplier locations are loaded
- **THEN** points are rendered at each supplier's latitude/longitude coordinates
