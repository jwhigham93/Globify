## ADDED Requirements

### Requirement: Concentration risk view mode

The system SHALL support a "concentration risk" view mode that dynamically colors supplier and DC points based on their risk/diversification scores. The view mode SHALL be togglable via a UI control.

#### Scenario: Activating concentration risk view

- **WHEN** the user activates the concentration risk view mode
- **THEN** supplier points SHALL render with colors from a green→yellow→red gradient based on their concentration risk score
- **AND** DC points SHALL render with colors from a green→yellow→red gradient based on their diversification score (inverted: low diversification = red)
- **AND** restaurant points SHALL remain their default color (unchanged)
- **AND** the risk summary panel SHALL become visible

#### Scenario: Deactivating concentration risk view

- **WHEN** the user deactivates the concentration risk view mode
- **THEN** all point colors SHALL revert to their standard location-type colors
- **AND** the risk summary panel SHALL hide

#### Scenario: Default view on load

- **WHEN** the application loads
- **THEN** the standard view mode SHALL be active (not concentration risk view)

### Requirement: Risk color gradient mapping

The system SHALL map risk scores to colors using linear interpolation across a green→yellow→red gradient.

#### Scenario: Low risk score color

- **WHEN** a supplier has a concentration risk score below 20
- **THEN** the supplier point SHALL render in green tones (`#00CC00` range)

#### Scenario: Medium risk score color

- **WHEN** a supplier has a concentration risk score between 20 and 35
- **THEN** the supplier point SHALL render in yellow tones (`#CCCC00` range)

#### Scenario: High risk score color

- **WHEN** a supplier has a concentration risk score above 35
- **THEN** the supplier point SHALL render in red tones (`#CC0000` range)

### Requirement: Risk summary panel

The system SHALL display a risk summary panel when concentration risk view mode is active. The panel SHALL appear in the bottom-left of the viewport.

#### Scenario: Panel content

- **WHEN** concentration risk view is active
- **THEN** the panel SHALL display the network diversification score as a prominent number (0-100)
- **AND** the panel SHALL display a ranked list of suppliers sorted by risk score (highest first)
- **AND** each supplier entry SHALL show: name, risk score, and a colored risk bar
- **AND** the panel SHALL display per-DC diversification scores

#### Scenario: Panel hidden in standard view

- **WHEN** standard view mode is active
- **THEN** the risk summary panel SHALL NOT be visible

### Requirement: View mode toggle control

The system SHALL provide a clearly labeled toggle button to switch between standard and concentration risk view modes.

#### Scenario: Toggle button visibility

- **WHEN** the application is loaded
- **THEN** a view mode toggle button SHALL be visible on the globe interface
- **AND** the button SHALL indicate the current active mode

#### Scenario: Toggle interaction

- **WHEN** the user clicks the view mode toggle
- **THEN** the view SHALL switch between standard and concentration risk modes
- **AND** the button label SHALL update to reflect the new active mode
