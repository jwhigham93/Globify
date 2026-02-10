## Why

The globe visualization currently has no interactive inspection — users can see nodes and arcs but can't drill into details about any specific entity. The callback props for point clicks already exist in the component interface but aren't wired to any UI. Adding click-to-inspect panels would make every element on the globe actionable, transforming passive visualization into an exploratory tool.

## What Changes

- Wire up existing `onPointClick` callback to display a detail panel for the clicked location
- Add arc click/tap interaction to show route details
- DC detail panel shows: inbound supplier count, outbound restaurant count, total volume in/out, list of connected routes
- Supplier detail panel shows: DCs served, total outbound volume, product categories
- Restaurant detail panel shows: serving DC, inbound volume, distance from DC
- Route detail panel shows: source → destination, volume, route type, estimated transit info
- Panels slide in from the side and can be dismissed; only one panel open at a time
- Platform-adaptive: slide panel on web, bottom sheet on mobile

## Capabilities

### New Capabilities
- `entity-detail-panels`: Slide-in detail panels for each entity type (supplier, DC, restaurant, route) showing contextual metrics and connected entities
- `globe-interaction-handlers`: Click/tap interaction handlers for points and arcs, mapping globe interactions to entity lookups and panel display

### Modified Capabilities
- `globe-scene`: Wire up point and arc click callbacks to the interaction handler system; add visual hover/selection feedback on interactive elements

## Impact

- `apps/Globify/src/components/Globe/GlobeScene.tsx`: Connect onClick callbacks, add hover highlight effects
- `apps/Globify/src/components/Globe/GlobeVisualization.tsx`: Add state management for selected entity and panel visibility
- `apps/Globify/src/components/Globe/types.ts`: Add SelectedEntity union type, panel state types
- New panel UI components (DCDetailPanel, SupplierDetailPanel, RestaurantDetailPanel, RouteDetailPanel)
- `apps/Globify/src/services/supplyChainData.ts`: Add lookup utilities (routes by location, connected entities)
