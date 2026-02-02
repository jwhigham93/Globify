# Design: CFA Supply Chain Visualization

## Context

The Globify app currently displays simple data points on a 3D globe using three-globe's `pointsData` API. We need to add supply chain visualization showing goods flowing from suppliers → distribution centers → restaurants using the `arcsData` API.

The three-globe library (which we use via @react-three/fiber) supports arcs natively with:
- Gradient colors via array: `arcColor: [startColor, endColor]`
- Animated dashes: `arcDashLength`, `arcDashGap`, `arcDashAnimateTime`
- Variable stroke width: `arcStroke`

## Goals / Non-Goals

**Goals:**
- Visualize supply chain flow with animated gradient arcs
- Distinguish route types by color (supplier→DC vs DC→restaurant)
- Show volume differences via arc thickness
- Include realistic mock data for CFA Supply network
- Maintain existing globe interaction (rotation, zoom)

**Non-Goals:**
- Backend API integration (mock data only for now)
- Historical/forecast time views (future work)
- Arc aggregation/clustering (defer until performance requires it)
- Interactive arc selection/tooltips (future enhancement)

## Decisions

### Decision 1: Use three-globe's native arcsData API

**Choice**: Integrate with three-globe's `arcsData` rather than custom Three.js geometry.

**Rationale**:
- three-globe has built-in arc support with all features we need
- Gradient colors, animation, and stroke width are first-class features
- Consistent with existing pointsData integration pattern
- Well-documented API based on globe.gl examples

**Implementation**:
```typescript
globe
  .arcsData(arcs)
  .arcStartLat(d => d.startLat)
  .arcStartLng(d => d.startLng)
  .arcEndLat(d => d.endLat)
  .arcEndLng(d => d.endLng)
  .arcColor(d => d.color)        // [startColor, endColor] gradient
  .arcStroke(d => d.strokeWidth) // Volume-based thickness
  .arcDashLength(0.4)
  .arcDashGap(0.2)
  .arcDashAnimateTime(1500)
```

### Decision 2: Transform data at component level

**Choice**: Keep raw data (locations + routes) separate and compute arc visualization data in the component.

**Rationale**:
- Mirrors future API structure (backend would serve locations + routes)
- Allows filtering/transformation without changing source data
- Easier to add time-based filtering later
- Type safety with separate interfaces for data vs visualization

**Data flow**:
```
locations[] + routes[]  →  transformToArcs()  →  ArcData[]  →  three-globe
```

### Decision 3: Arc color and thickness constants

**Choice**: Define arc styling constants in constants.ts for consistency.

**Colors**:
| Route Type | Start | End |
|------------|-------|-----|
| supplier_to_dc | #FFFF00 (yellow) | #00A3FF (blue) |
| dc_to_restaurant | #00A3FF (blue) | #E60E33 (CFA red) |

**Thickness**:
- Base stroke: 0.3 for DC→restaurant, 0.5 for supplier→DC
- Volume multiplier: 0.5x to 2.0x based on normalized volume
- Min/max bounds: 0.1 to 2.0

### Decision 4: Mock data structure for future API compatibility

**Choice**: Structure mock data to match anticipated backend API response.

**Rationale**:
- When we build the Go backend, the frontend code won't need major changes
- Types defined now will drive API contract later
- Separation of locations and routes allows flexible querying

**Mock data files**:
- `supplyChainLocations.ts` - All location entities
- `supplyChainRoutes.ts` - Route connections with volume
- `supplyChainData.ts` - Combined export with transform utilities

## Risks / Trade-offs

**[Risk] Performance with thousands of arcs** → Start with 30-50 restaurants. Monitor frame rate. Arc aggregation is a known fallback if needed.

**[Risk] Arc visual overlap near DCs** → Accepted for now. Individual arcs have value. Could add jitter or altitude variation later.

**[Trade-off] Mock data vs real data** → Using mock enables rapid iteration. Structure matches future API to minimize rework.

**[Trade-off] Points + arcs on same layer** → May need to adjust point styling so DCs are visually distinct. Consider size/color differentiation.

## Resolved Questions

### Location point sizes by type

**Decision**: DCs rendered larger than restaurants to show supply chain hierarchy.

| Location Type | Point Radius |
|---------------|--------------|
| supplier | 0.5 |
| dc | 0.8 |
| restaurant | 0.3 |

**Rationale**: Visual hierarchy reinforces data model. DCs are central hubs that both receive and distribute, so they should be prominent.

### Arc labels on hover

**Decision**: Arc labels appear on hover (desktop) or tap (mobile).

**Implementation approach**:
- Use three-globe's `arcLabel` accessor to provide label content
- Labels show route summary: "Source → Dest (volume units/week)"
- Native HTML tooltip via three-globe's label rendering

**Note**: Mobile tap interaction may need additional UX consideration (tap-to-select vs tap-to-rotate). Defer detailed mobile interaction design until desktop hover is working.
