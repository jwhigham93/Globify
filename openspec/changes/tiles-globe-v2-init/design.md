## Context

`apps/Globify` renders its globe with `three-globe` + react-three-fiber: a
fixed-radius sphere textured with a bundled NASA Black Marble image, and a
custom lat/lng→sphere-surface projection (`globe.getCoords`). We're adding a
second UI on a fundamentally different renderer — real-world photorealistic
3D Tiles (Google's Photorealistic Tiles dataset via Cesium Ion) rendered
through `3d-tiles-renderer` (NASA-AMMOS/3DTilesRendererJS), with optional
atmosphere/volumetric-cloud rendering from `@takram/three-atmosphere` and
`@takram/three-clouds` (the `three-geospatial` project). This uses true
WGS84 ellipsoid/ECEF geometry at planetary scale, not a stylized sphere —
close enough to the current app conceptually (both are "a 3D globe with
supply-chain data on it") that reusing the data layer makes sense, but far
enough in rendering technique that it needs its own app.

Reference implementation: three.js's `webgl_loader_3dtiles.html` example
(added in PR #33292), which composes `TilesRenderer` + `GlobeControls` +
`CesiumIonAuthPlugin` with an `EffectComposer` pipeline carrying
`AerialPerspectiveEffect` (atmosphere/sky) and `CloudsEffect` (volumetric
clouds). That example is vanilla Three.js; this change adopts the same
libraries but wires them through react-three-fiber per the user's decision,
since `3d-tiles-renderer` and the `@takram` packages both publish
r3f-oriented integration paths.

Current-repo constraints this design works within:
- Nx workspace only has `@nx/expo`, `@nx/js`, `@nx/eslint`, `@nx/jest`,
  `@nx/playwright` wired — no Vite/plain-React precedent exists.
- `apps/Globify`'s Metro config already patches `import.meta` for
  `three`/`@react-three/`/`three-globe`/`drei`/`troika` ESM packages
  (`babel.config.js:8-20`) — the pattern this change extends.
- `pnpm-workspace.yaml` globs `apps/*` only; no shared-library convention
  exists yet.
- All existing supply-chain data (`Location`, `DataPoint`, `ArcData`,
  `VehiclePosition`, route endpoints) is plain `{lat, lng}` decimal
  degrees — no cartesian conversion is baked into any service today.

## Goals / Non-Goals

**Goals:**
- Stand up a working `TilesRenderer` + `GlobeControls` scene rendering
  Google Photorealistic Tiles, authenticated via the user's Cesium Ion
  token, inside a new Nx app.
- Reuse the existing supply-chain data-fetching and pure-transform logic
  (services layer) without forking it — extract it into a shared library.
- Re-render the existing visual concepts (location markers, routes,
  trucks, entity detail, risk/disruption view-mode coloring) on the new
  renderer via a single coordinate-bridge function.
- Reuse the existing brutalist HUD chrome and Cognito auth flow as-is.
- Offer atmosphere + volumetric clouds as an optional layer, without
  letting their Beta status or startup cost block the core experience.
- Attempt dual-target (mobile + web) via Expo/Metro, with an explicit,
  early go/no-go gate rather than discovering Metro incompatibility deep
  into the build.

**Non-Goals:**
- Not migrating or removing `apps/Globify` (v1) — it keeps working
  unchanged, aside from importing services from the new shared library.
- Not building production web-hosting/deploy infrastructure for the new
  app (`infra/cdk` changes) — flagged as follow-up, not solved here.
- Not achieving full feature parity with every v1 interaction on day one
  (e.g. LOD clustering thresholds, collision-avoidance altitude offsets)
  — those port over using the same services, but their exact tuning for
  ellipsoid/ECEF space is implementation-time work, not a spec requirement
  of this change.
- Not committing to react-three-fiber vs. vanilla Three.js as a permanent
  choice beyond this change — if the spike (Decision 3) shows the r3f
  wrapper is unworkable, falling back to vanilla imperative Three.js
  inside a thin r3f wrapper component is an in-scope adjustment, not a
  new proposal.

## Decisions

### 1. New Nx app (`apps/globify-tiles`), not a rewrite of `apps/Globify`

**Choice:** Scaffold a new Expo-based Nx app rather than adding a "tiles
mode" inside the existing app.

**Rationale:** The rendering architecture is fundamentally different
(ellipsoid/ECEF vs. fixed-radius sphere) — bolting it onto `GlobeScene.tsx`
would mean two incompatible coordinate systems and render loops coexisting
in one component tree. A separate app keeps v1 fully working and testable
throughout v2's development, matches the user's explicit "complete separate
v2 UI" framing, and follows this repo's existing one-app-per-`apps/*`-dir
convention.

**Alternatives considered:** A `viewMode` variant inside `GlobeScene.tsx`
switching between `three-globe` and `TilesRenderer` — rejected: doubles the
complexity of the single hardest file in the app for a rendering technique
users would toggle rarely, and blocks incremental delivery (v2 would need
to be feature-complete before it could ship at all).

### 2. Dual-target Expo/Metro first, gated by an early spike; web-only Vite is documented Plan B

**Choice:** Attempt both mobile and web targets through Expo/Metro, but
require an early spike task to validate the specific new capabilities
Metro hasn't handled before — `postprocessing`'s `EffectComposer` on
native, WASM Draco decoding, and any Worker usage — before committing to
the dual-target build. If the spike fails, the fallback is a new,
separate, web-only Vite/React Nx app instead (first Vite precedent in this
workspace), and `apps/globify-tiles` is re-scoped to web-only.

**Rationale:** Metro already has precedent for patching three.js/r3f ESM
quirks, so extending that pattern is worth trying first — but the new
dependency set introduces categories of risk v1 has never exercised
(postprocessing render targets, WASM, Workers on Hermes/native), which are
plausible failure points independent of the `import.meta` issue Metro
already solves for. Gating on a spike means the pivot, if needed, is a
planned decision with evidence, not a mid-build surprise discovered after
weeks of work.

**Alternatives considered:** Go straight to web-only Vite (lower risk, but
abandons the mobile goal without even trying, and the user explicitly
wants to attempt it). Go straight to dual-target with no spike (higher
risk of significant wasted work if native support turns out to be
infeasible).

### 3. react-three-fiber integration via `3d-tiles-renderer/r3f` + `@takram/three-atmosphere`'s own r3f components

**Choice:** Wire `TilesRenderer`/`GlobeControls` through `3d-tiles-renderer`'s
published r3f components, and render atmosphere/clouds through
`@takram/three-atmosphere`'s own native r3f components composed inside
`@react-three/postprocessing`'s `<EffectComposer>`.

**Confirmed by spike (task 1, see tasks.md)** — this is more favorable than
assumed at proposal time:
- `3d-tiles-renderer/r3f` exports real, documented components:
  `<TilesRenderer>`, `<TilesPlugin plugin={...} args={...}>`,
  `<GlobeControls>`, `<TilesAttributionOverlay>`, `<EastNorthUpFrame lat lon height>`.
  Usage is declarative and matches the package's own bundled
  `src/r3f/README.md` (confirmed by installing the real package rather than
  relying on its public docs page, which 404'd).
- `<TilesRenderer>` and `<GlobeControls>` **already run the per-frame update
  loop internally** (`tiles.setResolutionFromRenderer`/`tiles.update()` and
  `controls.update()` both happen inside the components' own `useFrame`
  hooks) — no manual render-loop wiring is needed for the base tiles scene;
  `tasks.md` 4.2 is largely already solved by using the components as
  documented.
- `@takram/three-atmosphere/r3f` exports real JSX components — `<Atmosphere>`,
  `<AerialPerspective>`, `<Sky>`, `<SkyLight>`, `<SunLight>`, `<Stars>` — not
  raw `Effect` instances needing manual `<primitive>` bridging as assumed at
  proposal time. `@takram/three-clouds/r3f` similarly exports `<Clouds>`/
  `<CloudLayer>`. These compose directly as children of
  `@react-three/postprocessing`'s `<EffectComposer>`.
- `<EastNorthUpFrame lat={radians} lon={radians} height={meters}>` (a child
  of `<TilesRenderer>`) positions a group at a geographic coordinate on the
  ellipsoid directly — this may let the `v2-supply-chain-overlay`
  coordinate bridge (task 6) be a thin degrees→radians conversion wrapping
  this component, rather than hand-written ECEF vector math. Confirm during
  task 6; recorded as an open question below since it wasn't proven at
  marker-rendering scale during the spike.

**Rationale:** Matches the user's own reading of these libraries' docs, and
keeps the new app consistent with `apps/Globify`'s existing r3f-first
conventions rather than mixing a vanilla-imperative core with an r3f HUD.
Now additionally confirmed against the packages' own bundled source/docs,
not just their (partially unreachable) public documentation.

**Alternatives considered:** Vanilla imperative Three.js core (mirrors the
reference example exactly) — not needed: the r3f wrapper's API is real,
documented in the package itself, and bundles cleanly (see Risks). No
longer carried as the primary fallback; still available in principle if a
specific component proves broken during implementation.

### 4. Extract shared pure-TS services into a new Nx library

**Choice:** Move the framework-agnostic services currently in
`apps/Globify/src/services/` (`apiClient`, `supplyChainData`,
`riskVisuals`, `disruptionVisuals`, `selectionHighlight`, `lodClustering`,
`truckVisuals`, `truckStatus`, `carModel`, `collisionDetection`,
`resolveGlobeClick`, `gpsStreamService`, `streamTicketService`,
`useVehiclePositions`, `authService`, `config`) into a new shared Nx
library, and have both `apps/Globify` and `apps/globify-tiles` depend on
it.

**Rationale:** None of these services know about `three-globe` or
cartesian coordinates — they already hand back plain lat/lng data or pure
color/status transforms. Forking them into two copies would immediately
create drift (e.g. a risk-coloring bug fixed in v1 silently missing from
v2). This is the first `libs/*`/`packages/*` entry in the workspace, so it
also requires adding that glob to `pnpm-workspace.yaml`.

**Alternatives considered:** Duplicate the files into the new app —
rejected as technical debt from day one, for a codebase already at 25+
tested pure-TS modules that would need to be kept in sync by hand. Leave
them in `apps/Globify` and have `apps/globify-tiles` import across app
boundaries — rejected as an Nx anti-pattern (apps shouldn't import from
other apps; libraries are the intended sharing unit).

### 5. Cesium Ion token via `EXPO_PUBLIC_` env var, not committed to `app.json`

**Choice:** Inject the Cesium Ion token as `EXPO_PUBLIC_CESIUM_ION_TOKEN`
at build time (local `.env`/EAS secret/CI secret), rather than following
`apps/Globify`'s current pattern of committing config values directly into
`app.json`'s `expo.extra` block.

**Rationale:** The existing pattern commits a Cognito User Pool ID, which
is an identifier, not a bearer credential — anyone with it still needs a
valid user session. A Cesium Ion token is a bearer credential itself
(`CesiumIonAuthPlugin` sends it directly to authenticate tile requests);
committing it to source would let anyone who reads the repo consume the
user's Cesium Ion quota. This is a deliberate, scoped divergence from the
existing convention, not a wholesale change to how v1 handles its own
config.

**Alternatives considered:** Follow the exact v1 pattern and commit the
token to `app.json` — rejected for the credential-strength reason above.
Proxy tile requests through `services/supply-chain-api` to keep the token
server-side entirely — rejected as out of scope: it would require a new
backend tile-proxy capability, real latency/cost implications for
photorealistic tile volumes, and isn't what "initialize the v2 UI" asked
for; revisit only if the client-side-token approach proves genuinely
unacceptable in practice.

### 6. Web hosting for the new app is out of scope for this change

**Choice:** This change does not add or modify CDK infrastructure for
deploying `apps/globify-tiles`'s web build. `infra/cdk/stacks/webhosting.go`
remains scoped to the v1 Expo bundle as-is.

**Rationale:** The user's ask was to initialize the v2 UI and integrate
visualizations on top of it — a running app, not a deployed one. Deciding
between a second CloudFront+S3 stack instance vs. parameterizing
`webhosting.go` to serve either bundle is a real decision with its own
trade-offs (cost, cache invalidation, custom domain routing) that deserves
its own proposal once the app itself is proven out locally.

**Alternatives considered:** Add a second hosting stack in this change —
rejected as scope creep ahead of having a working app to host.

## Risks / Trade-offs

- **A transitive dependency's `import.meta`-using ESM build can reach the
  browser bundle even when the babel `import.meta` shim pattern (Decision
  below) is correctly configured** → Found via the user's own first live
  test (not caught by this sandbox, since it can't load a real page):
  `zustand` (transitive, via `@react-three/drei`) has a `"react-native"`
  package-exports condition pointing at its CJS build, but Metro's
  `platform:"web"` condition list (`["browser"]`) doesn't match it and
  falls through to `"import"`/`"module"` instead, landing on an ESM build
  with raw `import.meta.env` — which never reaches the babel `overrides`
  matching at all (proven with a deliberately-broken `babel.config.js`
  that still built successfully), so no amount of extending the regex
  pattern fixes it. The general shape of this bug — *any* dependency
  publishing a `"react-native"` condition but no `"browser"` one — can
  recur with other packages this dependency set pulls in later. Fixed via
  a `metro.config.js` `resolver.resolveRequest` override (layered *after*
  `withNxMetro`, which otherwise silently discards a resolver set inside
  its input config) forcing `unstable_conditionNames: ['react-native']`
  for the specific affected package. If this recurs, the fix is the same
  shape: identify the package via `grep -o "import\.meta" <bundle>` on a
  real export (checking bundle *content*, not the output filename hash,
  which was not reliably content-addressed in this setup and stayed
  identical across genuinely different builds), then add it to that
  resolver override rather than the babel `overrides` list.
- **`3d-tiles-renderer`'s package exports are ESM-only — Metro resolves this
  fine, Jest's CJS resolver does not** → Discovered while building the
  actual scene (task 4): `3d-tiles-renderer/r3f`'s (and its other
  subpaths') `exports` map declares only an `"import"` condition, no
  `"require"` — Jest's default CJS module resolution can't find it
  (`Cannot find module '3d-tiles-renderer/r3f'`), even though Metro
  bundles it without issue. **Two mitigations, depending on the need:**
  (1) For components that don't need real render-testing anyway (like
  `apps/Globify`'s own `GlobeScene.tsx` — WebGL doesn't exist under
  Jest/jsdom regardless), defer the import inside a function
  body/conditional rather than a static top-level `import`. `App.tsx`
  does this (task 4.1). (2) For logic that genuinely needs the real
  module synchronously in a test — the coordinate bridge (task 6.2) — a
  `jest.config.ts` `moduleNameMapper` that locates the package directory
  via a plain `node_modules` filesystem walk (not `require.resolve`,
  which is *also* blocked — this package has no `"./package.json"` export
  either) and maps each subpath straight to its built file, combined with
  extending `transformIgnorePatterns` the same way `apps/Globify` already
  does for `three/examples`. The "textbook" Jest fix
  (`testEnvironmentOptions.customExportConditions: ['import']`) was tried
  first and rejected — it changes resolution for every package in
  `node_modules`, not just this one, and broke unrelated passing tests
  (`@babel/runtime` started resolving to its untransformed ESM build).
  Carry pattern (2) forward into tasks 7-9 for any new coordinate/data
  logic that needs real `3d-tiles-renderer` types in its tests; pattern
  (1) for anything that's scene/render wiring only.
- **`3d-tiles-renderer`'s type declarations lag its actual runtime API in
  at least two places** → `EllipsoidContext` is exported at runtime
  (`export *` from the component file) but absent from the r3f entry
  point's `.d.ts`; `<TilesPlugin>`'s `args` prop is typed strictly as a
  constructor-parameters tuple even though the package's own README
  documents passing a bare options object for single-argument plugins.
  Neither is a runtime bug — both are places where trusting the `.d.ts`
  file over the actual source/README would have led to broken or
  overly-defensive code. Worth re-checking on any future version bump of
  this still-actively-developed library.
- **Metro/native compatibility is unproven** → Partially resolved by the
  spike (see tasks.md task 1): `expo export -p web` and
  `expo export -p android` both bundle the **entire** new dependency set
  cleanly (764 and 1124 modules respectively) with only two additional
  `babel.config.js` override regexes (`/3d-tiles-renderer/`,
  `/postprocessing/`) beyond the existing pattern. This confirms
  bundler/transform-level compatibility on both platforms. It does **not**
  confirm runtime behavior on an actual device — no Android SDK, emulator,
  or Java toolchain was available to verify beyond bundling (see task 1.4's
  recorded outcome in tasks.md). A documented web-only Plan B remains
  available if on-device verification (task 1.4, still open) fails.
- **`postprocessing`'s SMAA anti-aliasing pass uses `new Worker()` +
  `Blob`/`URL.createObjectURL`** (confirmed by reading
  `postprocessing`'s bundled source — `SMAAImageGenerator`) to generate its
  search/area lookup textures at runtime. Web Workers and
  `URL.createObjectURL` don't exist in React Native/Hermes without a
  polyfill, so this **will** break on native if used as-is. Mitigation:
  use `postprocessing`'s precomputed static SMAA texture assets instead of
  the runtime worker-based generator (or omit SMAA from the native build).
  Verify concretely during the on-device follow-up (task 1.4).
- **`@takram/three-atmosphere` and `@takram/three-clouds` are Beta
  upstream** → Mitigated by scoping them as an optional, off-by-default
  layer (proposal's `v2-atmosphere-clouds` capability) so instability there
  can't block the core tiles + supply-chain-overlay experience.
- **Async GPU LUT precompute adds real startup latency when
  atmosphere/clouds are enabled** → Needs an explicit loading state in the
  UI; not acceptable to block first paint of the base tiles scene on it.
- **New workspace-wide `libs/*` convention (Decision 4) touches v1's
  import paths** → Scoped as a mechanical extract-and-re-import; v1's
  existing `.spec.ts` tests move with their implementation files and must
  stay green throughout, so behavior is provably unchanged.
- **Cesium Ion token exposed client-side even via env var** → Any
  client-bundled token is extractable by a determined user regardless of
  how it's injected; the env-var approach only prevents *casual*
  source-control exposure, not extraction from a built app. Acceptable for
  this change's scope (a free-tier personal token); revisit if this ships
  to a wider audience (Decision 5's server-side-proxy alternative).
- **Peer-dependency compatibility between the new packages and the
  existing `three@^0.184.0`/`@react-three/fiber@^9.x` pins** → Resolved by
  the spike: `three@^0.184.0` is unaffected (every package dedupes onto the
  exact version already pinned). `@react-three/fiber` needs bumping from
  `^9.6.1` to `^9.7.0`, and `react`/`react-dom` need bumping from the exact
  `19.1.0` pin to `^19.2.0` (required transitively by
  `@react-three/postprocessing@3.0.5`; verified compatible with
  `react-native@0.81.5`'s own `^19.1.0` peer requirement and
  `@react-three/fiber@9.7.0`'s `>=19 <19.3` range). `@react-three/drei`
  (`^10.0.2`) is a **new** dependency this workspace doesn't currently have
  — required transitively by `@takram/three-atmosphere`. All confirmed via
  a clean `pnpm install` with zero peer-dependency errors or
  `--legacy-peer-deps` needed for the new package set itself (this repo's
  root `.npmrc` already sets `legacy-peer-deps=true` for unrelated
  historical reasons).

## Migration Plan

Not applicable in the data/deployment-migration sense — this change adds a
new app and a new shared library; it does not migrate existing users, data,
or infrastructure. The only "migration" is mechanical: moving service files
from `apps/Globify/src/services/` into the new shared library and updating
`apps/Globify`'s imports to point at it, which is covered as a task and
verified by v1's existing test suite staying green.

## Open Questions

- Whether the `v2-supply-chain-overlay` coordinate bridge should be a thin
  wrapper around `3d-tiles-renderer/r3f`'s `<EastNorthUpFrame lat lon height>`
  component (confirmed to exist and accept radians/meters directly) instead
  of hand-written ECEF vector math — promising per the spike, but not
  proven at real marker-rendering scale (many markers, arcs spanning two
  points, truck meshes updating every frame). Decide during task 6.
- ~~Whether react/react-dom's bump...~~ **Resolved during task 2, reversed
  once, then settled**: first tried scoping `react`/`react-dom`/
  `react-test-renderer` to `apps/globify-tiles` only via its own
  `package.json`. `pnpm install` succeeded with no peer errors, but
  `globify-tiles`'s own Jest suite then failed with a dispatcher-null hook
  error. That specific failure turned out to be an unrelated Jest gotcha in
  a test file (see `tasks.md` task 3.3), not a version-resolution problem —
  but chasing it down first proved the per-app scoping route was fragile
  enough (multiple `.pnpm` store variants of `react-test-renderer` mixing
  `_react@19.1.0`/`_react@19.2.8` suffixes) that it wasn't worth keeping
  even after the real bug was found elsewhere. **Final: a global
  `overrides:` block in `pnpm-workspace.yaml`** pins `react`/`react-dom`/
  `react-test-renderer` to `19.2.8` workspace-wide — this pnpm version
  (11.6.0) no longer reads a `"pnpm"` key in `package.json` for this at
  all (silently ignored, with a warning), so the override has to live in
  `pnpm-workspace.yaml`, which conveniently already had this exact
  precedent (a `jest` 29-vs-30 override for the same class of conflict).
  `apps/Globify`'s own `package.json` needed no changes; only the
  workspace root's `react`/`react-dom`/`@types/react`/`@types/react-dom`/
  `react-test-renderer` version strings were bumped to `19.2.x` to match
  what the override now enforces. `pnpm nx test Globify` (v1, 324 tests)
  stayed green throughout every step of this.
- Exact new Nx app name/location (`apps/globify-tiles` assumed throughout
  this design; confirm at scaffold time).
- Exact shared library name/location (e.g. `libs/supply-chain-data` vs.
  `packages/supply-chain-data`) — first of its kind in this workspace, pick
  during the extraction task.
- Whether `GlobeControls`' adaptive height/zoom behavior needs its own
  tuning pass to feel comparable to v1's `ZOOM_MIN_DISTANCE`/hysteresis
  constants, or whether its defaults are acceptable for v2's first cut.
- Whether LOD clustering (`lodClustering.ts`) and collision-avoidance
  altitude offsets (`collisionDetection.ts`) need adjustment for
  ellipsoid/ECEF scale, or work unchanged once fed through the coordinate
  bridge — to be determined during the overlay-porting task.
