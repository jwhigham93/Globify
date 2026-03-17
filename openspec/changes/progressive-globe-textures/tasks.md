## 1. Tile Coordinate Math — ✅ DONE

- [x] 1.1 Create `apps/Globify/src/services/tileCoordinates.ts` — export `latLngToTileIndex(lat, lng, cols, rows)` returning `{ x, y }` using equirectangular projection
- [x] 1.2 Add `getVisibleTileIndices(centerLat, centerLng, zoomLevel)` — returns array of `{ z, x, y }` for tiles in the camera's view region (center + neighboring tiles)
- [x] 1.3 Add `tileToLatLngBounds(z, x, y, cols, rows)` — returns `{ north, south, east, west }` geographic bounds for a tile
- [x] 1.4 Add unit tests for tile coordinate functions including edge cases (antimeridian wrap, poles) — `tileCoordinates.spec.ts` with 14 tests

## 2. Tile Manager Service

- [ ] 2.1 Create `apps/Globify/src/services/tileManager.ts` — `TileManager` class with `init(cdnBaseUrl)` that fetches `tile-manifest.json` and parses zoom level metadata
- [ ] 2.2 Implement LRU cache (`maxSize` constant = 32) for `THREE.Texture` objects with `get(key)`, `put(key, texture)`, and eviction via `texture.dispose()`
- [ ] 2.3 Implement `requestTiles(centerLat, centerLng, cameraDistance)` — determines zoom level from camera distance (>140: none, 120–140: z1, <120: z2), calls `getVisibleTileIndices`, queues loads
- [ ] 2.4 Implement priority-ordered tile loading — tiles sorted by distance from view center, loaded via `THREE.TextureLoader` from CDN URL pattern
- [ ] 2.5 Implement tile load callbacks — on success, store in LRU cache and invoke `onTileLoaded` callback; on failure, silently skip tile
- [ ] 2.6 Add Constants to `constants.ts` — `TILE_ZOOM_THRESHOLD_Z1 = 140`, `TILE_ZOOM_THRESHOLD_Z2 = 120`, `TILE_CACHE_MAX_SIZE = 32`, `TILE_FADE_DURATION = 300`, `TILE_CHECK_INTERVAL = 200`

## 3. Custom Shader Material

- [ ] 3.1 Create `apps/Globify/src/components/Globe/tileShader.ts` — GLSL vertex + fragment shaders: base texture sampler + up to 8 tile overlay samplers with per-tile uniforms (bounds, alpha)
- [ ] 3.2 Build a `createTileCompositeMaterial(baseTexture)` function that returns a `THREE.ShaderMaterial` with the base texture bound and tile overlay slots empty
- [ ] 3.3 Add `updateTileOverlay(material, slotIndex, tileTexture, bounds, alpha)` function to bind a loaded tile to a shader slot with its geographic bounds and fade alpha
- [ ] 3.4 Implement fade-in animation — on each frame, increment tile alpha from 0→1 over `TILE_FADE_DURATION` ms

## 4. Globe Scene Integration

- [ ] 4.1 In `GlobeScene.tsx`, initialize `TileManager` in `useEffect` with CDN base URL from environment config (with empty-string fallback for dev/offline)
- [ ] 4.2 In `GlobeScene.tsx`, replace default globe material with custom shader material via `globe.globeMaterial()` when tile system is active
- [ ] 4.3 Add tile-check logic to `useFrame` loop (throttled to 200 ms) — call `tileManager.requestTiles()` with current camera distance and center point
- [ ] 4.4 Handle tile load callbacks — bind loaded textures to shader overlay slots and start fade-in animation
- [ ] 4.5 Handle cleanup — dispose TileManager and all textures on component unmount

## 5. Extended Zoom & Marker Scaling

- [ ] 5.1 Update `ZOOM_MIN_DISTANCE` from 107 to 101 in `constants.ts`
- [ ] 5.2 In `Controls.tsx`, update `controls.minDistance` to use new `ZOOM_MIN_DISTANCE`
- [ ] 5.3 In `GlobeScene.tsx` `createLocationMarker` / `createClusterMarker`, apply scale factor `Math.min(1, 107 / cameraDistance)` when camera distance < 107
- [ ] 5.4 Wire marker scale updates into the `useFrame` render loop so markers resize smoothly as camera zooms

## 6. Loading Indicator

- [ ] 6.1 Add `isTilesLoading` state to `GlobeVisualization.tsx` (or a shared context), driven by TileManager's active load count
- [ ] 6.2 Create a subtle loading spinner/bar component that renders near the globe when `isTilesLoading` is true

## 7. Verify

- [ ] 7.1 Run `nx run Globify:lint` — no lint errors
- [ ] 7.2 Run `nx run Globify:test` — all unit tests pass (including new tile coordinate tests)
- [ ] 7.3 Manually verify: at far zoom (> 140) only base texture renders; at zoom 120–140, z1 tiles load and composite; at zoom < 120, z2 tiles load
- [ ] 7.4 Manually verify: tiles fade in smoothly, no console output from tile loading
