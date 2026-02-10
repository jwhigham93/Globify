## ADDED Requirements

### Requirement: Supply chain data endpoints

The API SHALL provide endpoints to retrieve supply chain data from PostgreSQL. All endpoints SHALL be prefixed with `/api/v1/`.

#### Scenario: List all locations

- **WHEN** a GET request is made to `/api/v1/locations`
- **THEN** the response SHALL return HTTP 200 with a JSON array of all locations
- **AND** each location object SHALL contain `id`, `name`, `lat`, `lng`, `type` fields

#### Scenario: Filter locations by type

- **WHEN** a GET request is made to `/api/v1/locations?type=dc`
- **THEN** the response SHALL return only locations where `type` equals the query parameter value

#### Scenario: Get a single location

- **WHEN** a GET request is made to `/api/v1/locations/:id`
- **THEN** the response SHALL return HTTP 200 with the matching location object
- **AND** if no location with that ID exists, the response SHALL return HTTP 404

#### Scenario: List all routes

- **WHEN** a GET request is made to `/api/v1/routes`
- **THEN** the response SHALL return HTTP 200 with a JSON array of all supply routes
- **AND** each route object SHALL contain `id`, `sourceId`, `destId`, `routeType`, `volume`, `isActive` fields

#### Scenario: Filter routes by type

- **WHEN** a GET request is made to `/api/v1/routes?routeType=supplier_to_dc`
- **THEN** the response SHALL return only routes matching the specified route type

#### Scenario: Get visualization data bundle

- **WHEN** a GET request is made to `/api/v1/supply-chain/visualization`
- **THEN** the response SHALL return HTTP 200 with `{ "locations": [...], "routes": [...] }` containing all locations and all active routes

### Requirement: Entity detail endpoint

The API SHALL provide an entity detail endpoint that aggregates location data with its connected routes and summary metrics, replacing the frontend `buildSelectedEntity()` function.

#### Scenario: Get supplier entity detail

- **WHEN** a GET request is made to `/api/v1/entities/:id` where the ID is a supplier
- **THEN** the response SHALL include `type: "supplier"`, the location data, `dcCount` (number of distinct destination DCs), `outboundRoutes` (all supplier_to_dc routes from this supplier), and `totalVolume`

#### Scenario: Get DC entity detail

- **WHEN** a GET request is made to `/api/v1/entities/:id` where the ID is a DC
- **THEN** the response SHALL include `type: "dc"`, the location data, `inboundRoutes`, `outboundRoutes`, `totalInboundVolume`, and `totalOutboundVolume`

#### Scenario: Get restaurant entity detail

- **WHEN** a GET request is made to `/api/v1/entities/:id` where the ID is a restaurant
- **THEN** the response SHALL include `type: "restaurant"`, the location data, `inboundRoutes`, `totalInboundVolume`, and `servingDCs` (list of DC locations feeding this restaurant)

#### Scenario: Entity not found

- **WHEN** a GET request is made to `/api/v1/entities/:id` with a non-existent ID
- **THEN** the response SHALL return HTTP 404 with `{ "error": "entity not found" }`
