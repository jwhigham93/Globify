## ADDED Requirements

### Requirement: Shared supply-chain services library
The pure-TS supply-chain services currently in `apps/Globify/src/services/` SHALL be extracted into a shared Nx library consumed by both `apps/Globify` and `apps/globify-tiles`, rather than duplicated.
This includes `apiClient`, `supplyChainData`, `riskVisuals`,
`disruptionVisuals`, `selectionHighlight`, `lodClustering`,
`truckVisuals`, `truckStatus`, `carModel`, `collisionDetection`,
`resolveGlobeClick`, `gpsStreamService`, `streamTicketService`,
`useVehiclePositions`, `authService`, and `config`.

#### Scenario: v1 continues to pass its existing tests after extraction
- **WHEN** the services are moved into the shared library and v1's imports
  are updated to point at it
- **THEN** every existing `.spec.ts` test for those services still passes,
  unmodified in behavior

#### Scenario: v2 imports the same modules v1 uses
- **WHEN** the v2 app needs supply-chain data fetching, risk/disruption
  coloring, or truck-visual logic
- **THEN** it imports the shared library's modules directly rather than
  reimplementing or copying them

### Requirement: Lat/lng to ECEF coordinate bridge
A coordinate-bridge function SHALL convert the existing services' plain
`{lat, lng}` decimal-degree output into ECEF positions consistent with the
`TilesRenderer` instance's ellipsoid, for use in placing markers, arcs, and
truck meshes in the tiles scene.

#### Scenario: Known coordinates map to expected ECEF position
- **WHEN** the bridge is given a known latitude/longitude (and optional
  altitude)
- **THEN** it returns an ECEF position matching the tiles ellipsoid's own
  cartographic-to-position conversion within a documented tolerance

### Requirement: Location markers on the tiles scene
Supplier, distribution-center, and restaurant location markers SHALL be
rendered in the v2 scene, positioned via the coordinate bridge and
distinguished by `LocationType` using the same visual language (marker
shape/color per type) as v1.

#### Scenario: Each location type renders a distinct marker
- **WHEN** the visualization bundle includes suppliers, DCs, and
  restaurants
- **THEN** each renders at its correct ECEF position with a marker shape
  distinguishable by type, consistent with v1's marker conventions

### Requirement: Supply-route arcs on the tiles scene
Supply-chain routes SHALL be rendered as arcs or lines between their
source and destination ECEF positions, using the existing route-coloring
logic from `riskVisuals`/`disruptionVisuals`/`selectionHighlight`.

#### Scenario: A route renders between its two endpoints
- **WHEN** a `SupplyRoute` connects a known source and destination
  location
- **THEN** a line/arc is rendered between their bridged ECEF positions
- **AND** its color reflects whichever view-mode transform is currently
  active

### Requirement: Live truck markers
Truck/vehicle positions SHALL be rendered on the tiles scene, sourced from
the shared library's `useVehiclePositions` hook (REST poll + WebSocket GPS
stream), and updated as new positions arrive without requiring a page
reload.

#### Scenario: A GPS ping updates a truck's rendered position
- **WHEN** `useVehiclePositions` receives a new GPS ping for a tracked
  vehicle over the WebSocket stream
- **THEN** that vehicle's marker moves to the new bridged ECEF position on
  the next render, without a full page reload or re-fetch of the entire
  vehicle list

### Requirement: View-mode color transforms
The v2 app SHALL support the same view modes as v1
(`standard` / `concentration-risk` / `disruption`) as pure color/highlight
transforms applied to marker and route data before rendering — not as
changes to the camera, projection, or renderer.

#### Scenario: Switching view mode recolors without changing the camera
- **WHEN** the user cycles the view mode
- **THEN** marker and route colors update to reflect the newly-selected
  transform
- **AND** camera position, tiles rendering, and controls are unaffected

### Requirement: Entity detail panel on selection
Selecting a location marker SHALL open an entity detail panel showing the
same supplier/DC/restaurant detail data as v1, fetched via the shared
`useEntityDetail`-equivalent hook.

#### Scenario: Selecting a supplier marker shows its detail panel
- **WHEN** the user selects a supplier marker in the v2 scene
- **THEN** the entity detail panel opens showing that supplier's DC count,
  route count, and outbound route list, sourced from the backend API
