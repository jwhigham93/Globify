## ADDED Requirements

### Requirement: Dynamic point color based on view mode

The globe-scene SHALL support receiving dynamically computed point colors that change based on the active view mode. The point color accessor SHALL use the color provided in each DataPoint's `color` field.

#### Scenario: Standard view uses type-based colors

- **WHEN** standard view mode is active
- **THEN** point colors SHALL be determined by location type (supplier=yellow, DC=blue, restaurant=red)

#### Scenario: Concentration risk view uses risk-based colors

- **WHEN** concentration risk view mode is active
- **THEN** point colors SHALL be determined by the computed risk/diversification score color passed in each DataPoint's `color` field
- **AND** the globe SHALL re-render points when the dataPoints array reference changes
