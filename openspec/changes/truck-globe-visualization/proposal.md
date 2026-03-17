## Why

With vehicle positions streaming to the frontend via WebSocket (from `realtime-gps-streaming`), the globe needs to render delivery trucks as interactive markers that move in real time, show GPS health status via color coding, and provide detail panels on click. This completes the end-to-end real-time fleet visibility feature.

## What Changes

- Render **truck markers** on the globe as 3D arrow/chevron shapes oriented by heading, with color states: green (live), orange+pulse (stale), red (lost).
- **Smoothly animate** truck positions between GPS updates using linear interpolation (no teleporting).
- Show **planned route overlay** as a polyline on the globe surface when a truck is selected, with completed vs remaining segments visually distinguished.
- Add a **truck detail panel** on click, showing vehicle name, status badge, speed, heading, origin→destination, ETA, last ping time, and stale/lost warning banners.
- Add a **layer toggle** button to show/hide the truck layer (default: visible) and a **truck count badge** showing "N trucks active".
- Integrate with **existing LOD system**: trucks are hidden at far zoom (> 150 camera distance), visible at medium/close zoom.

## Capabilities

### New Capabilities
- `truck-markers`: 3D truck markers on the globe with heading orientation, GPS-status color coding, pulse animation for stale vehicles, and smooth position interpolation.
- `truck-detail-panel`: Click-to-inspect panel for trucks showing vehicle metadata, GPS health, route progress, and stale/lost warnings.
- `truck-layer-controls`: UI toggle for truck layer visibility and active truck count badge.

### Modified Capabilities
- `globe-scene`: The globe scene gains a truck marker layer integrated with the existing LOD system and render loop.

## Impact

- **Modified files:** `GlobeScene.tsx` (truck marker layer, render loop integration), `GlobeVisualization.tsx` (truck layer state, toggle control, detail panel), `constants.ts` (truck colors, sizes, thresholds).
- **New files:** `TruckDetailPanel.tsx`, `TruckLayerToggle.tsx`, `truckVisuals.ts` (marker creation, color logic, pulse animation).
- **Dependencies:** Consumes `useVehiclePositions()` hook from `realtime-gps-streaming` change.
- **Performance:** ~20 truck markers rendered as simple Three.js meshes — negligible GPU impact. Interpolation runs in the `useFrame` loop.
