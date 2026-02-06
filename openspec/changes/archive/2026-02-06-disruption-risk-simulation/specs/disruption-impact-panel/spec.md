## ADDED Requirements

### Requirement: Disruption metrics computation

The system SHALL compute and expose disruption impact metrics based on the current set of disabled nodes.

#### Scenario: Metrics with no disruptions

- **WHEN** no nodes are disabled
- **THEN** the disruption metrics SHALL report: 0 disabled nodes, 0 affected routes, 0 orphaned restaurants

#### Scenario: Metrics after disabling a DC

- **WHEN** a DC is disabled
- **THEN** affected routes count SHALL equal the number of arcs where the DC is either source or destination
- **AND** orphaned restaurant count SHALL equal the number of restaurants served exclusively by that DC

#### Scenario: Metrics after compound failure

- **WHEN** multiple nodes are disabled
- **THEN** affected routes count SHALL be the union of all routes connected to any disabled node (no double-counting)
- **AND** orphaned restaurants SHALL be restaurants whose every serving DC is in the disabled set

### Requirement: Orphaned restaurant list

The disruption impact panel SHALL display a scrollable list of orphaned restaurant names when orphans exist.

#### Scenario: Orphan list populated

- **WHEN** one or more restaurants are orphaned due to disabled nodes
- **THEN** the panel SHALL display each orphaned restaurant's name in a scrollable list
- **AND** the list SHALL be sorted alphabetically

#### Scenario: Orphan list empty

- **WHEN** no restaurants are orphaned (all have at least one active DC route)
- **THEN** the orphan list section SHALL display "No orphaned restaurants"

### Requirement: Disabled node count display

The impact panel SHALL display the count and names of currently disabled nodes.

#### Scenario: Display disabled nodes

- **WHEN** one or more nodes are disabled
- **THEN** the panel SHALL show "X nodes disabled" with a list of disabled node names
- **AND** each listed node SHALL indicate its type (supplier or DC)
