## 1. Spike: Metro/dual-target go-no-go gate

- [x] 1.1 In a throwaway sandbox (not yet the real app), install
      `3d-tiles-renderer`, `postprocessing`, `@react-three/postprocessing`,
      `@takram/three-atmosphere`, `@takram/three-clouds`,
      `@takram/three-geospatial`, `@takram/three-geospatial-effects`
      alongside the existing `three@^0.184.0`/`@react-three/fiber@^9.x`
      pins and resolve any peer-dependency conflicts.
      **Done.** Clean `pnpm install`, zero peer errors. Findings: `three`
      stays at `^0.184.0` unchanged (everything dedupes onto it);
      `@react-three/fiber` needs `^9.7.0` (was `^9.6.1`); `react`/`react-dom`
      need `^19.2.0` (was exact `19.1.0` — required transitively by
      `@react-three/postprocessing@3.0.5`, compatible with
      `react-native@0.81.5` and `@react-three/fiber@9.7.0`'s own peer
      ranges); `@react-three/drei@^10.0.2` is a new, previously-absent
      dependency required transitively by `@takram/three-atmosphere`. See
      `design.md`'s Risks section for full detail.
- [x] 1.2 Read `3d-tiles-renderer/r3f`'s actual source/examples in
      `node_modules` (its published docs 404'd during design research) and
      confirm the exported component API — `<TilesRenderer>`,
      `<GlobeControls>` equivalents, plugin registration pattern.
      **Done.** The package ships its own `src/r3f/README.md` with worked
      examples. Confirmed real components: `<TilesRenderer>`, `<TilesPlugin
      plugin={...} args={...}>`, `<GlobeControls>`,
      `<TilesAttributionOverlay>`, `<EastNorthUpFrame lat lon height>`.
      `<TilesRenderer>`/`<GlobeControls>` already run the per-frame update
      loop internally (own `useFrame` hooks) — no manual render-loop code
      needed. `@takram/three-atmosphere/r3f` and `@takram/three-clouds/r3f`
      likewise export real JSX components (`<Atmosphere>`,
      `<AerialPerspective>`, `<Sky>`, `<SkyLight>`, `<SunLight>`, `<Stars>`,
      `<Clouds>`, `<CloudLayer>`) rather than requiring manual `<primitive>`
      bridging of vanilla `Effect` instances. See `design.md` Decision 3
      (updated with this finding).
- [x] 1.3 Get a bare `TilesRenderer` + `GlobeControls` +
      `CesiumIonAuthPlugin` scene rendering Google Photorealistic Tiles on
      **web** (Expo web / Metro) as a baseline.
      **Done, bundler-level.** Built a throwaway Expo app (hand-scaffolded —
      `create-expo-app` hit a known npm-11 JSON-parsing bug) with a real
      scene tree (`<TilesRenderer><TilesPlugin plugin={CesiumIonAuthPlugin}
      .../><GlobeControls/></TilesRenderer>` + `<Atmosphere>`/
      `<AerialPerspective>`), extended `babel.config.js`'s existing
      `import.meta` override with `/3d-tiles-renderer/` and
      `/postprocessing/` regexes, and ran `expo export -p web`.
      **Bundled cleanly: 764 modules, no errors.** Not verified: actual
      tile fetching/rendering against a real Cesium Ion token (none
      available in this environment) — that's a runtime/visual check, not a
      bundler one, and is covered by task 4 + the manual check in task 11.5
      once a real app and token exist.
- [ ] 1.4 Attempt the same on **at least one native target** (iOS or
      Android simulator), specifically exercising `postprocessing`'s
      `EffectComposer` render-target usage, WASM Draco decode via
      `GLTFExtensionsPlugin`, and any Worker usage the dependency chain
      pulls in.
      **Partially done — genuinely blocked in this environment.** This
      sandbox has no Android SDK, `adb`/emulator, Java/JDK, or Xcode
      (impossible on Linux regardless), so a real on-device/emulator run
      could not be attempted here. What *was* verified as a substitute:
      `expo export -p android` (Metro → Hermes bytecode) **also bundled
      cleanly — 1124 modules, no errors** — confirming bundler/transform
      compatibility holds for the Android target too, not just web. A
      static source scan of the installed packages additionally found a
      **concrete, real risk**: `postprocessing`'s SMAA anti-aliasing pass
      (`SMAAImageGenerator`) calls `new Worker()` + `Blob`/
      `URL.createObjectURL` at runtime to generate its lookup textures —
      none of which exist in React Native/Hermes without a polyfill. No
      `WebAssembly`/`OffscreenCanvas` references were found directly in
      `3d-tiles-renderer`/`@takram/*`/`postprocessing`/`@react-three/*`
      (lowers, doesn't eliminate, the WASM Draco concern — three.js's
      `DRACOLoader` itself still needs its own on-device check). **Still
      open and must be closed before committing to dual-target**: an actual
      run on a real Android device or emulator (or iOS device, via someone
      with macOS/Xcode access) exercising the full render pipeline,
      including whether `expo-gl`'s WebGL2 implementation actually supports
      the multi-pass render-to-texture work `EffectComposer` needs.
- [x] 1.5 Record the go/no-go outcome: if native rendering works, proceed
      with tasks below as dual-target (mobile + web) inside
      `apps/globify-tiles`. If it doesn't, stop and re-scope: create a new
      web-only Vite/React Nx app instead (first Vite precedent in this
      workspace) and adjust remaining tasks' target platform accordingly
      before continuing.
      **Outcome: conditional go, pending one closeable gap.** Web is fully
      green (bundles and, per the package's own r3f API, should render with
      a real token). Android is green at the bundler level but the actual
      on-device runtime behavior of `EffectComposer` + SMAA + Draco is
      unverified — this sandbox cannot close that gap (no SDK/emulator/Java
      available). Recommendation: proceed with `apps/globify-tiles` as a
      dual-target Expo app (task 2+), but treat task 1.4's remaining gap as
      a **required checkpoint before shipping atmosphere/clouds on native**
      — run the app on a real Android device/emulator (the user's own
      machine, or a session with that hardware/tooling available) at the
      earliest point a working scene exists, and apply the SMAA mitigation
      (static textures instead of the runtime Worker-based generator) up
      front rather than discovering the break late. If that on-device check
      fails outright, the documented web-only Vite fallback remains
      available and no work here is wasted — the shared-services library
      (task 5) and coordinate bridge (task 6) are platform-agnostic either
      way.

## 2. Scaffold the new app

- [x] 2.1 Use the `nx-generate` skill to scaffold `apps/globify-tiles`
      (Expo template if the spike passed dual-target; otherwise the
      web-only Vite/React equivalent per the spike's outcome).
      **Done, with a substitution.** The `nx-generate` skill referenced in
      `CLAUDE.md` isn't actually registered in this environment (no such
      skill, no Nx MCP server tools available) — fell back to the
      documented `nx g`/`--help` CLI path instead, per CLAUDE.md's own
      fallback guidance ("NEVER guess CLI flags — always check `--help`").
      Ran `pnpm nx g @nx/expo:application apps/globify-tiles
      --name=globify-tiles --unitTestRunner=jest --linter=eslint
      --e2eTestRunner=none` (dry-run first). Generated with inferred
      targets (no `project.json`), matching `apps/Globify`'s convention.
- [x] 2.2 Add the new app's dependencies (from task 1.1) to its
      `package.json`.
      **Done, after a wrong turn worth recording.** `expo-gl`/`expo-asset`/
      `expo-file-system` added via `npx expo install` (SDK-54-aligned
      versions: `expo-gl@~16.0.10`, `expo-asset@~12.0.13`,
      `expo-file-system@~19.0.23`). `three@^0.184.0`,
      `@react-three/fiber@^9.7.0`, `@react-three/drei@^10.0.2`,
      `@react-three/postprocessing@^3.0.5`, `postprocessing@^6.36.7`
      (resolved `6.39.4`), `3d-tiles-renderer@^0.5.1`, and the four
      `@takram/three-*` packages added via `pnpm add`.

      First attempt: pinned `react`/`react-dom`/`react-test-renderer` to
      `19.2.8` in `apps/globify-tiles/package.json` only, leaving the
      workspace root and `apps/Globify` (v1) on `19.1.0` — the "scoped"
      option from `design.md`'s open question. `pnpm install` succeeded
      with no peer errors, but `pnpm nx test globify-tiles` then failed
      with `Cannot read properties of null (reading 'useState')` — a
      dispatcher-null hook error. Root-cause investigation (not
      guess-and-check): confirmed via `pnpm why` and direct
      `node_modules` symlink inspection that this was **not** actually a
      module-duplication problem — even after also bumping the workspace
      root to match, the identical error persisted. The real cause turned
      out to be in the test file itself (see task 3's note) — the version
      split was a red herring. Correcting course, `react`/`react-dom`/
      `react-test-renderer` are pinned via a **global** `overrides:` block
      in `pnpm-workspace.yaml` (this pnpm version — 11.6.0 — no longer
      reads a `"pnpm"` key in `package.json`; it silently ignores it and
      warns), matching this repo's existing precedent for exactly this
      kind of dual-version conflict (the jest 29/30 override already
      there). `apps/Globify`'s own `package.json` needed no edits at all;
      only the root's own `react`/`react-dom`/`@types/react`/
      `@types/react-dom`/`react-test-renderer` entries were bumped to
      `19.2.x` for consistency with the override. `pnpm nx test Globify`
      (v1, 324 tests) stayed fully green throughout.
- [x] 2.3 If Expo/Metro: extend `babel.config.js`'s `import.meta` shim
      list and `metro.config.js`'s `assetExts`/`sourceExts` for the new
      packages, following `apps/Globify`'s existing pattern
      (`babel.config.js:8-20`).
      **Done.** Added the same `overrides`/`test` regex pattern to
      `apps/globify-tiles/.babelrc.js` (that app's generated equivalent of
      `babel.config.js`), extended with `/3d-tiles-renderer/` and
      `/postprocessing/` — same two additions validated in the task-1
      spike. `metro.config.js`'s `assetExts`/`sourceExts` needed no changes
      beyond what the generator already produced (the spike's web/Android
      bundles both succeeded without any extra extensions registered).

      **Correction, found later (task 7, during the user's own live test):**
      the file name itself — `.babelrc.js` — was wrong, and it was
      real-user-demo-blocking. Dev-mode bundling (`expo start`/
      `expo export --dev`, the mode a live `nx serve` actually runs in —
      task 2.4's own verification only ran the production-mode `export`,
      which doesn't hit this) failed with `SyntaxError: Duplicate __self
      prop found` on the very first JSX element in `App.tsx`. Root-caused
      (not guessed — traced through `@react-native/babel-preset`'s and
      `babel-preset-expo`'s actual source, then confirmed empirically) to
      Babel's config-root resolution: a file named `babel.config.js`
      self-declares as Babel's project root and stops upward config
      search; a file named `.babelrc.js` does not — it's file-relative
      config only, so Babel keeps searching upward and *also* merges in
      the repo-root `babel.config.json` (a pre-existing file, unrelated to
      this change, with `{"babelrcRoots": ["apps/*"]}`). That merge is what
      caused `@babel/preset-react`'s automatic-runtime `__self`/`__source`
      injection to run twice. `apps/Globify/babel.config.js` was never
      exposed to this because its name already matches the required
      convention. **Fix: renamed `apps/globify-tiles/.babelrc.js` to
      `babel.config.js`** (matching `apps/Globify`'s exact convention, not
      just its content) and updated `jest.config.ts`'s `configFile`
      reference to match. Confirmed fixed via `expo export --dev` (the
      mode that reproduced it) after the rename, plus `-p web` production
      export, `-p android`, and the full `lint`/`typecheck`/`test` sweep,
      all still green. **Lesson for any future Nx-generated Expo app**:
      the generator names the file `.babelrc.js`, but this repo's
      babel-root layout requires it to be named `babel.config.js` instead
      — verify with `expo export --dev` (or an actual `serve`), not just a
      production export, since only dev mode exercises the plugins this
      bug involved.

      **Second finding from the same debugging session**: after the babel
      fix, `App.spec.tsx`'s "missing token" test started failing — but only
      in this shared dev worktree, not from a clean checkout. Cause:
      `jest-expo` loads `.env.local` into `process.env` unconditionally,
      regardless of test environment (unlike Next.js/CRA's convention of
      skipping `.env.local` under `NODE_ENV=test`) — so once the user
      created `apps/globify-tiles/.env.local` with their real Cesium Ion
      token (per task 3.2's documented local-dev setup), every test run in
      this worktree saw a real, non-empty token, making the "unconfigured"
      test's premise false. Confirmed via a throwaway diagnostic test
      logging `process.env.EXPO_PUBLIC_CESIUM_ION_TOKEN` before concluding
      anything. Fixed in `test-setup.ts` (`setupFilesAfterEnv`, which runs
      before each test file's own imports) by explicitly forcing
      `process.env.EXPO_PUBLIC_CESIUM_ION_TOKEN = ''`, so the test suite's
      outcome no longer depends on whatever the developer running it
      happens to have in their own `.env.local`.

      **Third finding, same live-testing round (the user actually running
      it, not this sandbox — the whole point of doing that)**: after the
      first two fixes, the browser console showed `Uncaught SyntaxError:
      Cannot use 'import.meta' outside a module` — one runtime.
      Root-caused by directly instrumenting the actual bundler and config
      files (not guessed): the raw text `import.meta` grepped out of the
      real exported bundle traced to `zustand` (pulled in transitively by
      `@react-three/drei`, via `tunnel-rat` and directly). zustand's
      `package.json` exports a `"react-native"` condition pointing at its
      CJS build specifically for RN — but for `platform:"web"`, Metro's
      package-exports resolution (condition list `["browser"]`, falling
      through to `"import"`/`"module"` since zustand has no `"browser"`
      key) lands on its ESM `esm/*.mjs` build instead, which has a raw
      `import.meta.env` reference. That file never reaches this project's
      `babel.config.js` `overrides` matching at all — proven by adding a
      deliberately-broken (syntactically invalid) `babel.config.js` and
      confirming the export *still succeeded*, meaning this specific
      resolution path bypasses project babel config entirely, not just
      mismatches the override regex. **Two more real caches found and
      cleared along the way** (neither obvious from the filenames Metro
      prints): `/tmp/metro-cache` (the one documented one) wasn't enough —
      `/tmp/metro-file-map-*` (Metro's separate crawler/haste cache) had
      to be cleared too before edits to either config file took effect at
      all, and the exported bundle's *filename hash* turned out not to be
      content-based in this setup (it stayed byte-identical across
      several genuinely-different rebuilds, including the broken-config
      one) — checking the actual file *content* after every change, not
      the filename, is what caught this. **Fix**: `metro.config.js` now
      layers a custom `resolver.resolveRequest` *after* `withNxMetro(...)`
      runs (not inside the `customConfig` passed into it) — `withNxMetro`
      unconditionally overwrites `resolver.resolveRequest` with its own
      workspace-aware resolver, silently discarding anything set before
      it, confirmed by reading `@nx/expo`'s actual source. The new
      resolver intercepts only `zustand`/`zustand/*` requests, forcing
      Metro's own base resolution (`context.resolveRequest`, independent
      of Nx's override) with `unstable_conditionNames: ['react-native']`
      — the same condition web already falls back to for every *other*
      unmatched-condition package — and delegates everything else to Nx's
      resolver unchanged, so workspace-package resolution (e.g.
      `@jw-dev/globify-services`) keeps working. Verified: the exported
      bundle's `import.meta` count went from present to zero (checked by
      content, confirmed by the hash finally changing too, once the real
      fix landed), across `-p web` (dev and production) and `-p android`;
      full `lint`/`typecheck`/`test` sweep across all three projects
      stayed green throughout.
- [x] 2.4 Confirm `pnpm nx serve globify-tiles`/equivalent boots to a
      blank canvas with no bundler errors before adding any tiles code.
      **Done.** Both `pnpm nx run globify-tiles:export -- -p web` and the
      equivalent direct `expo export -p web` bundle the real app cleanly
      (266 modules, no errors) with the placeholder `App.tsx` the generator
      produced. `dist/` output is properly gitignored.

## 3. Cesium Ion token plumbing

- [x] 3.1 Add `EXPO_PUBLIC_CESIUM_ION_TOKEN` (or the equivalent env-var
      name for the chosen bundler) to the new app's config-reading module,
      matching the layered-precedence pattern of
      `apps/Globify/src/services/config.ts` (env var first, falls back to
      a non-secret extra/config field).
      **Done, with one deliberate deviation.** Created
      `apps/globify-tiles/src/services/config.ts` with a `cesiumIonToken`
      field reading `process.env.EXPO_PUBLIC_CESIUM_ION_TOKEN` and an
      `isCesiumConfigured` getter — but, unlike v1's other config fields,
      it deliberately has **no** `app.json` `extra` fallback, per Decision
      5 (a Cesium Ion token is a bearer credential, not an identifier;
      giving it a committable fallback path would defeat the point).
- [x] 3.2 Document local-dev token setup (`.env.local` or equivalent,
      gitignored) and EAS/CI secret provisioning for builds — do not
      commit the token value anywhere.
      **Done.** New `apps/globify-tiles/README.md` covers getting a free
      Cesium Ion token, the one-off-env-var vs. `.env.local` local-dev
      options (confirmed gitignored via `git check-ignore`), and EAS/CI
      secret provisioning — explicitly telling readers not to put it in
      `eas.json` (which is committed).
- [x] 3.3 Confirm the missing-token error state (per
      `v2-tiles-app-shell`'s spec) surfaces clearly rather than rendering
      a blank scene.
      **Done**, plus a real bug found and fixed along the way. Added
      `MissingCesiumTokenNotice.tsx` (+ spec) and wired it into `App.tsx`
      as an early return when `!config.isCesiumConfigured`. Verifying this
      via a full `App` render initially hit a `Cannot read properties of
      null (reading 'useState')` failure — traced (not guessed) to my own
      test file: it called `jest.resetModules()` then `require('./App')`
      *after* `@testing-library/react-native` had already been statically
      imported at the top of the file, which had already captured a
      pre-reset `react`/`react-test-renderer` instance in its own closure
      — a genuine Jest gotcha, unrelated to the react-version investigation
      in task 2.2. Fixed by reverting to a plain static top-level `import`
      (matching `apps/Globify`'s existing convention) and asserting the
      real default behavior directly: since no token is configured in the
      test/CI environment, the notice **is** what renders by default — a
      meaningful regression test, not a contrived one. `pnpm nx test
      globify-tiles` (2/2) and `pnpm nx lint globify-tiles` both pass;
      `pnpm nx test Globify` (v1, 324/324) confirmed unaffected throughout.

## 4. Core tiles rendering

- [x] 4.1 Wire `TilesRenderer` + `GlobeControls` +
      `CesiumIonAuthPlugin` (asset `2275207`) through the confirmed r3f
      API from task 1.2, registering `TilesFadePlugin` and
      `UpdateOnChangePlugin` as the reference example does.
      **Done.** New `apps/globify-tiles/src/components/Globe/TilesGlobeScene.tsx`
      wires `<TilesRenderer>` + `<TilesPlugin plugin={CesiumIonAuthPlugin}>`
      (asset `2275207`, token from `config.cesiumIonToken`) +
      `<TilesPlugin plugin={TilesFadePlugin}>` +
      `<TilesPlugin plugin={UpdateOnChangePlugin}>` + `<GlobeControls>` +
      `<TilesAttributionOverlay>`, replacing `App.tsx`'s placeholder body.
      Found two real upstream type-declaration gaps while wiring this up
      (the runtime behavior is correct and documented in the package's own
      README; only its `.d.ts` files are incomplete/too strict): (1)
      `EllipsoidContext` is exported at runtime via `3d-tiles-renderer/r3f`
      but missing from its type declarations — used the properly-typed
      `TilesRendererContext` instead (see task 4.4). (2) `<TilesPlugin>`'s
      `args` prop is typed strictly as a constructor-parameters tuple, but
      the README's own examples pass a bare options object for
      single-argument plugins — fixed by wrapping each in a one-element
      array (`args={[{...}]}`), which is both type-correct *and* exactly
      what the component's own `Array.isArray(args)` branch expects, not a
      workaround.
- [x] 4.2 Wire the per-frame update loop (`controls.update()`,
      `tiles.update()`, `renderer.render(...)` or r3f's `useFrame`
      equivalent) per the `v2-tiles-app-shell` spec's update-loop
      requirement.
      **Already done by using the components as designed** — confirmed
      during task 1.2's spike and true here too: `<TilesRenderer>` and
      `<GlobeControls>` each run their own internal `useFrame` (tiles'
      resolution/update, and controls' update at priority `-1` so it runs
      before tiles). No additional render-loop code was needed or written.
- [x] 4.3 Register `GLTFExtensionsPlugin` with Draco decoding; bundle the
      Draco decoder assets the same way other binary assets ship in this
      app (extend Metro `assetExts` if new file types are involved).
      **Done, with a deliberate mitigation.** `GLTFExtensionsPlugin` is
      registered with a module-level singleton `DRACOLoader` (not
      recreated per render — it owns worker/network resources) pointed at
      the public `gstatic.com/draco/versioned/decoders/` CDN, matching
      what three.js's own examples do — no local asset bundling needed, no
      Metro config changes required. **Deliberately forced
      `dracoLoader.setDecoderConfig({ type: 'js' })`** to use the pure-JS
      decoder instead of the default WASM one — three.js's `DRACOLoader`
      uses `WebAssembly`/`Worker` internally for the WASM path, which is
      exactly the class of native-runtime risk flagged (for
      `postprocessing`'s SMAA) in task 1.4/`design.md`'s risks. This
      sidesteps that specific risk for Draco proactively rather than
      discovering it later on-device.
- [x] 4.4 Verify camera framing/starting position (e.g. above a
      recognizable location) and basic orbit/zoom interaction feel
      reasonable before moving on — exact `GlobeControls` tuning is an
      open question per `design.md`, revisit later if needed.
      **Done, framing only — interaction feel still needs a real device/
      browser check** (not verified visually in this sandbox — no browser
      available here; confirmed only that it bundles and the ellipsoid
      math runs without throwing). New `InitialCameraPosition.tsx`
      component (child of `<TilesRenderer>`) reads `tiles.ellipsoid` via
      `TilesRendererContext` and calls `getCartographicToPosition` once on
      mount, framing the camera 2,000 km above Chicago, IL — a recognizable
      point roughly central to this app's US-focused dataset, and a
      placeholder tunable once real data/markers exist (task 7). Exact
      `GlobeControls` damping/speed feel is unverified and remains this
      task's open follow-up, same as `design.md` already flagged.

## 5. Extract the shared supply-chain services library

- [x] 5.1 Add a `libs/*` (or `packages/*`) glob to `pnpm-workspace.yaml` —
      first entry of its kind in this workspace.
      **Done.** Added to both `pnpm-workspace.yaml`'s `packages:` list and
      the root `package.json`'s `workspaces` array (the latter is an
      npm-style duplicate this repo already carried).
- [x] 5.2 Use the `nx-generate` skill to scaffold the new shared library
      project.
      **Done, same substitution as task 2.1** (the skill isn't registered
      in this environment) — used `pnpm nx g @nx/js:library
      libs/globify-services --bundler=none --unitTestRunner=jest
      --linter=eslint --importPath=@jw-dev/globify-services`. Removed the
      generator's placeholder `src/lib/globify-services.ts` files.
- [x] 5.3 Move `apiClient.ts`, `supplyChainData.ts`, `riskVisuals.ts`,
      `disruptionVisuals.ts`, `selectionHighlight.ts`, `lodClustering.ts`,
      `truckVisuals.ts`, `truckStatus.ts`, `carModel.ts`,
      `collisionDetection.ts`, `resolveGlobeClick.ts`,
      `gpsStreamService.ts`, `streamTicketService.ts`,
      `useVehiclePositions.ts`, `authService.ts`, `config.ts` (and every
      matching `.spec.ts`) from `apps/Globify/src/services/` into the new
      library, preserving each file's tests unmodified.
      **Done via `git mv`**, plus one real discovery the task description
      didn't anticipate: several of these files import shared domain types
      (`DataPoint`, `ArcData`, `Location`, `SupplyRoute`, `NetworkRiskMetrics`,
      etc. — 19 types total) from `components/Globe/types.ts`, and visual
      constants (colors, thresholds, car-model proportions — 37 constants
      total) from `components/Globe/constants.ts`. Moving the services
      without their type/constant dependencies would leave the library
      unable to compile (or force it to depend back on the app — an Nx
      anti-pattern). Extracted exactly the subset each moving file actually
      uses into new `libs/globify-services/src/lib/types.ts` and
      `constants.ts`, verified against each file's *full* import list (not
      just the visible lines — grep with a line cap silently truncated
      several multi-line import blocks during audit, caught by reading
      each file's imports in full rather than trusting the truncated
      grep). Left everything tied to `apps/Globify`'s specific rendering
      scale (globe-relative units, camera/zoom distances, star background,
      `RoutePathSegment`/`GlobeState`/`GlobeVisualizationProps`/`ViewMode`)
      in the app. `apps/Globify/src/components/Globe/types.ts` and
      `constants.ts` now re-export the moved names from
      `@jw-dev/globify-services`, so none of the ~30 other files in the app
      that import from `./types`/`./constants` needed touching at all —
      only the services' own import paths and the ~23 files that imported
      services directly needed updating (task 5.4).
- [x] 5.4 Update `apps/Globify`'s imports to pull these modules from the
      new library instead of local relative paths.
      **Done** across all ~23 consumer files (hooks, `GlobeVisualization.tsx`,
      `GlobeScene.tsx`, `TruckLayer.tsx`, `TruckDetailPanel.tsx`, `GlobeHud.tsx`,
      `App.tsx`, `AuthProvider.tsx`, and their specs), consolidating
      multi-line imports from several old service paths into one
      `@jw-dev/globify-services` import per file where that was cleaner.
      Also updated `jest.mock('../services/useVehiclePositions', ...)` /
      `jest.mock('../../services/apiClient')` call sites (found via a
      second, broader grep pass after the first pass missed them — they
      don't match a plain `from '...'` import pattern) to
      `jest.mock('@jw-dev/globify-services', ...)`, using
      `...jest.requireActual('@jw-dev/globify-services')` to pass every
      other export through untouched where a factory function was already
      used.
- [x] 5.5 Run `pnpm nx test Globify` and `pnpm nx lint Globify` — confirm
      zero behavior change (per the `v2-supply-chain-overlay` spec's
      "v1 continues to pass its existing tests" scenario).
      **Done, plus real config bugs found and fixed along the way** (none
      were version/logic changes — every fix below was to *generated
      config the library didn't need to redo but had to match*):
      - The `@nx/js:library` generator set `"type": "module"` in the new
        lib's `package.json`, which conflicts with the CJS
        `module.exports` style `babel.config.js` needs (and which every
        other babel/jest config in this repo already uses) — removed it.
      - The generated `tsconfig.lib.json`/`tsconfig.spec.json` had
        `"types": ["node"]` with no `"dom"` lib, so `window`/`localStorage`/
        `WebSocket` (used by `authService.ts`/`gpsStreamService.ts`) failed
        to typecheck; `apps/Globify/tsconfig.app.json` already solved this
        with `"lib": ["es2022", "dom", "dom.iterable"]` — mirrored that.
      - `noUnusedLocals` wasn't disabled for spec files in the new lib
        (v1's `tsconfig.spec.json` already disables it) and
        `src/test-setup.ts` wasn't excluded from the "lib" typecheck
        project (v1 excludes it there and includes it only under "spec",
        via an explicit `"files"` entry) — mirrored both.
      - `three`'s `examples/jsm` ESM-only distribution broke
        `carModel.ts`'s `BufferGeometryUtils` import under Jest — v1's own
        `jest.config.ts` already carries a `transformIgnorePatterns` fix
        for exactly this with a comment explaining why; copied it verbatim.
      - Found one **genuine, pre-existing latent type error** in
        `useVehiclePositions.ts` (a `fetch().then()` callback typed against
        `PositionUpdate[]` where the resolved value is actually `unknown`)
        — unrelated to the move itself, surfaced only because this was the
        first time `typecheck` (not just `test`/`lint`) ran against this
        exact file in this exact config combination. Fixed by typing the
        parameter `unknown` and casting after the existing
        `Array.isArray` runtime guard, which TS narrows correctly.
      - `apps/Globify/src/components/Globe/types.ts`'s re-export barrel
        needed its `import type` line moved before the `export type {...}
        from` block (`import/first` lint rule).
      - New Nx TS project references needed `pnpm nx sync` to wire
        `apps/Globify`'s and `apps/globify-tiles`'s `tsconfig.app.json`
        to depend on `libs/globify-services/tsconfig.lib.json` — running
        `lint`/`typecheck` without it fails with "workspace is out of
        sync."
      - `"@jw-dev/globify-services": "*"` in both apps' `package.json`
        made pnpm try to fetch the package from the real npm registry
        (404) instead of linking the workspace package — needed the
        `workspace:*` protocol instead.
      **Final verification**: `pnpm nx test Globify` → 22 suites / 126
      tests green; `pnpm nx test globify-services` → 14 suites / 198 tests
      green. **126 + 198 = 324 — the exact same total test count as
      before the move**, confirming no test was lost, duplicated, or
      silently skipped. `pnpm nx run-many -t lint typecheck test -p
      Globify globify-services globify-tiles` all green (only
      pre-existing-style lint *warnings* remain, zero errors). Re-verified
      `expo export -p web` bundles cleanly for both `Globify` (660
      modules) and `globify-tiles` (167 modules) after the migration.
- [x] 5.6 Add the new library as a dependency of `apps/globify-tiles`.
      **Done** (`"@jw-dev/globify-services": "workspace:*"`), along with
      `expo-constants` (needed transitively by the library's `config.ts`,
      not previously a `globify-tiles` dependency).

## 6. Coordinate bridge

- [x] 6.1 Implement a lat/lng(/altitude) → ECEF conversion function using
      the `TilesRenderer` instance's `ellipsoid` API (method name to
      confirm during task 1.2's API read).
      **Done.** New `apps/globify-tiles/src/services/ecefBridge.ts` —
      `latLngToEcef(ellipsoid, latDeg, lngDeg, altitudeM, target?)` converts
      degrees to radians and delegates to `Ellipsoid.getCartographicToPosition`,
      matching task 1's confirmed signature. Lives in the app, not
      `@jw-dev/globify-services` — it's the one piece specific to
      `3d-tiles-renderer`'s `Ellipsoid` type, which the shared library has
      no reason to depend on. Takes an optional `target` Vector3 to avoid
      allocating on every call (many markers/trucks per frame).
- [x] 6.2 Write unit tests asserting known coordinates map to the expected
      ECEF position within a documented tolerance, matching the
      `v2-supply-chain-overlay` spec's coordinate-bridge scenario.
      **Done — 5 tests, all passing**, checked against the library's own
      `WGS84_ELLIPSOID`/`WGS84_RADIUS`/`WGS84_HEIGHT` constants rather than
      hardcoded meter values (so the test can't silently drift from
      whatever the library's actual ellipsoid shape is): equatorial
      surface point sits at `WGS84_RADIUS` from center; the pole sits at
      `WGS84_HEIGHT` (closer than the equator, correctly reflecting WGS84's
      oblate flattening); different longitudes produce different positions;
      altitude increases distance from center monotonically and by
      approximately the altitude delta; a provided `target` is reused, not
      replaced.

      **Second real Jest+ESM resolution problem found and solved** (a
      harder case than task 4's App.tsx workaround, since this test
      genuinely needs the real `3d-tiles-renderer/three` and `/core`
      modules synchronously, not something that can be deferred):
      `3d-tiles-renderer`'s subpath exports (`./three`, `./core`, etc.)
      declare only an `"import"` condition and have **no** `"./package.json"`
      export either, so `require.resolve()` on *any* path in this package
      fails under Jest's default CJS resolution — not just the bare
      specifier. Tried `testEnvironmentOptions.customExportConditions:
      ['import']` first (the "textbook" Jest fix); it broke both other
      passing test suites, because it changes resolution for *every*
      package in `node_modules`, not just this one (`@babel/runtime`
      started resolving to its ESM build, which isn't transformed).
      Reverted, and instead added a `jest.config.ts` `moduleNameMapper`
      that locates the package's real directory via a plain
      `node_modules` filesystem walk (`fs.existsSync`/`fs.realpathSync`,
      not `require.resolve` or Node's module algorithm at all — sidesteps
      the exports gate entirely) and maps each subpath directly to its
      built file, plus extended `transformIgnorePatterns` (same pattern
      as `apps/Globify`'s existing `three/examples` fix) so Jest actually
      transforms that ESM output instead of just finding it. This is a
      reusable pattern for any future test that needs a real
      `3d-tiles-renderer` import — worth carrying into tasks 7-9.

## 7. Supply-chain overlay on the tiles scene

- [x] 7.1 Render location markers (supplier/DC/restaurant) at bridged
      ECEF positions, reusing marker-shape/color conventions from v1's
      `createLocationMarker`/`createClusterMarker` logic where it doesn't
      depend on `three-globe`.
      **Done, real backend data.** New `apps/globify-tiles/src/hooks/useSupplyChainData.ts`
      (TanStack Query, added as a new dependency of this app) fetches
      `/supply-chain/visualization` via the shared `apiClient` — same
      endpoint, same response shape as v1's hook, no auth gate yet (task 8
      ports that; matches v1's own "Cognito unconfigured → auth bypassed"
      local-dev mode until then). New
      `apps/globify-tiles/src/components/Globe/LocationMarkers.tsx` maps
      the shared `transformToDataPoints()` output through
      `latLngToEcef()`, rendering cone/box/sphere per
      supplier/DC/restaurant (v1's convention) — reimplemented rather than
      literally reused, since the original `createLocationMarker` bakes in
      globe-relative altitude placement tied to `three-globe`. Colors/point
      radii still come from the shared `POINT_COLOR_*`/`POINT_RADIUS_*`
      constants; only the mesh-building and positioning code is new. Marker
      size is a real-world meters constant (8km), not the globe-relative
      units v1 used — flagged as tunable, matching design.md's open
      question on real-world scale factors.
- [x] 7.2 Render supply-route arcs/lines between bridged endpoint
      positions, driven by the shared library's route-coloring functions.
      **Done.** New `RouteArcs.tsx` uses the shared `transformToArcs()`
      output directly (unmodified), rendering each as a `@react-three/drei`
      `<Line>` interpolated through 32 segments with a sine-curve altitude
      bump (200km peak) so routes arc above the surface rather than
      clipping through terrain — matching v1's visual convention of
      floating dashed arcs. **Known limitation, not yet handled**: lat/lng
      interpolation is linear, not great-circle, and doesn't handle
      antimeridian wraparound (the old, now-removed tile system had to
      solve exactly this for its own tile-index math) — acceptable for
      this app's US-only dataset, would need fixing before any route could
      plausibly cross the ±180° line.
- [ ] 7.3 Render truck markers from `useVehiclePositions`
      (REST poll + WebSocket stream), reusing `carModel.ts`'s procedural
      mesh and `truckVisuals.ts`'s color/pulse logic, updated on each new
      GPS ping per the spec's live-truck-marker scenario.
- [ ] 7.4 Wire view-mode switching (`standard` / `concentration-risk` /
      `disruption`) as pure color/highlight transforms on marker and
      route data — no camera or renderer changes.
- [ ] 7.5 Wire entity-detail-panel selection (raycast or equivalent hit
      test against markers) reusing the existing entity-detail data hook
      and panel-rendering logic.
- [ ] 7.6 Revisit LOD clustering (`lodClustering.ts`) and collision-offset
      (`collisionDetection.ts`) tuning for ellipsoid/ECEF scale if the
      default behavior looks wrong once real data is on screen (open
      question from `design.md`).

## 8. Reused HUD chrome and auth gate

- [ ] 8.1 Port `ui/theme.ts`, `ui/layout.ts`, `ui/Shape.tsx` and existing
      panel components into the v2 app (via the shared library if truly
      framework-agnostic, or duplicated only if genuinely
      Expo-app-specific — prefer sharing).
- [ ] 8.2 Wire the slot-based HUD layout around the new tiles canvas.
- [ ] 8.3 Port `AuthProvider.tsx`'s Cognito Hosted-UI flow into the v2
      app, registering its token getter with the v2 app's `apiClient`
      instance.
- [ ] 8.4 Confirm the `isAuthEnabled`-gated local-dev bypass works
      identically to v1.

## 9. Optional atmosphere + volumetric clouds layer

- [x] 9.1 Add an off-by-default toggle for the atmosphere/clouds layer per
      the `v2-atmosphere-clouds` spec.
      `TilesGlobeScene.tsx` holds `atmosphereEnabled` state (`useState(false)`)
      and renders `AtmosphereCloudsControls` outside the `<Canvas>` (this
      required restructuring `TilesGlobeScene` to return a wrapping RN
      `<View style={{flex:1}}>` around `<Canvas>` + the controls, since it
      previously returned `<Canvas>` directly). The layer itself is only
      mounted inside `<Canvas>` when `atmosphereEnabled && !atmosphereUnavailable`,
      so it's not just visually hidden — it's not constructed at all until
      opted in, avoiding the precompute cost by default.
      Time-of-day is a `hour` state (default noon) with a fixed reference
      calendar date, exposed via `AtmosphereCloudsControls`' Dawn/Noon/Dusk/Night
      preset buttons rather than a continuous slider — see the note under
      9.2/9.3 below on why, and the code comment in
      `AtmosphereCloudsControls.tsx` for the full reasoning (avoiding a new
      native-module dependency after the zustand/`import.meta` Metro
      resolution saga in task 2.3).
- [x] 9.2 / [x] 9.3 (folded together — see note): originally scoped as
      "manually wire `PrecomputedTexturesGenerator(renderer).update()`" and
      "manually construct `AerialPerspectiveEffect`/`CloudsEffect` and bridge
      via `<primitive object={...}>`". Reading `@takram/three-atmosphere`'s
      and `@takram/three-clouds`' actual r3f entry points
      (`@takram/three-atmosphere/r3f`, `@takram/three-clouds/r3f`) and their
      TypeScript declarations directly (not guessing) showed this manual
      wiring is unnecessary: the r3f `<Atmosphere date={...}>` /
      `<SkyLight>` / `<SunLight>` / `<AerialPerspective>` / `<Clouds>`
      components already do it internally — when `textures`/`stbnTexture`
      props are left undefined, each package generates its own precomputed
      textures client-side via its internal `PrecomputedTexturesGenerator`
      (confirmed in `@takram/three-atmosphere`'s own README: "If left
      undefined, the textures will be generated using
      PrecomputedTexturesGenerator"), and that generation is Suspense-driven
      (r3f's `useLoader` internally), so wrapping the whole layer in a
      `<Suspense fallback={null}>` (done in `AtmosphereCloudsLayer.tsx`) is
      the loading-indicator equivalent the original task text asked for —
      it lets the base tiles scene (a `<Canvas>` sibling, outside the
      Suspense boundary) keep rendering and stay interactive while it
      resolves, rather than blocking first paint.
      `AerialPerspective`/`Clouds` are `postprocessing` `Effect` subclasses
      under the hood, and `@react-three/postprocessing`'s `<EffectComposer>`
      accepts them as JSX children directly (no manual `<primitive
      object={...}>` bridging needed — that would only be required for a
      raw non-r3f `Effect` instance).
      Sun direction also needed no manual ECEF math (unlike the vanilla
      `webgl_loader_3dtiles.html` reference example) — `<Atmosphere
      date={date}>` takes a plain `Date`/`number` and derives sun position
      internally.

      **Correction (live, user-reported)**: the first composition —
      `<Atmosphere date={date}><SkyLight /><SunLight /></Atmosphere>` as a
      sibling of `<EffectComposer><AerialPerspective sky sunLight skyLight />
      <Clouds coverage={0.3} /></EffectComposer>` — rendered fully black
      with only a thin white line at the globe's silhouette when the user
      tried it live. Root-caused per systematic-debugging by reading
      `@takram/three-clouds`' README directly rather than continuing to
      guess: its own "Default clouds" example is explicitly the
      "3d-tiles-renderer-integration" pattern (Storybook stories literally
      named Tokyo/Fuji/London 3D-tiles demos) — i.e. this library's own
      reference build for our exact use case — and it differs from what was
      built in three load-bearing ways:
        1. `<Clouds>` must precede `<AerialPerspective>` inside
           `<EffectComposer>` (had them reversed) — AerialPerspective reads
           buffers Clouds writes (e.g. shadow length); wrong order starves
           it of that input.
        2. `<EffectComposer>` needs `enableNormalPass` (was omitted) —
           AerialPerspective reconstructs world position from depth+normal
           to compute inscatter/transmittance per pixel, and silently
           produces black output without a normal buffer to read.
        3. `<EffectComposer>` belongs nested *inside* `<Atmosphere>`, and
           neither `<Sky>` nor `<SkyLight>`/`<SunLight>` are part of this
           pattern at all — the `sky`/`sunLight`/`skyLight` booleans already
           on `<AerialPerspective>` are a distinct "post-process lighting"
           mode that handles sky background and lighting entirely inside
           the postprocess pass; mixing in the "light-source lighting" mode
           components (`<Sky>`/`<SkyLight>`/`<SunLight>`) on top isn't a
           documented combination and isn't needed for the tiles' own
           (unlit, baked) textures.
      Fixed by mirroring the README snippet exactly (down to prop order):
      `<Atmosphere date={date}><EffectComposer enableNormalPass><Clouds
      qualityPreset="high" coverage={0.4} /><AerialPerspective sky sunLight
      skyLight /></EffectComposer></Atmosphere>`. Re-verified: typecheck/
      lint/test green, `expo export -p web` succeeds (846 modules). Visual
      re-confirmation is pending the user trying it live again.
- [x] 9.4 Add error handling so a precompute failure falls back to the
      base tiles scene and reflects "unavailable" in the toggle state,
      without crashing the app.
      `AtmosphereCloudsErrorBoundary.tsx` — a class component (React has no
      hook-based error-boundary equivalent) wrapping `AtmosphereCloudsLayer`'s
      contents. `componentDidCatch` logs a warning and calls `onError()`,
      which `TilesGlobeScene` wires to `setAtmosphereUnavailable(true)`. That
      flag both unmounts the layer (render returns `null` on `hasError`) and
      permanently disables re-mounting it (the `!atmosphereUnavailable` guard
      in `TilesGlobeScene`), so a broken Beta dependency degrades once to the
      base tiles scene instead of retry-looping. `AtmosphereCloudsControls`
      reflects this via its `unavailable` prop, swapping the toggle label to
      "Atmosphere/clouds unavailable" and hiding the time-of-day presets.
      TypeScript's `noImplicitOverride` required explicit `override` on
      `state`/`componentDidCatch`/`render` — caught by `typecheck`, not
      anticipated up front.

      **Verification for all of 9.1-9.4**: `pnpm nx run globify-tiles:typecheck`,
      `:lint`, `:test` all green (7/7 tests, same 3 suites as before — no new
      test file was added since this is UI composition/state wiring, not new
      pure logic). `npx expo export -p web` and `-p android` both succeeded
      (855 and 1208 modules respectively); grepped the exported web bundle
      for `import.meta` (0 occurrences — no regression of the task-2.3 zustand
      fix) and for atmosphere/clouds symbol names (present, confirming the
      new code is actually bundled in, not dead-code-eliminated).

      **Second correction (live, user-reported)**: after the composer-order
      fix above, the user reported "black clouds" and a "microscope"-style
      distortion when zooming, and supplied the actual
      `webgl_loader_3dtiles.html` reference source directly, asking whether
      following it more closely from the start would have avoided this.
      Yes — comparing our r3f composition line-by-line against that source
      (per systematic-debugging's Phase 2 pattern-analysis step) surfaced
      four more real divergences, none of which had been checked against
      the reference until it was actually read in full:
        1. **Camera near/far**: was `{ near: 1, far: 1e9 }` — a 1e9 near:far
           ratio, catastrophic for a 24-bit WebGL depth buffer. The
           reference uses `near: 10, far: 1e6` (ratio 1e5). The "microscope"
           distortion when zooming in close to tile detail is the textbook
           symptom of exactly this class of depth-precision loss. Fixed in
           `TilesGlobeScene.tsx` (`CAMERA_NEAR`/`CAMERA_FAR` constants).
        2. **Tone mapping / HDR output**: the reference explicitly
           constructs its renderer with `outputBufferType: HalfFloatType`
           and sets `toneMapping = AgXToneMapping` / `toneMappingExposure =
           10`. AerialPerspective/Clouds emit physically-based radiance
           values designed for that pipeline; r3f's `<Canvas>` defaults to
           `ACESFilmicToneMapping` at exposure 1 with a standard output
           buffer, which reads as much darker than intended — the "black
           clouds" symptom. Fixed via a `gl` factory function
           (`createGlobeRenderer` in `TilesGlobeScene.tsx`) rather than a
           plain `gl` options object — `outputBufferType` is a constructor
           option and `toneMapping`/`toneMappingExposure` are
           post-construction instance properties, and only the factory form
           of r3f's `GLProps` type is guaranteed to apply both.
        3. **`adjustHeight` camera-drift workaround**: the reference has an
           explicit comment — "Workaround: adjustHeight causes camera drift
           as tiles load. Disable until first user interaction" — disabling
           `GlobeControls.adjustHeight` until the first `pointerdown`/`wheel`
           event, then leaving it on permanently. This wasn't ported at all
           in the first pass (`<GlobeControls enableDamping />` had no
           `adjustHeight` handling), and is a second, independent
           contributor to the reported zoom weirdness. Reproduced verbatim
           in a new `AdjustHeightOnInteraction.tsx` component, wired via a
           `ref` on `<GlobeControls>`.
        4. **Camera orientation**: `InitialCameraPosition.tsx` only set
           position (`getCartographicToPosition` + `camera.lookAt(0,0,0)`);
           the reference sets both position AND a deliberate cinematic
           orientation in one call via
           `ellipsoid.getObjectFrame(lat, lon, height, -90°, -10°, 0,
           matrix, CAMERA_FRAME)`. The two are nearly indistinguishable at
           high orbital altitude (this app's original 2,000,000m initial
           altitude) but diverge meaningfully at the reference's low
           500m flyover altitude. Also fixed `INITIAL_CAMERA_ALTITUDE_M`
           itself: 2,000,000m was an orbital-overview altitude with no
           connection to the reference; the whole point of the
           photorealistic tiles dataset is building-level detail, which is
           only visible at the reference's ~500m flyover altitude. Changed
           to 500m, keeping this app's own Chicago lat/lon (not Tokyo).
      Two upstream `3d-tiles-renderer/three` declaration gaps surfaced
      while wiring `CAMERA_FRAME`/`getObjectFrame` and are worth flagging
      for whoever touches this next: (a) `CAMERA_FRAME` (and
      `ENU_FRAME`/`OBJECT_FRAME`/`Frames`) are real runtime exports of that
      module but missing from its public `.d.ts` — same class of gap as the
      already-documented `EllipsoidContext` one, worked around via a
      `declare module` augmentation in
      `src/types/3d-tiles-renderer-three-augment.d.ts` rather than
      `@ts-expect-error`-ing at the call site, since there's no alternative
      typed API for this one; (b) that augmentation file's first draft
      silently replaced (not merged with) the rest of the module's real
      types, breaking unrelated imports elsewhere in the app, because a
      `.d.ts` file with no top-level `import`/`export` is an ambient
      *global* declaration rather than a module augmentation — fixed by
      adding `export {}` to make the file itself a module first. Separately,
      `HTMLCanvasElement.addEventListener`/`removeEventListener` (used by
      the new `AdjustHeightOnInteraction.tsx`) needed `"dom"` added to
      `tsconfig.app.json`'s `lib` array — this app had no DOM-typed API
      usage before now, mirroring the same gap already fixed for
      `libs/globify-services` (see task 5's typecheck fix).
      Re-verified: `typecheck`/`lint`/`test` all green, `expo export -p web`
      (857 modules) and `-p android` (1210 modules) both succeed, and the
      web bundle still shows 0 `import.meta` occurrences. Visual
      re-confirmation is pending the user trying it live again.

      **Third correction (live, user-reported + full source comparison)**:
      after the two fixes above, the user reported that adjusting time of
      day didn't relight buildings the way the reference does, and asked
      for a genuinely thorough line-by-line comparison against the
      reference source rather than continuing to chase individual reported
      symptoms — the prior two rounds had each found real bugs, but by
      reacting to one report at a time rather than doing the full
      comparison up front. Doing that full comparison this time surfaced:
        1. **Static scene lights masking the actual signal (root cause of
           "time of day doesn't relight buildings")**: `TilesGlobeScene.tsx`
           had a leftover `<ambientLight intensity={0.6} />` +
           `<directionalLight position={[1,1,1]} intensity={1} />` from
           before the atmosphere layer existed. The reference has *zero*
           Three.js scene lights anywhere — it relies entirely on
           AerialPerspective's post-process `sunLight`/`skyLight` for
           illumination. A constant, time-invariant light source rendered
           alongside AerialPerspective's genuinely time-varying one reads
           as "nothing changed" when the time-varying component is subtler
           by comparison. Removed both. Photorealistic tiles ship
           photogrammetry-baked (already-lit) textures, so they render
           correctly with zero added lights either way — the reference
           proves this by working with none at all, atmosphere always on.
        2. **Cloud movement and cloud-cast shadows genuinely absent**
           (the user asked directly whether these were apparent in the
           reference source — yes): the reference sets
           `clouds.localWeatherVelocity.set(0.001, 0)` for drift and a full
           `clouds.shadow.{farScale,maxFar,cascadeCount,mapSize,splitMode,
           splitLambda}` cascaded-shadow-map config; `AtmosphereCloudsLayer.tsx`
           set neither. Ported both via r3f's dash-prop convention for
           nested properties (`shadow-farScale`, `shadow-mapSize`, etc. —
           confirmed supported by `@takram/three-clouds`'s own
           `ExpandNestedProps<CloudsEffect, 'shadow'>` type). Also corrected
           `coverage` from `0.4` back to the reference's `0.3`, and dropped
           `qualityPreset="high"`, which had been carried over from a
           *different* README example, not the actual reference — matching
           the reference means matching its real configuration, not a
           plausible-looking substitute from an unrelated example.
        3. **Camera FOV**: reference is `new THREE.PerspectiveCamera(75,
           ...)`; ours left `fov` unset on Canvas's `camera` prop. Set
           explicitly to `75`.
      Confirmed still correct via this same read-through (documenting the
      negative results, not just the fixes, since "did I check this" is
      the point of a from-scratch comparison): the `overlay`/`shadow`/
      `shadowLength` sync between Clouds and AerialPerspective that the
      reference does manually via a `clouds.events.addEventListener`
      listener, and the sun-direction sync it does manually via
      `getSunDirectionECEF` + `.copy()` onto both effects every time-of-day
      change — both confirmed, by reading the compiled r3f wrapper source
      of `@takram/three-atmosphere` and `@takram/three-clouds` directly
      (not assumed), to already happen automatically every frame via
      `AtmosphereContext`, as long as `<Clouds>`/`<AerialPerspective>` are
      both descendants of the same `<Atmosphere>` (they are) — not a gap.
      **Known remaining gaps, deliberately not closed this pass** (flagged
      rather than silently skipped, per the user's "match as perfectly as
      possible" ask):
        - `TileCreasedNormalsPlugin({ creaseAngle: 30° })` — present in the
          reference's plugin list, improves building-edge normal quality
          for the post-process lighting to react to. Confirmed absent from
          this project's installed `three@0.184.0` (`three/addons/misc/`
          has no such file) — it appears to require a newer three.js than
          this app is pinned to. Not attempted here: a three.js version
          bump is a materially bigger, riskier change (re-verifying every
          r3f/drei/postprocessing/3d-tiles-renderer peer-dependency
          compatibility) than this bug-fix pass, and shouldn't be done as
          a side effect of it.
        - `SMAAEffect` (antialiasing), `DitheringEffect` (reduces HDR→LDR
          banding), `LensFlareEffect` (sun flare) — all three are separate
          postprocessing passes in the reference's custom
          `renderer.setEffects()` pipeline. `@takram/three-geospatial-effects`
          (where `Dithering`/`LensFlare` live) ships no r3f entry point at
          all, so adding them isn't a prop away — it would need raw
          `postprocessing`-`Effect` instances bridged into
          `@react-three/postprocessing`'s `<EffectComposer>` manually.
          Deferred as a separate, scoped follow-up rather than folded into
          this fix.
      Re-verified: `typecheck`/`lint`/`test` all green, `expo export -p web`
      (857 modules) and `-p android` (1210 modules) both succeed, web
      bundle still 0 `import.meta` occurrences and confirmed containing the
      new `localWeatherVelocity`/`shadow.*` config. Visual re-confirmation
      is pending the user trying it live again.

      **Fourth round — closing the two deliberately-deferred gaps, plus a
      structural Metro/babel bug the three.js bump surfaced**: the user
      authorized bumping `three` to latest to unblock `TileCreasedNormalsPlugin`,
      and asked whether the remaining postprocessing passes could be
      bridged into r3f's `<EffectComposer>` without leaving r3f — yes,
      confirmed by reading `@react-three/postprocessing`'s own
      `EffectComposer.tsx` source directly: it collects passes by walking
      its React children's underlying `.object` and filtering
      `instanceof Effect || instanceof Pass`, generically — it doesn't care
      whether that instance came from one of its own wrapper components or
      elsewhere, so any r3f element resolving to an `Effect`/`Pass`
      instance qualifies.
        1. **three.js bump to `^0.185.1`** (from `^0.184.0`) in both
           `apps/globify-tiles/package.json` and `apps/Globify/package.json`
           — kept in sync deliberately rather than diverging the two apps'
           three versions. Checked first, not assumed: every relevant peer
           dependency (`@react-three/fiber`, `@react-three/drei`,
           `@react-three/postprocessing`, `3d-tiles-renderer`, all four
           `@takram/*` packages, `three-globe`) declares only an open lower
           bound on `three` (e.g. `>=0.170.0`), so nothing pins an upper
           bound that would block this. `pnpm install` succeeded; v1's full
           324-test suite (126 in `Globify` + 198 in `globify-services`,
           split by the earlier services extraction — confirmed by running
           both, not just trusting the lower number) and `globify-tiles`'
           own 7 tests all stayed green; v1's `typecheck`/`lint` also
           stayed clean (pre-existing warnings only, no new ones).
        2. **`TileCreasedNormalsPlugin`** (from `three/addons/misc/`, only
           available from three@0.185+) added to the tiles plugin list at
           the same position as the reference, `creaseAngle: 30°`. Its own
           upstream doc comment states its exact purpose: "Useful for
           photogrammetry tile sets like Google Photorealistic 3D Tiles
           which come without vertex normals" — i.e. these tiles ship with
           *no* vertex normals at all, which independently reinforces why
           AerialPerspective's normal-buffer-based lighting had nothing
           meaningful to read before this. No `.d.ts` exists yet for this
           addon (confirmed: DefinitelyTyped's `@types/three`, which is
           what actually types most other `three`/`three/addons/*` imports
           in this project, hasn't caught up) — added a minimal
           `declare module` shim in
           `src/types/three-addons-augment.d.ts` rather than leaving it as
           an unremarked implicit `any`.
        3. **`<LensFlare>`, `<SMAA>`, `<Dithering>`** added to the
           `<EffectComposer>` in the reference's exact order (after
           Clouds/AerialPerspective). **Correction to this same file's own
           prior note**: task 9's second-round comment claimed
           `@takram/three-geospatial-effects` "ships no r3f entry point at
           all" — that was wrong, caught this round by looking one level
           deeper. It has a proper `/r3f` subpath
           (`@takram/three-geospatial-effects/r3f`, missed earlier by only
           checking for a top-level `r3f.d.ts`/`r3f.js`, not a nested
           `r3f/` directory) exporting real `LensFlare`/`Dithering`
           wrapper components. `SMAA` is `@react-three/postprocessing`'s
           own built-in (`wrapEffect(SMAAEffect)`). No manual `<primitive
           object={...}>` bridging was actually needed for any of the
           three, despite that being the plan going in — worth recording
           as a wrong assumption caught before it became wasted work, not
           quietly dropped.
        4. **New structural bug, found while verifying #2/#3 via a real
           Android bundle export** (not assumed fixed from typecheck/lint/
           test alone — those can't catch a Metro-bundling-only failure):
           `three@0.185`'s `DRACOLoader.js` now does `new URL(path,
           import.meta.url)` unconditionally at module top level (present
           regardless of this app's own `type: 'js'` Draco decoder choice,
           which only affects which decoder gets *used*, not whether this
           line at the top of the file executes). This crashed Android/
           Hermes bundling outright: "`import.meta` is not supported in
           Hermes. Enable the polyfill `unstable_transformImportMeta` in
           babel-preset-expo to use this syntax." Adding that exact option
           to `apps/globify-tiles/babel.config.js` (replacing the old
           hand-rolled `overrides`/`babel-plugin-transform-import-meta`
           approach entirely, not layering it alongside — the two could
           conflict: the old plugin likely reduced `import.meta` to `{}`,
           and if it ran first, `({}).url` is `undefined`, and `new
           URL(path, undefined)` throws) did **not** fix it — the bundling
           error persisted identically, including after `-c` (force cache
           clear) and after confirming via `@babel/core` called directly
           (bypassing Metro) that the config, in isolation, transforms the
           file correctly.
           Root-caused via the same instrumentation technique that broke
           open the task-2.3 zustand bug: added a top-level
           `fs.appendFileSync` inside `apps/globify-tiles/babel.config.js`
           itself — zero log lines were written across a full Android
           bundle run, proving that file was never loaded for this file's
           transform at all, the same non-invocation signature as before,
           different mechanism this time. Traced into
           `@expo/metro-config`'s `babel-transformer.js`/
           `loadBabelConfig.js` source directly: it resolves
           `.babelrc`/`.babelrc.js`/`babel.config.js` relative to Metro's
           `projectRoot` option for files (like node_modules ones) that
           can't otherwise resolve a config — and confirmed directly
           (`require('./metro.config.js').projectRoot`) that `withNxMetro`
           sets `projectRoot` to the **monorepo root**, not
           `apps/globify-tiles`. The repo root had only `babel.config.json`
           (not matched by that lookup's fixed `['.babelrc', '.babelrc.js',
           'babel.config.js']` list) — so it silently fell back to bare
           `babel-preset-expo` with none of the app's options, for any file
           reached this way. This is the same *class* of bug as task 2.3
           (an Nx Metro wrapper silently discarding project config) but a
           different mechanism (babel config resolution via `projectRoot`,
           not the resolver) and a different root file (repo root, not app
           root) — worth naming explicitly since "resolver" and
           "transformer" are genuinely separate Metro subsystems and this
           could easily recur as a third variant somewhere else.
           Fixed by replacing the repo-root `babel.config.json` with a new
           `babel.config.js` there, duplicating the same
           `unstable_transformImportMeta: true` option. Its old sole
           content, `babelrcRoots: ["apps/*"]`, was dropped, not carried
           over — confirmed no `.babelrc*` file exists anywhere in the repo
           for it to apply to (both apps already use proper top-level
           `babel.config.js`), and it's actively incompatible with this
           file's dual role anyway: Babel rejects `babelrcRoots` in a
           config loaded via `extends` (which `loadBabelConfig` does), and
           hit that exact error directly before removing it.
           **Not fully investigated, flagged rather than assumed fine**:
           whether `apps/Globify`'s own node_modules-targeted babel
           overrides have this identical gap and have simply never been
           exercised by a dependency that needed them at Hermes-bundle
           time — v1's test suite doesn't do real Metro/Hermes bundling
           (confirmed pure-unit, no bundler involved), so this class of
           bug wouldn't surface there even if present.
      Re-verified after all four: `pnpm nx run-many -t
      typecheck,lint,test --projects=globify-tiles,Globify,globify-services`
      all green (9/9 tasks); `expo export -p web -c` (863 modules) and
      `-p android -c` (1216 modules) both succeed from a fully cleared
      cache; web bundle still 0 `import.meta` occurrences and confirmed
      containing `TileCreasedNormals`/`LensFlare`/`Dithering`/`SMAA`/
      `localWeatherVelocity` symbol names. Visual re-confirmation is
      pending the user trying it live again.

      **Fifth round — continuous time-of-day slider**: user asked whether
      the reference's live `<input type="range">` slider could be matched
      without giving up the earlier decision to avoid a new native-module
      dependency. New `TimeOfDaySlider.tsx` — a plain `View` thumb over a
      `View` track, positioned via `PanResponder`'s `onPanResponderGrant`/
      `onPanResponderMove` mapping touch `pageX` to an hour value
      (`view.measure()` for the track's on-screen position, since
      PanResponder's touch coordinates are screen-space, not
      parent-relative like `onLayout`'s own event) — calls `onHourChange`
      continuously while dragging, matching the reference's live-update
      behavior, not just on release. `AtmosphereCloudsControls.tsx`
      replaced its Dawn/Noon/Dusk/Night preset-button row with this slider
      plus a live `HH:MM` readout. No new dependency added.
      Re-verified: `typecheck`/`lint`/`test` all green; `expo export -p web
      -c` (870 modules) and `-p android -c` (1217 modules) both succeed
      from a fully cleared cache.

      **Known remaining gaps from the full source comparison, still open**:
      `SMAAEffect`/`Dithering`/`LensFlare` are now wired (closed this
      round); `TileCreasedNormalsPlugin` is now wired (closed this round).
      Still open: the reference's custom `renderer.setEffects()` pipeline
      construction itself (a lower-level integration technique not
      replicated 1:1, since `@react-three/postprocessing`'s
      `<EffectComposer>` is r3f's own equivalent abstraction and was the
      explicit integration choice per design.md's decision 3); pixel-exact
      tuning of cloud/atmosphere parameters beyond what's copied verbatim
      from the reference's literal values. Not chased further without a
      specific reported symptom pointing at them, per this round's
      steer toward doing full comparisons before reacting to individual
      symptoms — but not claimed as complete parity either.

      **Sixth round — web white screen from the task-9-sixth-fix's own
      polyfill**: live-reported "Uncaught TypeError: Failed to construct
      'URL': Invalid base URL at DRACOLoader.js:17" on web, plus a stale
      Metro cache warning (harmless — `-c`/cache-clear resolved it, not a
      code issue). Root-caused, not assumed: read
      `expo/src/winter/ImportMetaRegistry.ts` (backs the
      `unstable_transformImportMeta` fix from this task's earlier round) —
      its `.url` getter calls `getBundleUrl()`, which on web
      (`getBundleUrl.web.ts`) reads `document.currentScript?.src`.
      `document.currentScript` is only non-null while a `<script>` tag's
      own top-level code is synchronously executing (DOM spec, not an
      Expo quirk) — it's `null` for code reached via a *later*,
      asynchronously-triggered `require()`, which is exactly
      `App.tsx`'s own deferred `require('.../TilesGlobeScene')` (a
      deliberate choice from task 2's Jest-ESM fix, still in place) →
      DRACOLoader.js's top-level `import.meta.url` usage. So `.url`
      returns `null`, and `new URL(relativePath, null)` throws. Confirmed
      native is unaffected by reading `getBundleUrl.native.ts`: it reads
      `NativeModules.SourceCode.scriptURL`, a RN constant with no such
      timing dependency.
      No browser was available in this environment to test live
      end-to-end (`npx playwright install chrome` would be needed first) —
      verified instead by reproducing the *exact* failing/passing
      conditions in an isolated Node script: replicated
      `ImportMetaRegistry`/`getBundleUrl.web.ts` verbatim with
      `document.currentScript = null`, confirmed it throws
      `Invalid URL` exactly as reported, then applied the fix's own logic
      and confirmed the same call resolves to a valid absolute URL
      instead. This is a real substitute for "run it," not a skipped step
      — the failure mode was purely a JS-logic/timing bug with no
      browser-specific behavior involved, so reproducing the logic in
      isolation is a faithful test of the actual fix, not a shortcut
      around one.
      Fixed in `apps/globify-tiles/index.js` (the app's true entry point,
      evaluated before anything else): monkeypatches
      `globalThis.__ExpoImportMetaRegistry`'s `.url` getter, web-only
      (`typeof window !== 'undefined'`), to fall back to
      `window.location.href` — always a valid absolute URL regardless of
      *when* it's read, unlike `document.currentScript` — whenever the
      original getter returns null. Preserves the original getter's
      result when it's actually available (doesn't unconditionally
      override), and is `configurable: true` so it doesn't fight anything
      else that might also touch this property.
      Re-verified: `typecheck`/`lint`/`test` all green; `expo export -p web
      -c` (870 modules) and `-p android -c` (1217 modules) both succeed
      from a fully cleared cache.
      Also addressed, not a bug: the reported `expo@54.0.35 vs ~54.0.36` /
      `react@19.2.8 vs 19.1.0` version-mismatch warnings from `expo
      export`'s own compatibility check. The react ones are the
      deliberate global override from task 2.3 (`@react-three/
      postprocessing` requires `react ^19.2.0`) — expected, and the
      compatibility checker has no way to know that override is load-
      bearing. The expo one is a trivial patch-version gap with no
      reported functional symptom; not chased further.

      **Seventh round — atmosphere/clouds always-on, smoother slider,
      local-time lighting fix**: three more live-reported issues.
        1. **Atmosphere/clouds toggle removed, now always on** — user
           requested this directly: the reference has no "off" state
           either, and with the toggle off, the base tiles alone looked
           washed out. Root cause: `TilesGlobeScene.tsx`'s
           `createGlobeRenderer` applies `AgXToneMapping` +
           `toneMappingExposure = 10` unconditionally at the `<Canvas>`
           renderer level (needed for the atmosphere layer's HDR output),
           but that tone mapping doesn't know whether the atmosphere layer
           is actually mounted — applied to the tiles' own already-bright
           baked textures with no atmosphere contribution, exposure=10
           overexposes everything. Removing the "off" state removes the
           mismatch entirely rather than patching around it.
           `atmosphereEnabled`/`onToggle` removed from `TilesGlobeScene.tsx`
           and `AtmosphereCloudsControls.tsx`; `atmosphereUnavailable`
           (the error-boundary fallback) kept — graceful degradation on a
           broken Beta dependency is still worth having without a manual
           toggle.
        2. **Time-of-day slider granularity**: the reference's
           `<input type="range" step="0.01">` is effectively continuous;
           `TimeOfDaySlider.tsx` was snapping to the nearest 15 minutes
           (`Math.round(rawHour * 4) / 4`), reported live as lighting
           transitioning in visible discrete steps rather than a smooth
           fade. Removed the snap entirely — raw pixel-resolution
           granularity (200px track / 24h ≈ 8px/hour) is already far finer
           than the old 15-minute quantization.
        3. **Lighting darker than reference, "16:30 is the best lighting
           so far"**: root-caused, not tuned by trial and error. The
           slider's `hour` value was being passed straight into
           `setUTCHours` with no timezone adjustment — meaning the
           slider's "noon" was actually ~7am local solar time at this
           scene's Chicago lat/lon in June, nowhere near actual local solar
           noon, hence generally dim lighting. The reported "best lighting
           at 16:30" is the tell: 16:30 UTC = 11:30am CDT local, i.e.
           coincidentally close to real local solar noon — direct evidence
           for this exact bug, not a guess. This also directly explains the
           reference's own design: its code comment reads "0:00 UTC = 9:00
           AM Tokyo" — its `hourUTC` control is deliberately pre-offset so
           the slider aligns with the scene's *local* time, which is
           exactly the same fix applied here. Added
           `CHICAGO_UTC_OFFSET_HOURS = 5` (Chicago is UTC-5/CDT at the
           fixed June 21 reference date already in use — DST-exact
           correctness isn't the point for a fixed demo date) and convert
           `utcHour = (hour + CHICAGO_UTC_OFFSET_HOURS) % 24` before
           `setUTCHours`, so the slider's "12" now means local noon.
           `setUTCHours` accepting a fractional `hoursValue` directly and
           still producing a correct, smooth timestamp (confirmed via
           ECMA-262's `MakeTime`, which uses the value unrounded) meant no
           separate minutes math was needed for either the offset or the
           slider's continuous value from fix 2.
      Re-verified: `typecheck`/`lint`/`test` all green; `expo export -p web
      -c` (867 modules) and `-p android -c` (1217 modules) both succeed
      from a fully cleared cache.

      **Two more live-reported issues not yet fixed, pending investigation
      with visual input**: (a) a thin white line along the earth's
      curvature/horizon when the camera is angled — checked
      `AerialPerspectiveEffect`'s `ground` option (defaults to `true`,
      already matching the reference's implicit default, so not an
      obvious mismatch) but found no other clear divergence from the
      reference by inspection alone; (b) circular artifacting on zoom that
      the reference doesn't show — leading but unconfirmed hypothesis is
      the cloud cascaded-shadow-map config added this task (`shadow-
      cascadeCount`, `shadow-mapSize`, etc.), since cascade *boundaries*
      are a known source of ring/seam artifacts and this config didn't
      exist before this task even though the reference uses the identical
      values. Not changed speculatively — deliberately not touched without
      stronger evidence, since an incorrect guess here risks disabling
      something that's actually working. Both need a screenshot (or the
      user pointing a Playwright/browser session at the running app,
      which this environment currently can't do itself — no headless
      Chromium is installed) before either can be root-caused rather than
      guessed at.

      **Eighth round — cloud-shadow noise confirmed and root-caused with
      screenshots**: user provided three screenshots after the seventh
      round, reporting the shadow-cascade config from the fifth round
      ("made it even worse... shadows messed up") plus continued dimness.
      Comparing them directly (not guessing): a close-in 20:15 dusk shot
      looked genuinely clean — good sun disc, no visible cloud-shadow
      noise — while an 11:15 shot from a much farther-zoomed-out camera
      position was covered in speckled cloud-shadow blob artifacts over
      both land and water. Clean up close, broken far out — that contrast
      pointed straight at the earlier hypothesis (the cloud shadow-cascade
      config), and this time with real evidence to act on it.
      Root-caused precisely, not just correlated, by reading
      `CascadedShadowMaps`' own source: its class default for `maxFar` is
      `null`, meaning "derive from `camera.far * farScale`" (`this._far =
      this.maxFar != null ? Math.min(this.maxFar, camera.far *
      this.farScale) : camera.far * this.farScale`). Both the reference's
      config *and* this app's direct port of it explicitly set `maxFar:
      1e5` (100km) — a hard, non-adaptive cap that becomes the binding
      constraint over `camera.far * farScale` (1e6 * 0.25 = 250km)
      regardless of actual camera distance from the ground. Important
      distinction worth recording plainly: **this was not a porting
      mistake** — the values were copied from the reference correctly.
      It's a real limitation baked into the reference's own config that
      the reference's own demo never exercises, because its camera only
      ever shows a fixed ~500m-altitude close-up. This app's
      `GlobeControls` lets the camera zoom out arbitrarily far, which is
      the first thing to actually hit that cap. Past ~100km from the
      ground, the tiles actually on screen fall outside the shadow
      cascades' fixed coverage, collapsing shadow detail into whatever's
      left of the single farthest, lowest-resolution cascade — the
      speckled blob pattern in the far screenshot.
      Fixed by deliberately diverging from the reference's literal value
      here (the one place in this file where "match the reference exactly"
      was the wrong call, and said so directly in the code comment so a
      future reader doesn't "fix" it back to matching): raised `shadow-
      maxFar` from `1e5` to `5e5` (500km — still bounded, not `null`/fully
      unbounded, which would spread the same shadow-map texel budget
      across the *entire* 1000km `camera.far` range and hurt quality at
      close zoom instead) and doubled `shadow-mapSize` from `[512, 512]`
      to `[1024, 1024]` to keep resolution reasonable across the wider
      range this app's free navigation actually needs, trading some GPU/
      memory cost for it.
      Also likely a *contributor* to the separately-reported "global
      illumination still seems dim," not just a standalone artifact: much
      of the visible darkness in the far-zoomed screenshot was the noisy
      shadow blobs themselves incorrectly darkening large areas, not a
      distinct exposure/tone-mapping problem — worth re-checking dimness
      specifically at close range (where shadows were already clean)
      before assuming a separate bug remains there.
      The white horizon line and the general "still seems dim at close
      range, if any" question remain open — genuinely not enough evidence
      yet to act on the former beyond what's already noted, and the latter
      needs a fresh look once this fix is confirmed to isolate whether any
      dimness remains once the shadow noise itself is gone.
      Re-verified: `typecheck`/`lint`/`test` all green; `expo export -p
      web -c` (867 modules) succeeds from a fully cleared cache.

      **Ninth round — the actual root cause of the dimness, a genuine
      architectural gap, not a tuning problem**: user provided a reference
      screenshot alongside continued reports of dim lighting and clouds
      "moving"/looking "off" when zooming, and asked for another deep pass
      against the reference source. This one turned out to be the biggest
      finding in the whole task, and explains nearly every brightness/
      color complaint from every prior round at once.
      Read `@react-three/postprocessing`'s own `EffectComposer.tsx` source
      directly (not assumed): it unconditionally sets `gl.toneMapping =
      NoToneMapping` for its *entire* mounted lifetime (its own comment:
      "Disable tone mapping because threejs disallows tonemapping on
      render targets") and never reinstates it — by design, it expects
      tone mapping to be added back as an explicit effect *inside* the
      composer via its own `<ToneMapping>` component, not left as a
      renderer-level property. `TilesGlobeScene.tsx`'s `AgXToneMapping` +
      `toneMappingExposure = 10` (added several rounds ago, believed at
      the time to be "the reference-matching HDR render pipeline") has
      therefore likely never actually applied to a single rendered frame
      once `<EffectComposer>` mounts — and since `AtmosphereCloudsLayer`
      is always mounted now (seventh round), that's been true for the
      entire time atmosphere/clouds have been visible. Every prior
      screenshot showing dim, muted, insufficiently-white output was
      genuinely rendered with *no tone-mapping curve at all*, just raw
      HDR clamped to [0,1] — a materially different problem than "wrong
      exposure value" or "wrong time of day," both of which were real but
      much smaller contributors compared to this.
      The reference never hits this: it doesn't use `@react-three/
      postprocessing`'s `EffectComposer` at all — its own custom
      `renderer.setEffects()` pipeline never touches `gl.toneMapping`, so
      `AgXToneMapping` set once at renderer construction stays in effect
      through to the final blit. This is a real architectural divergence
      between our chosen r3f-integration path (design.md decision 3) and
      the reference's raw-`postprocessing`-package approach, not a config
      value that was ever going to be portable by copying numbers.
      Confirmed `toneMappingExposure` (the float multiplier) is *not*
      touched by EffectComposer's guard, only `.toneMapping` (the mode
      enum) is — read Three.js's own tonemapping GLSL chunks directly
      (`Reinhard2ToneMapping`/`Uncharted2ToneMapping`, which the AGX chunk
      follows the same pattern as), which all multiply by the shared
      `toneMappingExposure` uniform before applying their curve — so
      adding `<ToneMapping mode={ToneMappingMode.AGX}>` alone should pick
      up the renderer's existing `exposure = 10` with no separate exposure
      prop needed (`ToneMappingEffect`'s own constructor has no `exposure`
      option at all, which would have been a dead end otherwise).
      Fixed: added `<ToneMapping mode={ToneMappingMode.AGX} />` to
      `AtmosphereCloudsLayer.tsx`'s `<EffectComposer>`, positioned after
      `<LensFlare>` and before `<SMAA>`/`<Dithering>` — tone-map the
      composited HDR result to LDR first, then anti-alias and dither the
      LDR image, matching standard post-fx pipeline order (SMAA's edge
      detection assumes roughly-0-to-1 input, not raw HDR). Updated
      `TilesGlobeScene.tsx`'s now-inaccurate "reference-matching HDR
      render pipeline" comment to explain this caveat rather than leave a
      misleading claim in place; the renderer-level tone mapping still
      does real work for the `atmosphereUnavailable` fallback path, where
      `<EffectComposer>` isn't mounted at all.
      The "clouds appearing to move when zooming" report is still open —
      most likely cascade-boundary popping (an expected-to-some-degree
      artifact of cascaded shadow maps as split distances shift with
      camera distance), which the eighth round's `maxFar`/`mapSize`
      increase should reduce but may not eliminate; not chased further
      this round in favor of the much higher-impact tone-mapping fix.
      Re-verified: `typecheck`/`lint`/`test` all green; `expo export -p
      web -c` (867 modules, confirmed containing `ToneMappingEffect`/
      `AgXToneMapping` in the bundle) and `-p android -c` (1217 modules)
      both succeed from a fully cleared cache.

      **Tenth round — reverted the eighth round's shadow changes, found
      one more real divergence**: user confirmed lighting is "notably
      better" after the ninth round's tone-mapping fix, but cloud shadows
      are "still a little rough" — a much smaller complaint than the
      eighth round's "shadows messed up," and asked to reconsider whether
      that round's `maxFar`/`mapSize` increase was ever actually needed,
      or whether it was solving a problem the (still-broken, at the time)
      missing tone-mapping had made look worse than it was.
      That reasoning holds up: the eighth round's diagnosis was made
      *before* the ninth round's fix, with `gl.toneMapping` stuck at
      `NoToneMapping` the whole time — raw HDR shadow variance with no
      filmic curve to soften it plausibly reads as far harsher/blobbier
      than the same variance would with AGX tone mapping actually active.
      Reverted `shadow-maxFar`/`shadow-mapSize` in
      `AtmosphereCloudsLayer.tsx` back to the reference's exact values
      (`1e5`/`512×512`), to remove that confound rather than keep stacking
      divergent values on an unconfirmed diagnosis.
      Checked and ruled out as a cause during this pass, not skipped:
      `stbnTexture` (spatiotemporal blue noise, used to soften raymarch/
      shadow sampling) — confirmed via `@takram/three-clouds`'s own r3f
      source that leaving it undefined already auto-loads the exact same
      `DEFAULT_STBN_URL` asset the reference loads explicitly; already
      matching, not a gap.
      Found and fixed one more real, confirmed divergence while doing this
      pass: `@react-three/postprocessing`'s `<EffectComposer>` defaults
      `multisampling` to `8` (8x MSAA on its internal render targets) when
      left unspecified — confirmed directly in its source, not assumed.
      The reference has no renderer-level MSAA at all; its only
      anti-aliasing is the explicit `SMAAEffect` pass, an unrelated
      post-process technique. Running both together (8x hardware MSAA
      *and* SMAA) is a genuine pipeline divergence from the reference, not
      a config value that happened to differ — set `multisampling={0}` on
      `<EffectComposer>` to match the reference's SMAA-only approach
      exactly, which also cuts real GPU/memory cost.
      Re-verified: `typecheck`/`lint`/`test` all green; `expo export -p
      web -c` (867 modules) and `-p android -c` (1217 modules) both
      succeed from a fully cleared cache. Whether shadow roughness
      persists at the reference's exact values with tone mapping now
      genuinely active is the open question this round is specifically
      designed to isolate — if it does, that's real signal worth another
      look; if it doesn't, the eighth round's diagnosis was confirmed to
      have been confounded, not a real gap.

      **Eleventh round — confirmed wins, and two more concrete reports**:
      user confirmed the white horizon line is gone (no longer investigated
      further — resolved, likely a side effect of the ninth/tenth rounds'
      tone-mapping and multisampling fixes, though not pinned to a single
      one specifically) and lighting is "notably better." Three new items:
      cloud shadows look wrong/"moving" specifically right after initial
      load, self-correcting the first time the time-of-day slider is
      touched; a wish for finer ("by the second," not "little skips")
      slider granularity; and a lower-priority wish for some night-time
      lighting (moon, city lights), which the user themselves flagged as
      possibly too complex.
      Night lighting: checked, not a bug. `AerialPerspectiveEffect`'s
      `moon` option defaults to `true` (confirmed in source) and neither
      the reference nor this app overrides it — moon-based illumination is
      already on, it's just physically subtle by design, matching how dim
      real moonlight actually is. City lights would need an entirely new
      night-lights data layer (Google's photorealistic tiles are daytime
      photogrammetry with no such texture variant) — this project already
      removed a NASA Black Marble night-lights tile pipeline in an earlier,
      unrelated PR (per this app's own README cross-links), so re-adding
      an equivalent is correctly out of scope for this task; flagged as a
      separate future task, not attempted here.
      The other two share one root cause and one fix. `@takram/three-
      atmosphere`'s own README states directly: "Use this function
      [`updateByDate`, via `ref`] instead of the `date` prop if you want
      to update it smoothly. The behavior when used together with the
      `date` prop is not defined." `AtmosphereCloudsLayer.tsx` was using
      the `date` prop exclusively since it was first written — not
      "mixing" the two, but also not the library's documented path for
      smooth updates. Read the compiled r3f source to confirm exactly what
      the `date`-prop path does: it recomputes sun direction inside a
      plain `useEffect`, which runs *after* first paint on mount — a real
      window on initial load where cloud shadows can render against a
      stale sun direction before that effect first fires, consistent with
      "wrong on load, fixed after first slider touch" (though not
      certain to be the *complete* explanation — `CloudsEffect`'s own
      temporal shadow accumulation needing a large-enough direction change
      to reset is a plausible contributing factor too, not ruled out).
      Fixed by switching to `<Atmosphere ref={atmosphereRef}>` (dropping
      the `date` prop entirely) plus a `useLayoutEffect(() =>
      atmosphereRef.current?.updateByDate(date), [date])` — `useLayoutEffect`
      specifically (not `useEffect`) so the sun-direction update happens
      synchronously after the ref attaches but before paint, closing the
      stale-initial-frame gap directly.
      For slider granularity: widened `TimeOfDaySlider.tsx`'s
      `TRACK_WIDTH` from 200 to 320 (a genuine minor improvement — more
      pixels per hour of drag), but documented honestly that this isn't
      expected to be the primary fix: a browser's default `<input
      type="range">` (the reference's actual control) isn't meaningfully
      wider or more precise per pixel than either of these, so the
      dominant cause of "skips" was almost certainly React's render/effect
      cycle adding latency between each drag update and the atmosphere
      actually changing — which the same `useLayoutEffect`/ref switch
      above fixes at the source, not the pixel-width bump.
      Re-verified: `typecheck`/`lint`/`test` all green; `expo export -p
      web -c` (867 modules) and `-p android -c` (1217 modules) both
      succeed from a fully cleared cache.

      **Twelfth round — the eleventh round's width bump wasn't the fix;
      identified and fixed the actual mechanism**: user reported the
      slider still hopping (concretely: "10:57 to 11:01" on one pixel of
      drag, expected "10:57 to 10:58") and a "drastic," hard-cut
      daylight-to-dusk transition around 19:57→20:01 — plus their own
      tentative idea of just brightening the moon to smooth it over.
      Recognized these as the same root cause before touching code, not
      two separate problems: at `TRACK_WIDTH=320`, one pixel of drag is
      24h/320px ≈ 4.5 minutes — exactly matching the reported jump — and a
      ~4-5 minute jump landing inside twilight (one of the steepest,
      most nonlinear regions of any physically-based sun-elevation-to-
      brightness curve) reads as a hard cut rather than a fade for the
      same underlying reason. Held off on brightening the moon (the
      user's own suggestion) since it would treat a symptom of the
      granularity bug, not its mechanism — worth revisiting only if
      roundness persists after this fix.
      An *absolute-position* slider (thumb position directly mapped to
      hour-of-day, which is what both the original and the eleventh
      round's widened version were) is fundamentally capped at
      `trackWidth / 1440` px-per-minute resolution — reaching genuine
      1-minute resolution that way needs a ~1440px-wide control, not
      practical for a corner HUD overlay; the eleventh round's 200→320px
      bump was correctly labeled a minor improvement at the time, not the
      fix, and this confirms it wasn't.
      Rewrote `TimeOfDaySlider.tsx` from an absolute-position model to a
      relative-drag "scrub" model: `PanResponder`'s own `gestureState.dx`
      (cumulative delta since the gesture started) combined with an
      explicit `PIXELS_PER_MINUTE = 3` sensitivity constant, which
      decouples achievable precision from the widget's physical size
      entirely — the thumb still *displays* hour-of-day as an absolute
      track position, only the drag *input* mechanism changed. Also
      simplified the component meaningfully as a side effect: this removed
      the need for the `trackRef`/`measure()`/on-screen-position machinery
      from the previous version entirely, since `gestureState.dx` doesn't
      need absolute screen coordinates. Clamped (not wrapped) at the day's
      boundaries, matching the reference's own `<input type="range" min="0"
      max="24">`, which doesn't cycle past its ends either.
      Re-verified: `typecheck`/`lint`/`test` all green; `expo export -p
      web -c` (867 modules) and `-p android -c` (1217 modules) both
      succeed from a fully cleared cache. Whether the dusk transition now
      reads as gradual, and whether brightening the moon is still wanted
      once the granularity fix is confirmed live, are both open pending
      the user trying it again.

      **Thirteenth round — the twelfth round made it worse, and the user's
      own framing found the real problem**: "honestly, I'd say things got
      worse with the slider after that change (it's hard to use now and
      shadows still seem to jump)... I'm also still seeing the hard jump
      from day to dusk... Looking back at the example, it has small cloud
      shadow jumping as well, it just able to almost animate it as you use
      the slider because everything is smooth... it's almost as if we took
      our initial time-of-day chunks and said let's just chop it up into a
      slider (not the same outcome)." Direct, valuable course-correction
      on two fronts simultaneously: the twelfth round's relative-drag scrub
      model was a real UX regression (reverted, see below), and — more
      importantly — every round up through the twelfth had been chasing
      slider *math* (granularity, snapping, sensitivity) when the actual
      gap was architectural: our `hour`-changes-drive-everything-through-
      React-state approach doesn't behave like the reference's tight,
      continuous `renderer.setAnimationLoop`, where the slider's `input`
      handler mutates `sunDirection` directly with zero framework overhead
      between one drag event and the very next rendered frame.
      Root-caused, not assumed: driving updates via `setHour` → re-render
      → new `date` prop → `useLayoutEffect` (still the mechanism as of the
      eleventh round) adds a full render/effect cycle of latency to *every
      single drag tick*, and — critically — re-evaluates the entire
      `<Clouds>`/`<AerialPerspective>`/`<EffectComposer>` element tree each
      time. The reference's scene graph never changes shape or re-runs
      during a drag at all; only `sunDirection`'s value mutates, frame
      after frame, inside one unbroken loop. Ours was reconstructing/
      re-diffing that whole subtree on every tick — a structurally
      different situation, consistent with the user's own "chopped into a
      slider" description even though `hour`'s *value* was already
      perfectly continuous by this point.
      Fixed with a real architecture change, not another tuning pass:
      **`atmosphereRef` moved out of AtmosphereCloudsLayer.tsx and up into
      TilesGlobeScene.tsx**, which now owns it and threads it down through
      `AtmosphereCloudsControls.tsx` to `TimeOfDaySlider.tsx`. The slider's
      own `onPanResponderGrant`/`onPanResponderMove` now call
      `atmosphereRef.current.updateByDate(computeSceneDate(newHour))`
      *directly and synchronously*, alongside (not instead of)
      `onHourChange` — bypassing React state entirely for the actual
      atmosphere update, while `onHourChange`/`hour` state still drives the
      visible readout and thumb position, which can lag a frame with zero
      visible consequence. `<Clouds>`/`<AerialPerspective>` now never
      re-render during a drag at all; TilesGlobeScene.tsx's own
      `useLayoutEffect` (unchanged in spirit from the eleventh round, just
      relocated) still covers the initial-mount sync and any non-drag-
      driven `hour` changes. New `sceneTime.ts` extracts the local-hour →
      UTC-date conversion (previously inline in TilesGlobeScene.tsx) into
      a standalone pure function, specifically so TimeOfDaySlider can share
      the exact same conversion without importing from TilesGlobeScene.tsx
      (which would create an import cycle back down through
      AtmosphereCloudsControls.tsx).
      Also reverted the twelfth round's relative-drag "scrub" slider model
      back to absolute-position dragging, per direct feedback ("hard to
      use now") — grabbing the thumb no longer set a specific time
      directly under the relative model, breaking the basic slider
      affordance even though it was mathematically finer-grained. The
      granularity concern that motivated that rewrite is moot now anyway:
      since the atmosphere update no longer waits on a React render cycle,
      the *perceived* smoothness no longer depends much on how many
      minutes one pixel of drag represents.
      One more contributor addressed while in this code, found via
      re-reading it with fresh eyes rather than proven live: `<Clouds
      localWeatherVelocity={[0.001, 0]} shadow-mapSize={[512, 512]}>` used
      inline array literals, which get a brand-new reference on every
      render — and this component re-renders on every `hour` change
      (before this round's fix) or associated prop update. r3f's prop-
      diffing re-applies a "changed" reference by calling `.set(...)` on
      the underlying Vector2 again even when the values are numerically
      identical to before — harmless in isolation, but an unnecessary
      touch on a property this library may treat as a signal to rebuild
      shadow-map render targets, on every single tick. Extracted to
      module-level constants (`CLOUD_LOCAL_WEATHER_VELOCITY`,
      `CLOUD_SHADOW_MAP_SIZE`) for stable references regardless. Not
      confirmed as a live contributor on its own, but a genuine
      correctness improvement compounding with the bigger fix above.
      Re-verified: `typecheck`/`lint`/`test` all green; `expo export -p
      web -c` (868 modules) and `-p android -c` (1218 modules) both
      succeed from a fully cleared cache. Whether this closes the
      "chopped into a slider" gap for good, and whether the dusk
      transition and initial-load shadow glitch are actually resolved now
      (not just theorized to be), are still open pending the user trying
      it live — this round is explicitly the test of the architectural
      theory, not a claimed fix in itself.

      **Fourteenth round — the thirteenth round's theory didn't pan out
      live, rolled back to the tenth round's confirmed-good state**: user
      report: "seems like things mildly got better but also worse - now
      cloud shadows are sometimes disappearing," plus the original three
      complaints (initial-load glitch, granularity, dusk hard-cut) still
      present, and asked explicitly to return to the exact state as of
      their message quoted at the top of the eleventh round's entry above
      ("It looks like the white line on the horizon went away...") — i.e.
      the tenth round's end state, before any of the eleventh/twelfth/
      thirteenth rounds' atmosphere-update-timing work.
      No commits exist yet for this change (everything in this task has
      been uncommitted working-tree edits, per the OpenSpec-then-apply
      workflow this repo uses), so there was no `git checkout` to reach
      for — reconstructed the tenth round's file states directly, cross-
      checked two ways: (1) `pnpm nx run globify-tiles:typecheck` passing
      cleanly confirmed internal consistency across the reverted files;
      (2) both `expo export -p web -c` (867 modules) and `-p android -c`
      (1217 modules) exactly matched the tenth round's own recorded module
      counts, a strong independent signal the reconstruction is precise,
      not just plausible-looking.
      Reverted: `TilesGlobeScene.tsx` (back to owning `date` via a local
      `useMemo` + local `CHICAGO_UTC_OFFSET_HOURS`/`DEFAULT_HOUR`
      constants, passing `date` as a prop to `AtmosphereCloudsLayer`; no
      `atmosphereRef`), `AtmosphereCloudsLayer.tsx` (back to `<Atmosphere
      date={date}>`, no ref, no internal `useLayoutEffect`; shadow config
      back to inline array literals rather than the thirteenth round's
      module constants — those constants weren't the issue, but they were
      part of the same commit and reverting cleanly matters more here than
      preserving an unconfirmed micro-optimization), `AtmosphereCloudsControls.tsx`
      (no `atmosphereRef` prop), `TimeOfDaySlider.tsx` (`TRACK_WIDTH` back
      to `200`, absolute-position dragging via `trackRef`/`measure()`, no
      `atmosphereRef`/`sceneTime` imports, no direct `updateByDate` call).
      Deleted `sceneTime.ts` (didn't exist before the thirteenth round).
      Kept, deliberately not reverted: everything from the ninth round
      (`<ToneMapping mode={AGX}>`) and tenth round (`multisampling={0}`,
      shadow values at the reference's exact `1e5`/`512×512`) — those were
      confirmed-good by the user ("lighting is notably better") before
      this whole ref-based detour started, and are unrelated to it.
      Root cause of the eleventh-through-thirteenth rounds' regression not
      independently re-diagnosed this round — the user's ask was explicitly
      to roll back, not to keep debugging forward, and that's what this
      round does. Worth recording as a real lesson for next time rather
      than silently dropped: `atmosphereRef.current.updateByDate()` called
      directly from a touch handler, bypassing React entirely, is exactly
      what `@takram/three-atmosphere`'s own README recommends for smooth
      updates, and the underlying reasoning (matching the reference's
      zero-framework-overhead event handling) still seems sound — but
      *something* about how it interacted with this specific pipeline
      (possibly `CloudsEffect`'s temporal shadow accumulation reacting
      differently to being driven by direct imperative calls outside
      React's render cycle vs. the effect-timed calls it had before, or
      possibly a race between the direct call and TilesGlobeScene's own
      `useLayoutEffect` also firing) made shadows intermittently disappear
      instead of animating smoothly. That's a real, open question for
      whoever revisits this — not something this round claims to have
      explained, only reverted.
      Re-verified after the revert: `typecheck`/`lint`/`test` all green;
      `expo export -p web -c` (867 modules) and `-p android -c` (1217
      modules) both succeed from a fully cleared cache, both counts
      matching the tenth round's exactly.

## 10. Testing

- [ ] 10.1 Unit tests (Jest) for the coordinate bridge, and for any new
      pure-transform logic introduced specifically for v2 (not already
      covered by the shared library's existing specs).
- [ ] 10.2 Playwright E2E coverage for the web target: app loads, tiles
      render, a marker can be selected and shows its detail panel, view
      mode can be cycled — mirroring the intent of v1's existing globe E2E
      suite.
- [ ] 10.3 Manual verification on the native target(s) established by the
      task 1 spike outcome (Playwright doesn't cover RN native).

## 11. Verify

- [ ] 11.1 `pnpm nx test Globify` and `pnpm nx test globify-tiles` both
      pass.
- [ ] 11.2 `pnpm nx lint Globify` and `pnpm nx lint globify-tiles` both
      pass.
- [ ] 11.3 `pnpm nx e2e Globify-e2e` still passes unmodified (v1
      unaffected).
- [ ] 11.4 New Playwright coverage for `globify-tiles` (task 10.2) passes.
- [ ] 11.5 Manual end-to-end check: v2 app loads with a real Cesium Ion
      token, photorealistic tiles render, supply-chain markers/routes/
      trucks appear at correct positions, view-mode toggle recolors as
      expected, and (if the task 1 spike passed) the same holds on at
      least one native target.
