## Context

Globify renders 5 suppliers connected to 6 DCs via 13 routes with varying volumes (2,000–5,500 units/week). Currently all suppliers are rendered with identical yellow points — there's no visual distinction between a supplier handling 5% of total volume versus 40%. The route data in `supplyChainRoutes.ts` contains volume information that can be aggregated to compute concentration metrics.

Current supplier volumes from mock data:
- **Koch Foods**: 11,300 units/week (3 DC routes) — highest concentration
- **Tyson Foods**: 13,000 units/week (3 DC routes) — highest volume
- **Perdue Farms**: 10,000 units/week (3 DC routes)
- **Sysco**: 8,000 units/week (2 DC routes)
- **Cargill**: 6,500 units/week (2 DC routes) — lowest volume

Total network inbound volume: ~48,800 units/week. Tyson at ~26.6% and Koch at ~23.2% represent the highest concentration risks.

The existing data model (`Location`, `SupplyRoute`, `DataPoint`, `ArcData`) does not include risk scoring fields. The `pointColor` accessor in `GlobeScene.tsx` currently uses a static lookup by location type.

## Goals / Non-Goals

**Goals:**
- Compute a concentration risk score for each supplier based on volume share and DC dependency
- Compute a diversification score for each DC based on supplier mix
- Visually encode risk levels through dynamic point colors (green → yellow → red gradient)
- Provide a summary panel with ranked supplier risk and overall network diversification score
- Support toggling between standard view and concentration risk view

**Non-Goals:**
- Product-level or SKU-level concentration analysis (we only have aggregate volume)
- Supplier financial health or external risk factors
- Automated recommendations for diversification actions
- Historical trend analysis of concentration over time (deferred to volume-flow-animation)
- Modifying the actual route data — this is a read-only analytics overlay

## Decisions

### 1. Scoring algorithm: Herfindahl-Hirschman Index (HHI) inspired

**Decision:** Calculate supplier concentration using a simplified HHI approach: each supplier's "market share" = their volume as a percentage of total inbound DC volume. The per-supplier risk score = `(supplierVolume / totalVolume) * 100`. The network-level diversification score = `1 - HHI` where HHI = sum of squared market shares.

**Rationale:** HHI is a well-understood concentration metric used in economics and antitrust analysis. It naturally penalizes uneven distributions — a single dominant supplier produces a high HHI.

**Alternatives considered:**
- Simple percentage threshold (>30% = high risk): Too binary, doesn't capture gradation
- Custom weighted formula: Harder to explain and validate; HHI has established precedent

### 2. DC diversification: Supplier count + evenness

**Decision:** For each DC, compute a diversification score based on (a) number of unique suppliers and (b) evenness of volume distribution across those suppliers (using normalized entropy). Score range 0-100 where 100 = perfectly diversified.

**Rationale:** A DC served by 3 suppliers at 33/33/33% is better than one served by 3 suppliers at 90/5/5%. Both count and evenness matter.

### 3. Color mapping: Continuous gradient via interpolation

**Decision:** Map risk scores to colors using linear interpolation across a green→yellow→red gradient. Low risk (0-30%) = green tones, medium (30-50%) = yellow, high (50%+) = red. Use `THREE.Color.lerpColors()` for smooth interpolation.

**Rationale:** Continuous color is more informative than 3 discrete buckets. Three.js color interpolation is already available in the dependency tree.

**Alternatives considered:**
- 3-bucket discrete colors (green/yellow/red): Loses nuance between e.g. 35% and 49%
- Size-based encoding (bigger = riskier): Conflicts with existing point radius semantics (type-based)

### 4. View mode toggle: State-driven prop swap

**Decision:** Add a `viewMode` state ('standard' | 'concentration-risk') to the top-level component. When in concentration-risk mode, pass risk-adjusted `DataPoint[]` (with computed colors) instead of the standard data. Arc colors remain unchanged — risk is about nodes, not routes.

**Rationale:** Clean separation — the globe rendering code doesn't change, only the data it receives. Toggle is a simple state flip.

### 5. Risk panel: Always-visible summary in risk mode

**Decision:** When concentration-risk view is active, show a panel (bottom-left) with: network diversification score, ranked supplier list with risk bars, and per-DC diversification scores. Panel hides when switching back to standard view.

**Rationale:** The panel provides the quantitative detail that the color coding summarizes visually. Bottom-left avoids collision with the disruption panel (top-right) if both features are active.

## Risks / Trade-offs

**[Risk] Mock data has only 5 suppliers — concentration metrics may feel simplistic** → Mitigation: The scoring algorithm works at any scale. Document that richer insights come with more supplier data. The visualization and scoring engine are ready for growth.

**[Risk] Color-blind users may not distinguish green/yellow/red gradient** → Mitigation: Include the numeric risk percentage in point tooltips (future click-to-inspect work) and in the panel's ranked list. Consider adding a secondary visual indicator (point size or ring) in a future accessibility pass.

**[Risk] Two view modes adds UX complexity** → Mitigation: Clear toggle button with label indicating active mode. Standard view is always the default on load.

**[Risk] HHI assumes all volume is fungible** → In reality, different suppliers may provide different products. Mitigation: document this as a known simplification; product-level analysis is a non-goal for this iteration.
