## ADDED Requirements

### Requirement: Node disruption toggle

The system SHALL allow users to toggle supplier and DC nodes between enabled and disabled states by clicking on them. Restaurant nodes MUST NOT be toggleable.

#### Scenario: Disabling a DC via click

- **WHEN** a user clicks on an enabled DC point on the globe
- **THEN** the DC point color SHALL change to disabled grey (`#666666`)
- **AND** all arcs originating from or terminating at that DC SHALL render with faded/grey colors
- **AND** the disruption impact panel SHALL become visible (if not already shown)

#### Scenario: Re-enabling a disabled DC via click

- **WHEN** a user clicks on a disabled DC point on the globe
- **THEN** the DC point color SHALL revert to its original color (`#00A3FF`)
- **AND** all arcs connected to that DC SHALL revert to their original gradient colors
- **AND** if no nodes remain disabled, the disruption impact panel SHALL hide

#### Scenario: Disabling a supplier via click

- **WHEN** a user clicks on an enabled supplier point on the globe
- **THEN** the supplier point color SHALL change to disabled grey (`#666666`)
- **AND** all arcs from that supplier to DCs SHALL render with faded/grey colors

#### Scenario: Clicking a restaurant point

- **WHEN** a user clicks on a restaurant point
- **THEN** no disruption toggle SHALL occur
- **AND** the restaurant's visual state SHALL remain unchanged

### Requirement: Orphaned restaurant detection

The system SHALL identify restaurants that lose all supply paths when nodes are disabled. A restaurant is orphaned when its serving DC is disabled AND no alternate active DC exists in the route data.

#### Scenario: Single DC disabled orphans its exclusive restaurants

- **WHEN** a DC is disabled
- **AND** restaurants served exclusively by that DC have no alternate DC route
- **THEN** those restaurants SHALL be visually highlighted as orphaned (pulsing red outline)
- **AND** orphaned restaurant names SHALL appear in the disruption impact panel

#### Scenario: DC disabled but restaurants have alternate routes

- **WHEN** a DC is disabled
- **AND** its served restaurants also have routes from other active DCs
- **THEN** those restaurants SHALL NOT be marked as orphaned

#### Scenario: Compound failure creates orphans

- **WHEN** multiple DCs are disabled simultaneously
- **AND** a restaurant's only serving DCs are all in the disabled set
- **THEN** that restaurant SHALL be marked as orphaned

### Requirement: Disruption impact panel

The system SHALL display a summary panel showing disruption metrics whenever at least one node is disabled.

#### Scenario: Panel appears on first disruption

- **WHEN** the first node is disabled (from a state of no disruptions)
- **THEN** a semi-transparent overlay panel SHALL appear in the top-right of the viewport
- **AND** the panel SHALL display: count of disabled nodes, count of affected routes, count of orphaned restaurants

#### Scenario: Panel updates on additional disruptions

- **WHEN** additional nodes are disabled or re-enabled
- **THEN** the panel metrics SHALL update in real time to reflect the current disruption state

#### Scenario: Panel hides when all disruptions cleared

- **WHEN** all disabled nodes are re-enabled
- **THEN** the disruption impact panel SHALL hide

#### Scenario: Reset all disruptions

- **WHEN** the user clicks the "Reset All" button in the disruption impact panel
- **THEN** all disabled nodes SHALL revert to enabled state
- **AND** all visual disruption indicators (grey nodes, faded arcs, orphan highlights) SHALL clear
- **AND** the disruption impact panel SHALL hide

### Requirement: Faded arc visualization for disrupted routes

The system SHALL render arcs connected to disabled nodes with a visually distinct faded/grey appearance to indicate they are disrupted.

#### Scenario: Arcs from disabled supplier render faded

- **WHEN** a supplier is disabled
- **THEN** all supplier→DC arcs from that supplier SHALL render with grey color gradient (`#666666` to `#666666`) instead of the normal yellow→blue gradient

#### Scenario: Arcs from disabled DC render faded

- **WHEN** a DC is disabled
- **THEN** all DC→restaurant arcs from that DC SHALL render with grey color gradient
- **AND** all supplier→DC arcs terminating at that DC SHALL render with grey color gradient

#### Scenario: Re-enabled node restores arc colors

- **WHEN** a previously disabled node is re-enabled
- **THEN** all its connected arcs SHALL revert to their original color gradients
