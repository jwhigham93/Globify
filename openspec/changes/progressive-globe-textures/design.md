## Context

The Globify globe currently renders Earth using `three-globe`'s `globeImageUrl()` API, which applies a single equirectangular texture to the sphere. The texture is a bundled 13,500×6,750 JPEG (3 km/pixel). Camera zoom is constrained between distances 107 (USA fills screen) and 200 (full globe). The `nasa-tile-hosting` change provisions a CDN serving a Z/X/Y tile pyramid with zoom levels z0–z2 in WebP/JPEG format, described by a `tile-manifest.json`.

The globe uses `three-globe` which wraps Three.js. The `globeMaterial()` method provides access to the underlying `MeshPhongMaterial`, which can be replaced with a custom `ShaderMaterial` for tile compositing. React Three Fiber manages the render loop via `useFrame`.

Existing LOD system: `lodClustering.ts` clusters restaurant markers when camera distance > 130 and expands them when closer. Collision detection (`collisionDetection.ts`) stacks overlapping markers at different altitudes.

## Goals / Non-Goals

**Goals:**
- Load and composite high-resolution tiles onto the globe surface based on camera zoom level.
- Implement smooth fade-in transitions when tiles load (no popping).
- Extend zoom range to allow closer inspection of regions with full-fidelity textures.
- Scale markers appropriately at close zoom so they remain proportional.
- Bound GPU memory usage via an LRU cache that evicts tiles no longer in view.
- Gracefully fall back to the bundled base texture when offline or tiles fail to load.

**Non-Goals:**
- Vector tile rendering or map labels.
- Street-level geometry or 3D buildings.
- Terrain elevation / height maps (globe remains a smooth sphere).
- Offline tile caching to persistent storage (may be added later).

## Decisions

### 1. Tile Compositing Approach — Custom ShaderMaterial overlay

**Choice:** Replace the globe's default `MeshPhongMaterial` with a custom `ShaderMaterial` that:
- Samples the bundled base texture (always available, dimmed night lights).
- Samples up to N loaded tile textures and composites them on top based on their geographic bounds.
- Uses an alpha uniform per tile to animate fade-in (0→1 over ~300 ms).

The base texture is always rendered; tiles overlay the relevant region with higher detail.

**Rationale:** This preserves the base texture as fallback (offline, slow network, before tiles load) and avoids the complexity of a full tile-only rendering system. Tile compositing in a shader is GPU-efficient and allows smooth blending.

**Alternatives considered:**
- Swap `globeImageUrl()` entirely per zoom level: simpler but causes a full-globe flash on every level change.
- Use a `CanvasTexture` that paints tiles onto a single large canvas: high CPU cost, canvas size limited.

### 2. Tile Coordinate System — Equirectangular grid matching NASA tiles

**Choice:** Tile indices are computed as:
- `x = floor((lng + 180) / 360 * cols)`
- `y = floor((90 - lat) / 180 * rows)`

where `cols` and `rows` come from the tile manifest for the current zoom level.

**Rationale:** NASA tiles use an equirectangular projection, not Mercator. The coordinate math is simpler and matches the `three-globe` sphere's UV mapping directly.

### 3. Visible Tile Determination — Camera-to-globe intersection

**Choice:** On each frame (throttled to every 200 ms), compute the camera's view center by raycasting from screen center to the globe surface, then determine the lat/lng. Load tiles within a radius around that point based on the current zoom level.

**Rationale:** Full frustum culling against all tiles is complex for a sphere. Since the globe occupies most of the viewport, a center-point + radius approach is simpler and sufficient.

### 4. LRU Cache — In-memory, max 32 textures

**Choice:** An LRU cache holding at most 32 `THREE.Texture` objects. When a tile is evicted, its texture is disposed (`texture.dispose()`) to free GPU memory.

**Rationale:** 32 tiles at 2,700×2,700 WebP ≈ 32 × ~12 MB uncompressed GPU memory ≈ 384 MB — well within desktop/mobile GPU limits. The number is tunable via constants.

### 5. Zoom Breakpoints — Three tile levels tied to camera distance

**Choice:**
- Camera distance > 140: no tiles, base texture only (z0 equivalent).
- Camera distance 120–140: load z1 tiles (4×2 grid, 8 tiles max).
- Camera distance < 120: load z2 tiles (8×4 grid, 32 tiles max).

`ZOOM_MIN_DISTANCE` reduced from 107 to 101 to allow closer inspection.

**Rationale:** These thresholds roughly align with the pixel density where each tile level matches screen resolution. The existing LOD cluster threshold at 130 sits between z1 and z2, creating natural visual progression.

### 6. Marker Scaling at Close Zoom — Inverse distance scaling below threshold

**Choice:** When camera distance < 107 (the previous minimum), scale marker geometry by `107 / currentDistance`. This keeps markers at their current apparent size as the camera gets closer.

**Rationale:** Without scaling, markers rendered at camera distance 101 would appear ~6% larger than at 107 — noticeable but not extreme. The linear scaling keeps the visual consistent.

## Risks / Trade-offs

- **[Shader complexity]** → Custom ShaderMaterial requires maintaining GLSL code alongside the Three.js material system. Mitigation: keep shader simple (base texture + N tile overlays with alpha), test on WebGL 1 and WebGL 2.
- **[three-globe compatibility]** → Replacing the globe material may conflict with three-globe's internal rendering (atmosphere, arc layers). Mitigation: only replace the globe's own material via `globeMaterial()`, leaving other layers untouched.
- **[Network latency]** → Tile loading visible as brief blur before tiles fade in. Mitigation: the base texture provides a recognizable fallback during loading; tile fade-in (300 ms) masks the transition.
- **[Mobile GPU limits]** → 32 tiles in GPU memory may be too much for low-end mobile. Mitigation: LRU cache size is a constant; can be reduced for mobile or made adaptive based on device capability.
