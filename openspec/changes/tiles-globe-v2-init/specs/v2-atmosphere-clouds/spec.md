## ADDED Requirements

### Requirement: Atmosphere and clouds are optional and off by default
The atmosphere (`@takram/three-atmosphere`) and volumetric-cloud (`@takram/three-clouds`) rendering layers SHALL be togglable and SHALL default to disabled.
The base tiles scene (from `v2-tiles-app-shell`) SHALL be fully usable
with the layer disabled.

#### Scenario: App is usable with atmosphere/clouds off
- **WHEN** a user opens the v2 app without enabling the atmosphere/clouds
  toggle
- **THEN** photorealistic tiles, markers, routes, and trucks render and
  function normally with no atmosphere/cloud effects active

#### Scenario: User enables the layer
- **WHEN** the user turns the atmosphere/clouds toggle on
- **THEN** the app begins the precompute + initialization sequence for
  those effects without requiring an app restart

### Requirement: Async precompute does not block first paint
Enabling atmosphere/clouds SHALL trigger an async GPU lookup-table precompute step (`PrecomputedTexturesGenerator`) that runs without blocking the base tiles scene's first render.
The app SHALL show a loading indicator while the precompute step is in
progress.

#### Scenario: Base scene renders while atmosphere/clouds are still loading
- **WHEN** the user enables atmosphere/clouds
- **THEN** the base tiles scene continues rendering and remains
  interactive while the precompute step runs
- **AND** a loading indicator communicates that the enhanced layer is not
  yet ready

#### Scenario: Effects activate once precompute completes
- **WHEN** `PrecomputedTexturesGenerator`'s async update resolves
- **THEN** the atmosphere and cloud effects become visible in the scene
  without requiring further user action

### Requirement: Atmosphere/clouds render through a bridged postprocessing pipeline
`AerialPerspectiveEffect` and `CloudsEffect` (vanilla `postprocessing` `Effect` subclasses) SHALL be composed into the v2 app's render pipeline via `@react-three/postprocessing`'s `<EffectComposer>`.
They SHALL be bridged as primitive objects rather than reimplemented as
native r3f postprocessing components.

#### Scenario: Effects render in the correct pass order
- **WHEN** atmosphere/clouds are enabled alongside the base tiles render
- **THEN** the aerial-perspective and cloud effects are applied in the
  composited output without disrupting normal tile rendering

### Requirement: Graceful degradation on failure
The app SHALL fall back to the base tiles scene without crashing if atmosphere/clouds initialization fails (e.g. unsupported device capability, precompute error).
The app SHALL surface that the enhanced layer is unavailable rather than
failing silently.

#### Scenario: Precompute failure does not crash the app
- **WHEN** `PrecomputedTexturesGenerator` throws or rejects during
  initialization
- **THEN** the app continues rendering the base tiles scene
- **AND** the atmosphere/clouds toggle reflects that the layer is
  unavailable rather than silently appearing enabled
