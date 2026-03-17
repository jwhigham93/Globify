## Context

The Globify globe currently renders supply chain locations (suppliers, DCs, restaurants) as custom 3D markers using Three.js geometries, with LOD clustering at far zoom and collision detection for altitude stacking. The `useVehiclePositions()` hook (from `realtime-gps-streaming`) provides a live `Map<vehicleId, VehiclePosition>` that updates in real time via WebSocket.

Existing patterns to follow:
- `createLocationMarker()` / `createClusterMarker()` in `GlobeScene.tsx` for 3D marker creation.
- `riskVisuals.ts` / `disruptionVisuals.ts` for color mapping services.
- `EntityDetailPanel` for click-to-inspect side panels.
- `lodClustering.ts` for zoom-based visibility switching.
- `three-globe`'s `objectsData` / `customLayerData` API for adding objects to the globe.

## Goals / Non-Goals

**Goals:**
- Render truck markers as 3D arrow/chevron shapes that point in the direction of travel (oriented by heading).
- Color-code markers by GPS status: green (live), orange (stale), red (lost).
- Pulse/animate stale markers to draw attention.
- Smoothly interpolate marker positions between GPS updates (no jumping).
- Show planned route polyline when a truck is selected.
- Provide a click-to-inspect panel with vehicle detail, GPS health, and warnings.
- Allow toggling truck layer visibility and display active truck count.
- Hide trucks at far zoom (camera > 150) for visual clarity.

**Non-Goals:**
- Truck-to-truck interaction (e.g., convoy detection).
- Historical route playback or breadcrumb trail.
- Geofencing or alerting (out of scope for visualization).
- 3D truck models (simple geometric marker is sufficient).

## Decisions

### 1. Marker Geometry — Arrow/chevron (ConeGeometry rotated flat)

**Choice:** Use a `THREE.ConeGeometry` (radius 0.15, height 0.5, 3 segments) rotated so the point faces forward (direction of travel). The cone is flat (like a map arrow marker) rather than tall like the supplier cones. Orientation is set by rotating the marker around the globe surface normal by the `heading` angle.

**Rationale:** An arrow shape is universally understood as a directional indicator. Using the same `THREE.Mesh` pattern as existing markers keeps the code consistent. Three segments create a triangular arrow shape.

**Alternatives considered:**
- Box with arrow texture: Requires UV mapping and a texture asset.
- Custom BufferGeometry: More code for marginal visual improvement.

### 2. Rendering Approach — three-globe customLayerData

**Choice:** Use `three-globe`'s `customLayerData` API to add truck markers as a separate layer rather than mixing them into `objectsData` with location markers. This keeps truck markers decoupled from the supply chain location rendering.

**Rationale:** The `customLayerData` API allows complete control over Three.js objects while still positioning them on the globe surface. Truck markers have different update patterns (real-time interpolation) than location markers (static).

**Alternatives considered:**
- Mix into `objectsData`: Complicates the data model and requires discriminating truck vs location in marker creation.
- Manual Three.js group added to the scene: Loses three-globe's lat/lng→3D positioning and globe rotation tracking.

### 3. Interpolation Strategy — Frame-based lerp in useFrame

**Choice:** On each animation frame, compute the interpolated position for each truck between its previous and current known GPS position. Interpolation fraction = `elapsedSinceUpdate / expectedPingInterval`. Cap at 1.0 (no extrapolation beyond the last known heading/speed).

**Rationale:** Frame-based lerp in the render loop provides smooth 60fps animation without creating new React state on every frame (which would cause expensive re-renders).

### 4. Stale Pulse Animation — Emissive intensity oscillation

**Choice:** For stale trucks, oscillate the marker's `emissiveIntensity` between 0.5 and 2.0 using `Math.sin(time * 3)` in the render loop. Lost trucks have a static red glow (intensity 1.5, no pulse).

**Rationale:** A pulsing glow is attention-grabbing without being distracting. It reuses the existing emissive material pattern from cluster markers.

### 5. Route Polyline — three-globe pathsData

**Choice:** When a truck is selected, render its planned route using `three-globe`'s `pathsData` API. The path is split into two segments: completed (from origin to truck's current position, dimmed color) and remaining (from truck's current position to destination, bright color). Path is drawn from the route's `waypoints` JSONB array.

**Rationale:** `pathsData` is the native three-globe API for drawing lines on the globe surface (great circle segments). Splitting completed/remaining gives clear visual feedback on delivery progress.

### 6. LOD Integration — Camera distance threshold for visibility

**Choice:** Truck markers are visible when camera distance < 150. Beyond 150, the entire truck layer is hidden. This is a simple boolean check in the render loop, not a per-truck calculation.

**Rationale:** At far zoom (full globe view), individual trucks are too small to see and would clutter the display. The threshold of 150 is slightly farther than the existing LOD cluster threshold (130), giving trucks a wider visible range since there are fewer of them (~20 vs 200+ restaurants).

### 7. Detail Panel — Extend EntityDetailPanel pattern

**Choice:** Create a `TruckDetailPanel` component following the same layout as the existing `EntityDetailPanel` (top-left positioning, semi-transparent dark background, accent color). Truck accent color: `#33CC66` (green) for live, `#EE8800` (orange) for stale, `#CC2222` (red) for lost.

**Rationale:** Consistent panel design across entity types creates a cohesive UX. The existing panel pattern is already proven and responsive.

## Risks / Trade-offs

- **[three-globe customLayerData API]** → Less documented than `objectsData`. Mitigation: inspect three-globe source code for exact API; fall back to a manual Three.js group if `customLayerData` doesn't support per-object lat/lng positioning.
- **[Render loop performance]** → Interpolating 20 trucks every frame adds minimal overhead. Mitigation: early-exit if truck layer is hidden or no trucks have moved.
- **[Click conflict]** → Clicking the globe could hit both a truck marker and a location marker. Mitigation: truck markers sit at a higher altitude (further from globe surface) and are checked first in the raycaster hit list.
