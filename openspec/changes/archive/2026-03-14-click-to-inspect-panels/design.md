## Architecture

The click-to-inspect feature adds a `SelectedEntity` union type and an `EntityDetailPanel` component that renders a left-side slide-in panel with entity-specific detail sections. The existing raycaster click handler in GlobeScene is reused for all view modes — in standard and concentration-risk modes it opens the inspect panel; in disruption mode it continues toggling node states.

### Data Flow

```
User clicks marker on globe
  → GlobeScene raycaster fires onPointClick(DataPoint)
  → GlobeVisualization.handlePointClick:
      - disruption mode → toggles disabledNodeIds (existing)
      - standard / risk → getLocationById(id) → buildSelectedEntity(location) → setSelectedEntity
  → EntityDetailPanel receives entity, renders type-specific sub-panel
  → Close via ✕ button, re-clicking same entity, or switching view modes
```

### Entity Lookup Utilities (supplyChainData.ts)

- `getLocationById(id)` — O(n) scan of allLocations
- `getOutboundRoutes(id)` — all routes where sourceId matches
- `getInboundRoutes(id)` — all routes where destId matches
- `buildSelectedEntity(location)` — assembles a `SelectedEntity` discriminated union with connected routes, volumes, and DC names

### Type Additions (types.ts)

```
SelectedEntity = SelectedSupplier | SelectedDC | SelectedRestaurant | SelectedRoute
```

Each variant carries the location plus pre-computed metrics (dcCount, totalVolume, servingDCs, etc.) so the panel renders without additional lookups.

### Panel Design

- Positioned top-left (opposite from RiskPanel/DisruptionPanel which are top-right)
- Consistent styling with existing panels (rgba glass, 12px border-radius, white text)
- Accent color per entity type: amber (supplier), blue (DC), red (restaurant)
- MetricBox rows at top, then scrollable route lists with volume
- Close button (✕) in header
- Hidden automatically in disruption mode to avoid conflict with the disruption panel

## Key Decisions

1. **Single click handler for all modes** — Rather than separate handlers, the same `handlePointClick` callback decides behavior based on `viewMode`. This avoids re-registering raycaster listeners on mode changes.

2. **Panel on the left** — The right side is occupied by RiskPanel and DisruptionPanel. Placing the inspect panel on the left avoids overlap.

3. **No arc click (deferred)** — The proposal mentioned arc clicking, but three-globe arc meshes are thin curved lines that are extremely difficult to raycast reliably. Deferred to a future iteration.

4. **Entity toggle** — Clicking the same entity again closes the panel (toggle behavior), matching common UX patterns.
