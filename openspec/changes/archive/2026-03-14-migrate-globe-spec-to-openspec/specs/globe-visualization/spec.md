# Spec: Globe Visualization

## ADDED Requirements

### Requirement: Interactive 3D Globe Display

The system SHALL display an interactive 3D globe as the primary content of the application. The globe MUST be rendered using WebGL via `three-globe` and `@react-three/fiber`.

#### Scenario: Globe renders on app launch

- **WHEN** the user launches the Globify app
- **THEN** a 3D globe is displayed centered on the screen within 3 seconds

#### Scenario: Globe uses night lights texture

- **WHEN** the globe is rendered
- **THEN** the globe displays the NASA Black Marble night lights texture

---

### Requirement: Touch-Based Globe Rotation

The system SHALL support touch-based rotation of the globe in all directions (horizontal and vertical axes).

#### Scenario: Horizontal rotation via swipe

- **WHEN** the user swipes left or right on the globe
- **THEN** the globe rotates horizontally following the gesture direction

#### Scenario: Vertical rotation via swipe

- **WHEN** the user swipes up or down on the globe
- **THEN** the globe rotates vertically following the gesture direction

#### Scenario: Rotation with momentum

- **WHEN** the user performs a swipe gesture and releases
- **THEN** the globe continues rotating with momentum and gradually decelerates

---

### Requirement: Pinch-to-Zoom Support

The system SHALL support pinch-to-zoom gestures for zooming in and out on the globe.

#### Scenario: Zoom in via pinch

- **WHEN** the user performs a pinch-out (expand) gesture
- **THEN** the globe zooms in smoothly

#### Scenario: Zoom out via pinch

- **WHEN** the user performs a pinch-in (contract) gesture
- **THEN** the globe zooms out smoothly

---

### Requirement: Data Point Visualization

The system SHALL display data points on the globe surface at specified geographic coordinates.

#### Scenario: Data points render at coordinates

- **WHEN** the globe is loaded with data points
- **THEN** visual markers appear at the specified latitude/longitude coordinates

#### Scenario: Data points fixed to geography

- **WHEN** the user rotates the globe
- **THEN** data points remain fixed to their geographic positions and rotate with the globe

#### Scenario: Data points scale with zoom

- **WHEN** the user zooms in on the globe
- **THEN** data points scale appropriately and remain visible

---

### Requirement: Cross-Platform Rendering

The system SHALL render the globe consistently on web, iOS, and Android platforms using a unified codebase.

#### Scenario: Web platform rendering

- **WHEN** the app is run in a web browser
- **THEN** the globe renders using WebGL via React Three Fiber

#### Scenario: Native platform rendering

- **WHEN** the app is run on iOS or Android
- **THEN** the globe renders using OpenGL via Expo GL with React Three Fiber Native

#### Scenario: Consistent interaction model

- **WHEN** the user interacts with the globe on any platform
- **THEN** rotation and zoom behaviors are consistent across platforms

---

### Requirement: Metro Bundler Compatibility

The system SHALL work with Expo's Metro bundler by using `babel-plugin-transform-import-meta` to transform ESM `import.meta` syntax used by three-globe and related packages.

#### Scenario: Build succeeds with babel transform

- **WHEN** the app is built with Metro bundler
- **THEN** the build completes without "Cannot use 'import.meta' outside a module" errors

#### Scenario: Affected packages are transformed

- **WHEN** packages matching `@react-three`, `three`, `three-globe`, `drei`, or `troika` are bundled
- **THEN** their `import.meta` usage is transformed by the babel plugin

---

### Requirement: Atmospheric Effects

The system SHALL render an atmospheric glow effect around the globe for visual depth.

#### Scenario: Atmosphere is visible

- **WHEN** the globe is rendered
- **THEN** a subtle atmospheric glow is visible around the globe edges

---

### Requirement: Starry Background

The system SHALL display a starry night sky background behind the globe.

#### Scenario: Stars are rendered

- **WHEN** the globe is displayed
- **THEN** a starry background is visible behind the globe

#### Scenario: Background animation

- **WHEN** the starry background is rendered
- **THEN** the stars slowly rotate to create a sense of depth
