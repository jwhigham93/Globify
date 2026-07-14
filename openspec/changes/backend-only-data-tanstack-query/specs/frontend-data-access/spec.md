## ADDED Requirements

### Requirement: Backend is the single source of truth for domain data

The app SHALL obtain all supply-chain domain data — topology (locations, routes),
network risk, disruption simulation, and entity detail — exclusively from the
backend API. The app SHALL NOT compute these results locally, and SHALL NOT ship
a hardcoded copy of the seed dataset.

#### Scenario: Domain data comes from the API

- **WHEN** the app renders the globe with risk, disruption, or entity information
- **THEN** every such value originates from a backend API response
- **AND** no frontend module computes risk/disruption or embeds the seed dataset

#### Scenario: No local fallback masks API failure

- **WHEN** an API request for domain data fails
- **THEN** the app surfaces a loading/error state for that data
- **AND** the app does NOT silently substitute a locally-computed result

### Requirement: Data is fetched and cached via TanStack Query

The app SHALL use TanStack Query as its data-fetching layer for all domain API
calls. A single `QueryClient` SHALL be provided at the app root, and each domain
resource SHALL be exposed through a dedicated hook wrapping the existing
`apiClient`.

#### Scenario: Topology fetched once and shared from cache

- **WHEN** multiple components need the supply-chain topology
- **THEN** the topology is fetched once via `useSupplyChainData()`
- **AND** descendant components read it from the query cache without refetching

#### Scenario: Transient failures retry with backoff

- **WHEN** a domain query fails due to a transient network error
- **THEN** TanStack Query retries with backoff up to the configured limit
- **AND** reports an error state only after retries are exhausted

### Requirement: Client-side lookup index derives from fetched topology

The app SHALL derive its location and route lookup indexes
(`locationsById`, inbound/outbound route indexes) from the fetched topology query
result, exposed by `useSupplyChainData()`. Components needing these lookups SHALL
read them from the hook, not from module-level seed arrays.

#### Scenario: Panels resolve names from the query cache

- **WHEN** `EntityDetailPanel` or `GlobeVisualization` resolves a location or
  route name by id
- **THEN** it reads from the `locationsById` / route indexes returned by
  `useSupplyChainData()`
- **AND** no module-level `allLocations` / `getLocationById` global is used

#### Scenario: Lookup handles not-yet-loaded topology

- **WHEN** a lookup is attempted before the topology query has resolved
- **THEN** the component handles the empty-index case gracefully (e.g. id fallback)
  rather than throwing

### Requirement: Disruption simulation is query-driven and debounced by cache keying

The app SHALL request disruption simulation from the backend keyed by the set of
disabled node ids, using previous-data retention while refetching, replacing the
hand-rolled debounce and manual request-cancellation logic.

#### Scenario: Toggling nodes updates the simulation

- **WHEN** the user changes the set of disabled nodes
- **THEN** the app requests a new disruption simulation keyed by the new node set
- **AND** displays the previous result until the new one arrives

### Requirement: Authenticated queries do not fire before auth is ready

When Cognito auth is enabled, the app SHALL NOT issue an authenticated domain
request before a token is available. Queries SHALL be gated on authentication
readiness (e.g. TanStack Query `enabled: isAuthenticated`) rather than relying on
provider nesting or effect ordering. Auth correctness takes priority over
fetch-eagerness.

#### Scenario: No unauthenticated request races ahead of the token

- **WHEN** the app starts with Cognito enabled and no token yet available
- **THEN** domain queries remain disabled and issue no network request
- **AND** they activate only once the user is authenticated and the token is wired

#### Scenario: Auth-disabled local dev fetches immediately

- **WHEN** the app runs with Cognito not configured (`isAuthEnabled` false)
- **THEN** `isAuthenticated` is true and gated queries activate without a sign-in

### Requirement: Frontend specs run without a backend

Frontend unit specs SHALL NOT require a running backend. Data-access hooks SHALL
be testable with a mocked `apiClient` and a `QueryClient` test wrapper. Referential
integrity of the seed dataset SHALL be validated in the backend, not by frontend
specs that reach a live backend.

#### Scenario: Hook specs use a mocked client

- **WHEN** a data-access hook is unit-tested
- **THEN** it runs against a mocked `apiClient` with no live network or backend
- **AND** covers loading→success and loading→error transitions

### Requirement: Live GPS streaming is preserved

The app SHALL continue to receive live vehicle positions over the existing
WebSocket stream (`gpsStreamService` → `useVehiclePositions`). The removal of the
offline/mock layer SHALL NOT affect live GPS streaming.

#### Scenario: Vehicle positions stream over WebSocket

- **WHEN** the globe displays live truck positions
- **THEN** positions come from the WebSocket GPS stream
- **AND** no mock vehicle generator is used

### Requirement: Dev auth bypass is preserved and independent of data source

Removing the local-data path SHALL NOT change auth behavior. When Cognito is not
configured (`config.isAuthEnabled` is false), the app SHALL continue to bypass the
sign-in screen for local development.

#### Scenario: Local dev without Cognito skips sign-in

- **WHEN** the app runs with empty Cognito configuration
- **THEN** `isAuthenticated` resolves true without a sign-in
- **AND** this behavior is driven by `config.isAuthEnabled`, not by any data-mode flag

## REMOVED Requirements

### Requirement: Offline dev mode with local compute and seed data

**Reason**: The backend is now the single source of truth for all domain data;
the parallel frontend implementation caused code bloat and silent drift risk.

**Migration**: Run the backend locally for development (`docker compose up` for
Postgres + API). The removed frontend modules (`disruptionAnalysis.ts`,
`concentrationRisk.ts`, `mockVehicleData.ts`, `supplyChainLocations.ts`,
`supplyChainRoutes.ts`, and the seed/lookup functions of `supplyChainData.ts`) are
replaced by the backend endpoints `/supply-chain/visualization`, `/risk/network`,
`/disruption/simulate`, `/entities/:id`, and `/vehicles/:id/route`, consumed via
the new TanStack Query hooks.
