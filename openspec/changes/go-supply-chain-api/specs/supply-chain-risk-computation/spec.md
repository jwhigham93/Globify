## ADDED Requirements

### Requirement: Network risk metrics computation

The API SHALL compute concentration risk metrics server-side, producing results equivalent to the TypeScript `computeNetworkRiskMetrics()` function.

#### Scenario: Get network risk metrics

- **WHEN** a GET request is made to `/api/v1/risk/network`
- **THEN** the response SHALL return HTTP 200 with a `NetworkRiskMetrics` object containing `networkDiversificationScore`, `hhi`, `supplierRisks`, `dcDiversification`, and `restaurantRisks`

#### Scenario: Supplier risk scores use volume share

- **WHEN** network risk metrics are computed
- **THEN** each supplier's `volumeShare` SHALL be calculated as `(supplierVolume / totalNetworkVolume) * 100`
- **AND** `riskScore` SHALL equal `volumeShare`
- **AND** `riskLevel` SHALL be 'high' when volumeShare >= 35, 'medium' when >= 20, 'low' otherwise

#### Scenario: DC diversification uses Shannon entropy

- **WHEN** DC diversification scores are computed
- **THEN** each DC's `diversificationScore` SHALL be calculated as normalized Shannon entropy: `H = (-Σ(p * ln(p))) / ln(n) * 100` where `p` is each supplier's volume proportion and `n` is the number of suppliers
- **AND** a DC with only one supplier SHALL have a diversificationScore of 0

#### Scenario: HHI computation

- **WHEN** the Herfindahl-Hirschman Index is computed
- **THEN** it SHALL equal the sum of squared volume shares: `HHI = Σ(volumeShare / 100)²`

#### Scenario: Restaurant risk scores invert DC diversification

- **WHEN** restaurant risk scores are computed
- **THEN** each restaurant's `riskScore` SHALL equal `100 - dcDiversificationScore` of its highest-volume serving DC

### Requirement: Disruption simulation

The API SHALL accept a set of disabled node IDs and compute disruption impact metrics, replacing the frontend `computeDisruptionMetrics()` function.

#### Scenario: Simulate disruption with disabled nodes

- **WHEN** a POST request is made to `/api/v1/disruption/simulate` with body `{ "disabledIds": ["dc-atlanta", "sup-tyson"] }`
- **THEN** the response SHALL return HTTP 200 with a `DisruptionMetrics` object containing `disabledCount`, `disabledNodes`, `affectedRouteCount`, `orphanedRestaurants`, and `partiallyServedRestaurants`

#### Scenario: Orphaned restaurants have all DCs disabled

- **WHEN** disruption metrics are computed
- **THEN** `orphanedRestaurants` SHALL contain only restaurants where ALL serving DCs (via active dc_to_restaurant routes) are in the disabled set

#### Scenario: Partially served restaurants have some DCs disabled

- **WHEN** disruption metrics are computed
- **THEN** `partiallyServedRestaurants` SHALL contain restaurants served by 2+ DCs where at least one (but not all) serving DCs are disabled

#### Scenario: Empty disabled set returns zero impact

- **WHEN** a POST request is made with `{ "disabledIds": [] }`
- **THEN** `disabledCount` SHALL be 0, `affectedRouteCount` SHALL be 0, and both orphaned/partially arrays SHALL be empty

#### Scenario: Disabled suppliers affect downstream routes

- **WHEN** a supplier is in the disabled set
- **THEN** all `supplier_to_dc` routes from that supplier SHALL be counted in `affectedRouteCount`
