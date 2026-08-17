## Why

The current globe (`apps/Globify`) renders a single bundled NASA Black
Marble texture on a `three-globe` sphere. We want a second, visually
richer UI built on real-world photorealistic 3D Tiles — Google's
Photorealistic Tiles dataset via Cesium Ion, with atmosphere and
volumetric-cloud rendering — modeled on three.js's `webgl_loader_3dtiles`
reference example. This is a fundamentally different rendering
architecture (true WGS84 ellipsoid/ECEF geometry vs. a fixed-radius
textured sphere), so it needs to live as a new, separate app rather than
a refactor of the existing one. Once the new renderer exists, the
existing supply-chain visualizations (trucks, routes, risk/disruption
overlays, entity detail) need to be re-integrated on top of it so the v2
UI is a real product, not just a tiles demo.

## What Changes

- Scaffold a new Nx app (`apps/globify-tiles`) targeting mobile + web via
  Expo, alongside the existing `apps/Globify` (v1 is untouched).
- Add `3d-tiles-renderer`, `postprocessing`, `@takram/three-atmosphere`,
  `@takram/three-clouds`, `@takram/three-geospatial`, and
  `@takram/three-geospatial-effects` as dependencies of the new app, wired
  through react-three-fiber (`3d-tiles-renderer`'s r3f wrapper +
  `@react-three/postprocessing` bridging the vanilla `Effect` instances
  atmosphere/clouds are built from).
- Wire `TilesRenderer` + `GlobeControls` + `CesiumIonAuthPlugin` to render
  Google Photorealistic Tiles (Cesium Ion asset `2275207`) using the
  user's Cesium Ion token, injected via an `EXPO_PUBLIC_CESIUM_ION_TOKEN`
  env var at build time rather than committed to `app.json`.
- Run an early Metro-compatibility spike (native `postprocessing`
  `EffectComposer`, WASM Draco decode, any Worker usage, plus confirming
  the actual `3d-tiles-renderer/r3f` component API) that gates whether the
  dual-target (mobile + web) approach is viable. If it isn't, the fallback
  is a web-only Vite app — documented here as Plan B, not discovered
  mid-build.
- Extract the existing pure-TS supply-chain services
  (`apiClient`, `supplyChainData`, `riskVisuals`, `disruptionVisuals`,
  `selectionHighlight`, `lodClustering`, `truckVisuals`, `truckStatus`,
  `carModel`, `collisionDetection`, `resolveGlobeClick`, `gpsStreamService`,
  `streamTicketService`, `useVehiclePositions`, `authService`, `config`)
  out of `apps/Globify/src/services/` into a new shared Nx library so both
  v1 and v2 depend on one source of truth instead of forking them. This is
  the first `libs/*`/`packages/*` workspace glob in this repo.
- Add a lat/lng → ECEF coordinate bridge (the one new coordinate-math
  surface needed, since all existing service output is already plain
  `{lat, lng}` decimal degrees) and re-implement markers, arcs, and truck
  meshes on top of the tiles scene using it.
- Port the existing brutalist HUD chrome (`src/components/ui/` — pure
  react-native/react-native-web, no r3f coupling) and the Cognito
  `AuthProvider` (plain `fetch` + `localStorage`, no RN-only APIs) into the
  new app largely as-is.
- Add atmosphere + volumetric clouds as an optional, toggleable layer
  (both `@takram` packages are Beta upstream and require an async GPU LUT
  precompute step before first render) — off by default, not required for
  the app to function.
- **Out of scope for this change**: production web hosting/deploy infra
  for the new app (`infra/cdk/stacks/webhosting.go` is hardcoded to the v1
  bucket/distribution) — flagged under Impact as follow-up work.

## Capabilities

### New Capabilities
- `v2-tiles-app-shell`: new Nx app scaffold, `TilesRenderer` +
  `GlobeControls` + `CesiumIonAuthPlugin` wiring, Metro/babel
  compatibility for the new dependency set, the dual-target-vs-web-only
  decision gate, HUD chrome and auth reuse, render loop.
- `v2-supply-chain-overlay`: the shared services library extraction, the
  ellipsoid coordinate bridge, and porting markers/arcs/trucks/entity
  detail/view-mode color transforms onto the new renderer.
- `v2-atmosphere-clouds`: the optional/toggleable atmosphere +
  volumetric-cloud layer, its async precompute loading state, and the
  postprocessing bridge.

### Modified Capabilities
_(none — this change adds a new app; it does not change the behavior of
existing `frontend-data-access` or `globe-scene` requirements, which
continue to describe `apps/Globify` v1 unchanged)_

## Impact

- **New app**: `apps/globify-tiles/` (Expo, dual mobile+web target).
- **New shared library**: extracted from `apps/Globify/src/services/`;
  first `libs/*`/`packages/*` entry in `pnpm-workspace.yaml` — v1 gets
  updated to import from it instead of its local copies.
- **New dependencies**: `3d-tiles-renderer`, `postprocessing`,
  `@react-three/postprocessing`, `@takram/three-atmosphere`,
  `@takram/three-clouds`, `@takram/three-geospatial`,
  `@takram/three-geospatial-effects` — all new to the workspace; peer
  compatibility with the existing `three@^0.184.0` / `@react-three/fiber@^9.x`
  pins needs to be confirmed during the spike.
- **Secrets**: a new `EXPO_PUBLIC_CESIUM_ION_TOKEN` (or equivalent EAS/CI
  secret) needs to be provisioned — first credential in this repo handled
  via env-var injection rather than being committed to `app.json`.
- **Metro/babel config**: `apps/globify-tiles/metro.config.js` and
  `babel.config.js` will need `import.meta` and asset-extension handling
  extended for the new packages, following the existing pattern already
  used for `three`/`@react-three/`/`three-globe`/`drei`/`troika` in
  `apps/Globify`.
- **Not affected**: `apps/Globify` (v1) keeps working unchanged except for
  importing services from the new shared library; `services/supply-chain-api`
  and `infra/cdk` backend/database stacks are untouched. Web hosting infra
  for the new app is explicitly deferred (see What Changes).
