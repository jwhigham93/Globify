## Why

On the deployed web build, rotating the globe on a phone drops frames badly and
does not recover. A first attempt at fixing this was reverted: it did not
measurably help on a desktop GPU and cost visible fidelity, and no measurement
was ever taken on an actual phone. This change re-opens the work on the
condition that it is driven by device measurements rather than reasoning.

The investigation that produced the revert is worth keeping. Every claim below
was verified against the installed `three-globe@2.45.2` /
`data-bind-mapper@1.0.3` sources or measured in-browser, and none of it is
speculative.

## Findings to build on

**The objects layer rebuilds every marker on any data change.** `ThreeDigest`
extends `data-bind-mapper`, whose default id accessor is `d => d`
(`data-bind-mapper.mjs:116`). `three-globe` only calls `.id()` on its hexBin
and polygon layers, never on objects, so the objects layer joins on object
*identity*. `GlobeScene` passes freshly spread literals, so all ~213 markers are
removed and recreated on every update: `_deallocate` (`three-globe.mjs:394`)
disposes each geometry and material, and `onCreateObj` allocates new ones.

Caveat for any fix: `objectThreeObject` runs **only on create**. `onUpdateObj`
(`three-globe.mjs:3877-3888`) re-reads lat/lng/altitude/facesSurface/rotation
but never colour, so reusing datum identities requires pushing colour changes to
the materials explicitly, or view-mode recolouring silently stops working.

**`buildAltitudeMap` is O(n²)** (`collisionDetection.ts:86-176`) and runs on
every data update. Locations are static, so it is memoizable on the id set.

**The camera distance drives React state.** `Controls` reports every 1-unit
change, which re-renders the tree and re-runs `clusterByZoom` — and that returns
fresh arrays for any distance above 130, i.e. the entire default view band. A
single zoom sweep does this ~70 times. React only branches on two booleans
(cluster threshold, hint visibility).

**Arc stroke rebuilds regenerate geometry.** `applyUpdate`
(`three-globe.mjs:3327-3335`) disposes and rebuilds a `TubeGeometry` per arc.
`GlobeScene` triggers this every 3 units of camera distance, so ~30 times per
sweep across 234 arcs.

**The tile composite shader is installed permanently** (`GlobeScene.tsx`, at
tile init) — 9 samplers with a branch per slot, resident at every camera
distance including the default view where no tile can load. Note tiles are
currently disabled outright (`config.resolvedTileCdnUrl` returns `''`).

**The per-frame marker scale pass writes ~213 matrices** from an input that is
constant while rotating, so it is entirely wasted on the rotate path.

**`enablePan` is true**, and panning moves the orbit target off the origin,
which invalidates every `camera.position.length()` reading in the app — LOD
clustering, marker scale, tile zoom level and arc stroke all assume an origin
orbit. This is a latent correctness bug independent of performance.

**~1900 draw calls per frame** at the default view with the seeded dataset,
because `three-globe` issues one draw per arc and per marker. This is the same
before and after the reverted attempt and is likely the single largest lever
available: static arcs could be merged into one geometry.

## What went wrong the first time

- `navigator.maxTouchPoints > 0` was used to detect touch. It is true on any
  Windows machine with a touchscreen, so ordinary desktops were given the phone
  path: antialiasing off and pixel ratio capped at 1.25. Use
  `(pointer: coarse)`, which asks about the primary pointer.
- Lowering arc tube resolution (64x6 → 32x4) visibly faceted the arcs for no
  meaningful gain; the cost was rebuild frequency, not resolution.
- Replacing the star sphere with a `scene.background` changed how the texture
  projects — the sphere shows a magnified patch, which is the look the scene was
  built around.
- Adaptive pixel-ratio scaling calls `setPixelRatio`, which reallocates the
  drawing buffer. On a GPU that does not need the help this can only cost.
- Overriding the WebGL context (`alpha: false`, `stencil: false`) on desktop
  changed the compositing path for no benefit.
- OrbitControls damping was added unasked; it keeps the camera drifting after
  release, which reads as lag rather than smoothness.

## What Changes

- Measure first, on a real phone, with a frame probe — no change lands without a
  before/after from the device that has the problem. Headless Chromium is
  software-rendered and fill-bound; it cannot detect any of this.
- Prefer changes that are invisible at equal fidelity: stable datum identities,
  memoized altitude map, quantized camera-distance state, throttled arc
  rebuilds, skipping the scale pass while the distance is unchanged.
- Treat resolution, antialiasing and geometry detail as a last resort, gated
  strictly behind `(pointer: coarse)` and ideally behind an explicit user
  setting rather than a guess about the device.
- Investigate merging static arc geometry, which addresses the draw-call count
  directly and helps every device.

## Impact

- Affected: `apps/Globify/src/components/Globe/` (GlobeScene, Controls,
  GlobeVisualization), `apps/Globify/src/services/` (lodClustering,
  collisionDetection).
- No API or schema changes.
