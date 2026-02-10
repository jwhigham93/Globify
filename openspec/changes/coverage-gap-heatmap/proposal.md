## Why

Understanding where restaurants are well-served versus underserved by the DC network is critical for prioritizing expansion and identifying risk. Currently, all DC-to-restaurant routes look similar — there's no visual signal for which restaurants are far from their nearest DC or which regions have dense restaurant clusters with limited DC coverage. A coverage heatmap would make geographic gaps and inefficiencies immediately visible.

## What Changes

- Add a heatmap overlay on the globe surface showing restaurant density relative to DC proximity
- Regions with high restaurant density but distant DCs glow "hot" (red/orange) indicating coverage gaps
- Well-served regions (close to a DC with low congestion) render "cool" (green/blue)
- The heatmap can be toggled on/off as a layer over the existing arc visualization
- Show a coverage statistics panel with metrics: average/max/min distance to nearest DC, number of restaurants beyond a threshold distance, and top underserved regions

## Capabilities

### New Capabilities
- `coverage-heatmap`: Globe surface heatmap layer rendering restaurant coverage quality based on distance-to-nearest-DC and local restaurant density
- `coverage-statistics`: Metrics panel showing coverage distribution, underserved restaurant list, and regional gap rankings

### Modified Capabilities
- `globe-scene`: Support composable visualization layers (arcs + heatmap) with toggle controls

## Impact

- `apps/Globify/src/components/Globe/types.ts`: Add HeatmapPoint interface, CoverageMetrics type
- `apps/Globify/src/services/`: New coverage analysis module (haversine distance calculations, density grid computation, gap scoring)
- `apps/Globify/src/components/Globe/GlobeScene.tsx`: Add heatmap data layer using three-globe's heatmap capabilities
- `apps/Globify/src/components/Globe/constants.ts`: Heatmap color ramp constants, distance threshold defaults
- New UI panel for coverage statistics and layer toggle controls
