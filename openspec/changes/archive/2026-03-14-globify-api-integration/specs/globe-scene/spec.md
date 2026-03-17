## MODIFIED Requirements

### Requirement: Clean Console Output

The Globe components SHALL NOT emit debug logging to the console. Lifecycle events MUST be exposed through callbacks for consumers who need them.

#### Scenario: Globe initialization produces no console output

- **WHEN** the GlobeScene component mounts and initializes
- **THEN** no console.log statements are executed
- **AND** the onReady callback is still invoked when ready

#### Scenario: Globe data updates produce no console output

- **WHEN** the globe data points are updated
- **THEN** no console.log statements are executed
- **AND** the component continues to function correctly

#### Scenario: App component uses silent callbacks

- **WHEN** the App component renders
- **THEN** the onReady and onError callbacks do not log to console

## ADDED Requirements

### Requirement: Async data loading with loading state

The App component SHALL load supply chain data asynchronously from the API instead of importing hardcoded data synchronously.

#### Scenario: Loading state while fetching data

- **WHEN** the App component mounts and data has not yet loaded
- **THEN** the `LoadingFallback` component SHALL be displayed

#### Scenario: Successful data load

- **WHEN** the API returns locations and routes successfully
- **THEN** `transformToArcs()` and `transformToDataPoints()` SHALL be called with the API response data
- **AND** the resulting `arcs` and `points` SHALL be passed to `GlobeVisualization`

#### Scenario: Error state with retry

- **WHEN** the API call fails after all retries
- **THEN** an error message SHALL be displayed with a "Retry" button
- **AND** tapping retry SHALL re-attempt the API call

#### Scenario: Dev mode fallback to mock data

- **WHEN** `API_BASE_URL` is not configured (empty or undefined)
- **THEN** the app SHALL fall back to the local mock data from `supplyChainData.ts`
- **AND** behavior SHALL be identical to the current synchronous loading

### Requirement: Server-side risk and disruption

`GlobeVisualization` SHALL fetch risk metrics and disruption simulation results from the API instead of computing them locally.

#### Scenario: Risk metrics from API

- **WHEN** the component mounts with API mode enabled
- **THEN** `NetworkRiskMetrics` SHALL be fetched from `GET /api/v1/risk/network`
- **AND** the local `computeNetworkRiskMetrics()` call SHALL NOT be used

#### Scenario: Disruption simulation from API

- **WHEN** `disabledNodeIds` changes
- **THEN** the component SHALL POST the disabled IDs to `/api/v1/disruption/simulate`
- **AND** use the returned `DisruptionMetrics` instead of calling local `computeDisruptionMetrics()`
- **AND** the request SHALL be debounced by 300ms to batch rapid toggles

#### Scenario: Entity detail from API

- **WHEN** a data point or cluster is clicked
- **THEN** the entity detail SHALL be fetched from `GET /api/v1/entities/:id`
- **AND** the local `buildSelectedEntity()` call SHALL NOT be used
- **AND** stale responses from previous selections SHALL be ignored
