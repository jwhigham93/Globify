## ADDED Requirements

### Requirement: Separate v2 app scaffold
A new Nx app (`apps/globify-tiles`) SHALL be scaffolded independently of
`apps/Globify`. Changes to the new app SHALL NOT require modifying v1's
rendering code, and v1 SHALL continue to build, test, and run unchanged
except for importing services from the shared library introduced by the
`v2-supply-chain-overlay` capability.

#### Scenario: v1 is unaffected by v2 scaffolding
- **WHEN** `apps/globify-tiles` is created and its dependencies installed
- **THEN** `pnpm nx test Globify`, `pnpm nx lint Globify`, and
  `pnpm nx serve Globify --web` continue to succeed exactly as before

#### Scenario: v2 app runs independently
- **WHEN** a developer runs the v2 app's serve/start target
- **THEN** the app launches without requiring `apps/Globify` to be running
  or built

### Requirement: Photorealistic tiles rendering via Cesium Ion
The v2 app SHALL render Google's Photorealistic Tiles dataset using
`TilesRenderer` and `GlobeControls` from `3d-tiles-renderer`, authenticated
against Cesium Ion asset `2275207` via `CesiumIonAuthPlugin` using the
configured Cesium Ion token.

#### Scenario: Tiles load with a valid token
- **WHEN** the app starts with a valid `EXPO_PUBLIC_CESIUM_ION_TOKEN`
  configured
- **THEN** `CesiumIonAuthPlugin` authenticates successfully
- **AND** photorealistic tiles begin streaming and rendering as the camera
  orbits the globe

#### Scenario: Missing token fails loudly, not silently
- **WHEN** the app starts without `EXPO_PUBLIC_CESIUM_ION_TOKEN` configured
- **THEN** the app surfaces a clear configuration-error state instead of
  rendering a blank or partially-broken scene

### Requirement: Cesium Ion token is injected via environment, not committed to source
The Cesium Ion token SHALL be supplied via an `EXPO_PUBLIC_CESIUM_ION_TOKEN`
environment variable resolved at build time. It SHALL NOT be hardcoded into
`app.json` or any other file committed to version control.

#### Scenario: Token absent from committed config
- **WHEN** `apps/globify-tiles/app.json` (or equivalent config) is inspected
- **THEN** no Cesium Ion token value appears in it

### Requirement: Metro dual-target compatibility gate
The new dependency set (`postprocessing`, `3d-tiles-renderer`, the `@takram/three-*` packages) SHALL be validated for Metro/Expo compatibility on at least one native target (iOS or Android) in addition to web before full-scale implementation proceeds.
This validation SHALL cover `EffectComposer` render-target usage, WASM
Draco decoding, and any Worker usage. The result SHALL determine whether
the app proceeds as dual-target (mobile + web) or is re-scoped to a
web-only Vite app.

#### Scenario: Spike passes — dual-target proceeds
- **WHEN** the compatibility spike successfully renders tiles with
  postprocessing active on a native simulator/device
- **THEN** `apps/globify-tiles` continues development as an Expo app
  targeting both mobile and web

#### Scenario: Spike fails — web-only fallback is used
- **WHEN** the compatibility spike identifies a blocking incompatibility on
  native (e.g. `EffectComposer` render targets unsupported by `expo-gl`,
  WASM Draco decode unavailable, or required Worker APIs missing)
- **THEN** the app is re-scoped to a web-only Vite/React Nx app instead,
  and this decision is recorded before further overlay/atmosphere work
  proceeds

### Requirement: Reused brutalist HUD chrome
The v2 app SHALL reuse the existing `ui/theme.ts`, `ui/layout.ts`, and
`ui/Shape.tsx` design tokens and slot-based layout system, rendered as
DOM/`react-native-web` siblings of the 3D canvas, unmodified in their
core API.

#### Scenario: HUD overlays render above the tiles canvas
- **WHEN** the v2 app is running with the HUD mounted
- **THEN** panels and controls appear using the same brutalist tokens
  (zero-radius, hard borders, mono uppercase labels) as v1
- **AND** panel positioning is driven by the same named-slot API, not
  hardcoded offsets

### Requirement: Reused Cognito auth gate
The v2 app SHALL reuse the existing Cognito Hosted-UI OAuth flow
(`AuthProvider`) to gate access to supply-chain data, registering its
resolved token with the app's HTTP client the same way v1 does.

#### Scenario: Unauthenticated user is gated
- **WHEN** a user opens the v2 app without a valid session and auth is
  enabled
- **THEN** they see a sign-in screen and no supply-chain data is fetched
  until authentication completes

#### Scenario: Auth can be disabled for local dev
- **WHEN** Cognito environment variables are unset in local development
- **THEN** the v2 app bypasses the sign-in gate, matching v1's
  `isAuthEnabled` behavior

### Requirement: Per-frame tiles/controls update loop
The v2 app SHALL update `GlobeControls` and `TilesRenderer` every rendered
frame so that tile loading responds to camera movement in real time.

#### Scenario: Tiles update as the camera moves
- **WHEN** the user pans or zooms the camera
- **THEN** `controls.update()` and `tiles.update()` run before each render
- **AND** newly-visible tiles begin loading without requiring a manual
  refresh or re-render trigger
