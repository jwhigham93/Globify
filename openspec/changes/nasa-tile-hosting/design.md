## Context

The Globify globe renders NASA Earth at Night imagery on a Three.js sphere via `three-globe`. Today a single 13,500×6,750 JPEG (3 km/pixel) is bundled in the app and applied with `globeImageUrl()`. This works well at continental zoom but pixelates at closer distances.

NASA's Earth Observatory publishes the 2016 Earth at Night Color dataset at full resolution (500 m/pixel) as a set of pre-tiled images. These tiles follow a simple grid layout and can be reorganized into a standard Z/X/Y slippy-map pyramid for progressive loading.

The existing infrastructure uses AWS CDK (Go) with three deployment profiles (ultra-lite, lite, full). Static asset hosting already exists via S3 + CloudFront for the Globify web build (`stacks/webhosting.go`).

## Goals / Non-Goals

**Goals:**
- Host NASA 500 m Earth at Night 2016 Color tiles on S3 with CloudFront CDN for low-latency delivery worldwide.
- Provide a repeatable script to download NASA source tiles, process them into a Z/X/Y pyramid with WebP encoding, and generate a tile manifest.
- Add a CDK stack that provisions the S3 bucket, CloudFront distribution, and proper cache/CORS headers.
- Provide an upload script to sync tiles to S3 and invalidate the CloudFront cache.

**Non-Goals:**
- Frontend tile rendering (covered by the separate `progressive-globe-textures` change).
- Real-time tile generation or on-the-fly format conversion (tiles are pre-processed static assets).
- Supporting multiple tile datasets beyond Earth at Night 2016 Color (can be added later).
- Serving vector tiles or any non-raster format.

## Decisions

### 1. Tile Pyramid Scheme — Standard Z/X/Y equirectangular grid

**Choice:** Organize tiles as `{z}/{x}/{y}.webp` following the common slippy-map convention (z = zoom level, x = column, y = row, origin top-left).

**Rationale:** This is the de-facto standard used by OpenStreetMap, Mapbox, and Google Maps. Every tile library understands it. three.js and the frontend tile manager can compute tile coordinates with simple arithmetic.

**Alternatives considered:**
- TMS (origin bottom-left): Less common for web; would confuse convention.
- Quadkey: Compact addressing but non-standard for static hosting.

### 2. Image Format — WebP primary, JPEG fallback

**Choice:** Tiles stored in WebP format at quality 85 for ~60 % size reduction vs JPEG. A JPEG fallback set is generated for older browsers (Safari < 14, older React Native WebView).

**Rationale:** CloudFront can serve different formats via content negotiation (`Accept` header) or the client can request the appropriate format directly. WebP reduces CDN egress costs significantly given tile volume.

**Alternatives considered:**
- JPEG only: Simpler, but ~2.5× larger payload.
- AVIF: Better compression but slower to encode/decode and limited browser support.

### 3. Zoom Levels — Three levels (z0, z1, z2)

**Choice:** Generate three zoom levels from the NASA source:
- **z0** (1×1 tiles, ~21,600 km/tile) — single whole-earth tile, equivalent to current medium-res texture. Used as base/placeholder.
- **z1** (4×2 tiles = 8 total, ~5,400 km/tile) — rough continental detail. Equivalent to current high-res texture split into tiles.
- **z2** (8×4 tiles = 32 total, ~2,700 km/tile) — regional detail, the pixel limit of the 500 m source at this grid size.
- Additional levels may be derived if the NASA source resolution supports finer slicing (up to z3 = 16×8 = 128 tiles).

**Rationale:** The NASA source image is 21,600×10,800 pixels (500 m). At z2 each tile is 2,700×2,700 — a comfortable GPU texture size. Going beyond z3 would exceed available source resolution without upscaling.

**Alternatives considered:**
- Single high-res level only: No progressive benefit.
- Many zoom levels (z0–z6): Exceeds source resolution; would require upscaling which adds no information.

### 4. Infrastructure — Dedicated S3 bucket + CloudFront distribution

**Choice:** A new CDK stack `tilehosting.go` creates a private S3 bucket (OAC-only access) fronted by a CloudFront distribution with aggressive caching (1 year `Cache-Control`, immutable).

**Rationale:** Tiles are static, versioned by dataset year, and never change. Aggressive caching minimizes origin hits. A separate distribution from the web hosting distribution keeps concerns isolated and allows independent cache invalidation.

**Alternatives considered:**
- Reuse the existing `webhosting.go` CloudFront distribution: Complicates cache policies and CORS; mixes app bundle caching with tile caching.
- Third-party tile hosting (Mapbox, Maptiler): Adds external dependency and recurring cost; we control the source data.

### 5. Processing Script — Node.js (sharp) pipeline

**Choice:** A Node.js script (`tools/scripts/process-nasa-tiles.mjs`) using the `sharp` library to:
1. Download source tiles from NASA.
2. Slice the full-resolution image into grid tiles at each zoom level.
3. Encode each tile as WebP (quality 85) and JPEG (quality 90) fallback.
4. Write the Z/X/Y directory structure.
5. Generate `tile-manifest.json` describing available levels, tile dimensions, and URL pattern.

**Rationale:** `sharp` is already available in the Node.js ecosystem, handles large images efficiently via libvips, and supports both WebP and JPEG output. The workspace already uses Node.js for build tooling.

**Alternatives considered:**
- Python + Pillow: Would work, but adds a Python dependency to a Node.js-centric toolchain.
- ImageMagick CLI: Harder to orchestrate programmatically; error handling is fragile.

## Risks / Trade-offs

- **[NASA source availability]** → NASA URLs may change or be rate-limited. Mitigation: document exact source URLs in the script, add retry logic, and check in the tile manifest (not the tiles themselves) to version control so the pipeline is reproducible.
- **[Tile storage cost]** → At z2 (32 tiles × 2 formats ≈ 64 files, ~200 MB total), storage cost is negligible (<$0.01/mo). CDN egress is the main cost factor but tiles are heavily cached. Mitigation: `Cache-Control: public, max-age=31536000, immutable`.
- **[Large initial download]** → The full-resolution NASA source is ~250 MB. Mitigation: the processing script downloads once locally; only processed tiles are uploaded to S3.
- **[WebP browser support]** → React Native's Image component and the `three.js` TextureLoader both support WebP on modern platforms. Mitigation: JPEG fallback tiles are generated alongside and the manifest includes both format URLs.

## Open Questions

1. **Exact NASA tile download URLs** — The 2016 Color full-resolution imagery page lists "tiled" variants. During implementation, we'll inspect the exact download links and adjust the script accordingly. If tiles are delivered as a single large image instead of pre-tiled, the script will handle slicing.
