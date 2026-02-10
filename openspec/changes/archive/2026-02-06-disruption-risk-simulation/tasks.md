## 1. Data Layer — Disruption State & Graph Analysis

- [ ] 1.1 Add `DisruptionState` type to `types.ts`: `{ disabledNodeIds: Set<string> }` and `DisruptionMetrics` type: `{ disabledCount: number, affectedRouteCount: number, orphanedRestaurants: Location[] }`
- [ ] 1.2 Create `services/disruptionAnalysis.ts` module with:
  - `buildDependencyMap(routes, locations)` — returns adjacency map of DC→restaurant[] and supplier→DC[]
  - `getAffectedRoutes(disabledIds, routes)` — returns routes where source or dest is disabled
  - `getOrphanedRestaurants(disabledIds, routes, locations)` — returns restaurants with no active serving DC
  - `computeDisruptionMetrics(disabledIds, routes, locations)` — returns full `DisruptionMetrics`
- [ ] 1.3 Write unit tests for `disruptionAnalysis.ts` covering: single DC disabled, single supplier disabled, compound failure, no disruptions, all DCs disabled

## 2. Visual State — Dynamic Point & Arc Colors

- [ ] 2.1 Create `services/disruptionVisuals.ts` module with:
  - `applyDisruptionToPoints(dataPoints, disabledIds, orphanedIds)` — returns new DataPoint[] with grey colors for disabled nodes and pulsing indicator for orphans
  - `applyDisruptionToArcs(arcsData, disabledIds, routes, locations)` — returns new ArcData[] with grey gradient for affected arcs
- [ ] 2.2 Add disabled color constants to `constants.ts`: `DISABLED_NODE_COLOR = '#666666'`, `DISABLED_ARC_COLOR: [string, string] = ['#666666', '#666666']`, `ORPHAN_HIGHLIGHT_COLOR = '#FF4444'`
- [ ] 2.3 Write unit tests for `disruptionVisuals.ts` covering: disabled node gets grey, enabled node keeps original color, orphaned restaurant gets highlight color, affected arcs get grey gradient

## 3. Globe Interaction — Point Click Wiring

- [ ] 3.1 Add `onPointClick` callback to `GlobeScene` component using `three-globe`'s `.onPointClick()` API
- [ ] 3.2 Pass clicked point data up to parent component via the existing `onPointClick` prop in `GlobeVisualizationProps`
- [ ] 3.3 In the click handler, filter out restaurant points (only suppliers and DCs are toggleable)
- [ ] 3.4 Verify click interaction does not conflict with OrbitControls rotation/zoom

## 4. State Management — Disruption Toggle Logic

- [ ] 4.1 Add `useState<Set<string>>` for `disabledNodeIds` in `GlobeVisualization` component
- [ ] 4.2 Implement toggle handler: if clicked node ID is in set, remove it; if not, add it
- [ ] 4.3 Use `useMemo` to derive `DisruptionMetrics` from `disabledNodeIds` + route/location data
- [ ] 4.4 Use `useMemo` to derive disrupted `DataPoint[]` and `ArcData[]` via the visual transformation functions
- [ ] 4.5 Pass disrupted data arrays to `GlobeScene` instead of original arrays

## 5. Disruption Impact Panel

- [ ] 5.1 Create `components/Globe/DisruptionPanel.tsx` component with semi-transparent overlay positioned top-right
- [ ] 5.2 Display metrics: disabled node count (with names and types), affected route count, orphaned restaurant count
- [ ] 5.3 Add scrollable orphaned restaurant list sorted alphabetically
- [ ] 5.4 Add "Reset All" button that clears the disabled set
- [ ] 5.5 Conditionally render panel only when `disabledNodeIds.size > 0`
- [ ] 5.6 Style panel for both web and native platforms using existing style patterns

## 6. Integration & Testing

- [ ] 6.1 Integration test: disable a DC → verify orphaned restaurants are detected correctly
- [ ] 6.2 Integration test: disable and re-enable a node → verify full visual restoration
- [ ] 6.3 Integration test: "Reset All" clears all disruption state
- [ ] 6.4 Visual verification: confirm disabled nodes render grey, orphans pulse, and affected arcs fade on the live globe
- [ ] 6.5 Verify existing tests still pass (no regressions in standard rendering)
