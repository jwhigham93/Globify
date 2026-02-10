## Context

Globify currently renders a static supply chain network on a 3D globe using `three-globe`. The network consists of 5 suppliers, 6 DCs, and 45 restaurants connected by 58 routes. All nodes and arcs are rendered with fixed visual properties — there is no concept of "state" (enabled/disabled) on any entity, and no interactivity beyond orbit controls.

The app uses React Three Fiber with `three-globe` for rendering. Data flows from static mock arrays (`supplyChainLocations.ts`, `supplyChainRoutes.ts`) through transformation utilities (`supplyChainData.ts`) into `DataPoint[]` and `ArcData[]` props consumed by `GlobeScene.tsx`. The globe is initialized once and data updates happen through separate `useEffect` hooks that call `globeRef.current.pointsData()` and `globeRef.current.arcsData()`.

There are no click handlers wired up yet — `onPointClick` exists in `GlobeVisualizationProps` but is not passed through to `GlobeScene` or connected to `three-globe` callbacks.

## Goals / Non-Goals

**Goals:**
- Enable users to simulate node failures by disabling any supplier or DC
- Visually communicate disruption impact through greyed-out nodes, faded arcs, and highlighted orphaned restaurants
- Compute and display which restaurants lose all supply paths when nodes are disabled
- Identify rerouting possibilities (which alternate DCs exist within range)
- Support compound failures (multiple nodes disabled simultaneously)
- Keep all computation client-side using existing mock data (no backend required)

**Non-Goals:**
- Real-time data feeds or live outage detection
- Automatic rerouting optimization (we show possibilities, not optimal solutions)
- Cost or transit time modeling (deferred to network-cost-scoring change)
- Restaurant node disabling (restaurants are demand endpoints, not supply chain nodes)
- Persisting disruption scenarios across sessions

## Decisions

### 1. State management: React state with derived computation

**Decision:** Use React `useState` to track a `Set<string>` of disabled node IDs. Derive all disruption effects (orphaned restaurants, impacted arcs) as computed values from this state plus the static route data.

**Rationale:** The dataset is small (56 locations, 58 routes) — graph traversal is trivially fast in JS. No need for a state management library or memoization framework. A simple `useMemo` over the disabled set + routes is sufficient.

**Alternatives considered:**
- Redux/Zustand store: Overkill for a single set of disabled IDs
- Mutating the route data directly: Would conflicate clean/disrupted states and make toggle-back harder

### 2. Graph analysis: Simple adjacency map, not a graph library

**Decision:** Build a lightweight adjacency map from the route data (`Map<string, string[]>`) to trace supply paths. Orphan detection = find restaurants where all serving DCs are disabled. Rerouting = find nearest non-disabled DC.

**Rationale:** The network is a simple two-tier DAG (supplier → DC → restaurant). No cycles, no complex pathfinding needed. A full graph library (e.g., graphlib) would be over-engineered.

**Alternatives considered:**
- graphlib/dagre: Too heavy for a 58-edge two-tier graph
- Server-side computation: Unnecessary latency for a small dataset

### 3. Visual disabled state: Dynamic color accessors on three-globe

**Decision:** Use `three-globe`'s color accessor functions (`.pointColor()`, `.arcColor()`) to return grey/faded colors for disabled entities. When the disabled set changes, recompute `DataPoint[]` and `ArcData[]` arrays with updated colors and pass them to the globe.

**Rationale:** `three-globe` supports dynamic data updates via its fluent API. Changing the data arrays triggers re-rendering. This is the same pattern already used for arcs data updates.

**Alternatives considered:**
- Three.js material manipulation: Would bypass `three-globe`'s rendering pipeline and be fragile
- Separate overlay layer: Added complexity for what is essentially a color change

### 4. Interaction: Toggle via point click

**Decision:** Wire up `three-globe`'s `.onPointClick()` callback on supplier and DC points to toggle their disabled state. Restaurant points are not toggleable.

**Rationale:** Direct manipulation is the most intuitive UX — click a node to "turn it off." This also exercises the existing `onPointClick` prop that's already defined in the types but unwired.

### 5. Impact panel: Lightweight overlay component

**Decision:** Render a semi-transparent overlay panel (positioned absolute, top-right) showing disruption metrics. The panel is visible only when at least one node is disabled. It shows: disabled node count, affected route count, orphaned restaurant count, and a list of orphaned restaurant names.

**Rationale:** Avoids introducing a side-panel/drawer UI pattern (save that for click-to-inspect-panels change). A simple overlay is sufficient for summary metrics and keeps the globe as the primary focus.

## Risks / Trade-offs

**[Risk] Point click conflicts with orbit controls** → `three-globe` uses raycasting for click detection which coexists with OrbitControls. However, fast clicks during rotation may be missed. Mitigation: accept this as a known UX limitation; if problematic, add a "disruption mode" toggle that adjusts control sensitivity.

**[Risk] Greyed-out nodes may be hard to see on dark globe texture** → Mitigation: Use a medium grey (`#666666`) rather than dark grey, and add a subtle pulsing ring around disabled nodes for visibility.

**[Risk] Orphan detection is naive (nearest-DC only)** → The current route data assigns each restaurant to exactly one DC. In reality, restaurants could potentially be served by any DC within range. Mitigation: document this as a simplification; future work could add multi-DC eligibility based on distance thresholds.

**[Risk] No undo granularity** → Disabling multiple nodes and wanting to undo just one requires clicking individual nodes back on. Mitigation: Add a "Reset All" button in the impact panel to clear all disruptions at once.
