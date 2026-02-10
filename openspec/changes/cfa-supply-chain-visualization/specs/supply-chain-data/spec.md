# Spec: Supply Chain Data

## ADDED Requirements

### Requirement: Location Data Model

The system SHALL support a location data model that represents suppliers, distribution centers, and restaurants.

#### Scenario: Location has required geographic properties

- **WHEN** a location is defined
- **THEN** it SHALL have an id, name, latitude, longitude, and type property

#### Scenario: Location type distinguishes entity categories

- **WHEN** a location type is specified
- **THEN** it SHALL be one of: 'supplier', 'distribution_center', or 'restaurant'

---

### Requirement: Route Data Model

The system SHALL support a route data model connecting locations in the supply chain.

#### Scenario: Route connects source to destination

- **WHEN** a route is defined
- **THEN** it SHALL have a sourceId and destId referencing location ids

#### Scenario: Route type indicates supply chain segment

- **WHEN** a route type is specified
- **THEN** it SHALL be one of: 'supplier_to_dc' or 'dc_to_restaurant'

#### Scenario: Route includes volume for visualization

- **WHEN** a route is defined
- **THEN** it SHALL have a volume property for arc thickness calculation

---

### Requirement: Mock Data for Initial Visualization

The system SHALL include mock data representing a realistic CFA Supply chain network.

#### Scenario: Mock data includes real CFA Supply DC locations

- **WHEN** mock distribution center data is loaded
- **THEN** it SHALL include the 6 known CFA Supply locations (Carrollton GA, Dallas TX, Phoenix AZ, Riverside CA, Jacksonville FL, Chicago IL area)

#### Scenario: Mock data includes sample restaurants

- **WHEN** mock restaurant data is loaded
- **THEN** it SHALL include 30-50 sample restaurant locations across the US
- **AND** it SHALL include at least one Singapore location
- **AND** it SHALL include at least one UK location

#### Scenario: Mock data includes sample suppliers

- **WHEN** mock supplier data is loaded
- **THEN** it SHALL include 5 sample supplier locations representing food industry companies
