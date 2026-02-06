## ADDED Requirements

### Requirement: Supplier concentration risk score

The system SHALL compute a concentration risk score for each supplier based on their share of total inbound DC volume. The score SHALL be expressed as a percentage (0-100) where higher values indicate greater concentration risk.

#### Scenario: Compute risk score for a dominant supplier

- **WHEN** a supplier provides 26% of total network inbound volume
- **THEN** that supplier's concentration risk score SHALL be 26
- **AND** the supplier SHALL be classified as "medium" risk (score 20-35)

#### Scenario: Compute risk score for a minor supplier

- **WHEN** a supplier provides 10% of total network inbound volume
- **THEN** that supplier's concentration risk score SHALL be 10
- **AND** the supplier SHALL be classified as "low" risk (score 0-20)

#### Scenario: Compute risk score for a highly concentrated supplier

- **WHEN** a supplier provides 40% or more of total network inbound volume
- **THEN** that supplier's concentration risk score SHALL be 40+
- **AND** the supplier SHALL be classified as "high" risk (score 35+)

### Requirement: DC diversification score

The system SHALL compute a diversification score for each DC based on the number of unique suppliers and the evenness of volume distribution across those suppliers. The score SHALL range from 0 (single source) to 100 (perfectly diversified).

#### Scenario: DC with evenly distributed suppliers

- **WHEN** a DC receives volume from 3 suppliers at roughly equal proportions
- **THEN** the DC diversification score SHALL be high (above 70)

#### Scenario: DC with single dominant supplier

- **WHEN** a DC receives 80%+ of its volume from a single supplier
- **THEN** the DC diversification score SHALL be low (below 30)

#### Scenario: DC with single supplier

- **WHEN** a DC receives volume from only one supplier
- **THEN** the DC diversification score SHALL be 0

### Requirement: Network-level diversification score

The system SHALL compute an overall network diversification score using the Herfindahl-Hirschman Index (HHI) approach. The score SHALL be `(1 - HHI) * 100` where HHI is the sum of squared market shares.

#### Scenario: Perfectly balanced network

- **WHEN** all suppliers provide exactly equal volume shares
- **THEN** the network diversification score SHALL approach the maximum (close to 100)

#### Scenario: Highly concentrated network

- **WHEN** one supplier dominates with 60%+ of total volume
- **THEN** the network diversification score SHALL be low (below 50)
