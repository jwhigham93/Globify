## Why

Network design decisions — where to place a new distribution center — are among the most expensive and impactful choices in supply chain management. Currently, Globify shows the existing DC network but provides no way to model how adding or relocating a DC would change delivery distances, restaurant coverage, and volume distribution. A what-if simulator would turn Globify into a decision-support tool for network planning.

## What Changes

- Add ability to place a hypothetical DC on the globe by clicking a location or entering coordinates
- Automatically calculate which restaurants would be reassigned to the new DC based on proximity
- Show before/after route visualization: existing routes fade, proposed new routes highlight
- Display a comparison panel with key metrics: average distance-to-restaurant, max delivery distance, volume per DC, and coverage gap reduction
- Support dragging the hypothetical DC to explore different placements in real time
- Allow removing the hypothetical DC to revert to current-state view

## Capabilities

### New Capabilities
- `dc-placement-simulator`: Interactive hypothetical DC placement with drag-to-reposition, automatic restaurant reassignment based on proximity, and before/after route visualization
- `dc-comparison-metrics`: Comparison panel showing side-by-side metrics (avg delivery distance, volume balance, coverage gaps) for current network vs. proposed network

### Modified Capabilities
- `globe-scene`: Support interactive click-to-place mode for hypothetical points, with distinct visual styling for proposed vs. existing nodes and routes

## Impact

- `apps/Globify/src/components/Globe/types.ts`: Add HypotheticalDC type, extend ArcData with proposed/existing flag
- `apps/Globify/src/services/`: New module for restaurant-to-DC assignment optimization (nearest-DC algorithm), distance calculations, metric comparisons
- `apps/Globify/src/components/Globe/GlobeScene.tsx`: Support click-to-place interaction, proposed node/arc rendering
- New UI panel for before/after metric comparison
- New interaction mode toggle (view mode vs. placement mode)
