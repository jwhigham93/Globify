## Why

The globe currently applies a single static texture at all zoom levels. When the camera zooms in past continental scale, the image becomes visibly blurry. With high-resolution tiles now hosted on CDN (via the `nasa-tile-hosting` change), the frontend needs a tile-aware rendering system that progressively loads and composites higher-resolution tiles as the user zooms in — the same approach used by Google Earth.

## What Changes

- Add a **TileManager service** that determines which tiles are visible for the current camera view, loads them from the CDN with priority scheduling, and manages an in-memory LRU cache.
- Add **tile coordinate math** to convert camera position/frustum into lat/lng bounds, then into Z/X/Y tile indices matching the tile manifest.
- Integrate tile textures into the globe via **three-globe's `globeMaterial()` API**, compositing high-res tiles onto the existing base texture using a custom `ShaderMaterial` with alpha fade-in.
- **Extend the zoom range** by reducing `ZOOM_MIN_DISTANCE` to allow closer inspection of regions, and add intermediate LOD breakpoints for tile level switching.
- **Scale markers at close zoom** so they don't become disproportionately large when the camera is very close.
- Show a **subtle loading indicator** when tiles are being fetched.

## Capabilities

### New Capabilities
- `tile-rendering`: Tile manager with LRU cache, coordinate math, progressive texture compositing on the globe, and smooth tile fade-in transitions.
- `close-zoom-lod`: Extended zoom range with marker rescaling and tile level breakpoints for close-range inspection.

### Modified Capabilities
- `globe-scene`: The globe scene gains tile-based texture compositing at close zoom and a loading state for tile fetches.

## Impact

- **New files:** `apps/Globify/src/services/tileManager.ts`, `apps/Globify/src/services/tileCoordinates.ts`
- **Modified files:** `GlobeScene.tsx` (custom material integration, tile loading trigger), `Controls.tsx` (extended zoom range), `constants.ts` (new zoom breakpoints, tile constants), `textures.ts` (tile texture loading).
- **Runtime dependency:** Tile manifest fetched from CDN at globe initialization; network required for high-res tiles (falls back gracefully to bundled base texture when offline).
- **Performance:** GPU memory bounded by LRU cache size (configurable). Only visible tiles are loaded.
