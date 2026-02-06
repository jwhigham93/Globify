## Why

Supply chain networks are vulnerable to disruptions — natural disasters, facility shutdowns, capacity constraints, or supplier failures. Currently, Globify visualizes the network as-is but provides no way to model "what happens if X goes offline?" Understanding cascade effects before they happen is critical for resilience planning and business continuity.

## What Changes

- Add ability to toggle any supplier or DC to a "disabled" state, simulating a disruption
- When a node is disabled, visually grey out the node and all its connected arcs
- Identify and highlight "orphaned" restaurants that lose their only supply path
- Show rerouting possibilities: which alternate DCs could absorb the load, and at what cost
- Display a disruption impact summary panel showing affected restaurant count, volume at risk, and coverage gaps
- Support disabling multiple nodes simultaneously to model compound failures

## Capabilities

### New Capabilities
- `disruption-simulation`: Interactive node disable/enable mechanism with cascade visualization showing impacted routes, orphaned restaurants, and rerouting options
- `disruption-impact-panel`: Summary UI panel displaying disruption metrics (affected restaurants, volume at risk, coverage loss percentage)

### Modified Capabilities
- `globe-scene`: Add visual states for disabled nodes (greyed out) and impacted arcs (dashed/faded), plus click-to-disable interaction on points

## Impact

- `apps/Globify/src/components/Globe/types.ts`: Add disruption state types, extend Location with enabled/disabled state
- `apps/Globify/src/services/supplyChainData.ts`: Add route dependency graph utilities, orphan detection, rerouting logic
- `apps/Globify/src/components/Globe/GlobeScene.tsx`: Add conditional styling for disabled nodes/arcs
- New UI panel component for disruption impact summary
- New service module for network graph analysis (dependency traversal, alternate path finding)
