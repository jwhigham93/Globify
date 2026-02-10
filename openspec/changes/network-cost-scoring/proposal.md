## Why

Visualizing the supply chain network is valuable, but without quantitative metrics it's hard to compare scenarios or justify decisions. A network cost/efficiency scoring system would assign measurable scores to the overall network and individual components, enabling data-driven comparisons when evaluating changes like adding a DC, switching suppliers, or rebalancing routes.

## What Changes

- Calculate a total network efficiency score based on weighted distance × volume across all routes
- Score individual DCs by utilization (actual vs. capacity), delivery efficiency (avg distance to served restaurants), and supplier diversity
- Score suppliers by volume contribution, DC reach, and route efficiency
- Display scores as an always-visible summary bar and a detailed breakdown panel
- Scores update in real time when used with other features (what-if simulator, disruption simulation)
- Provide a ranked leaderboard view of DCs and suppliers by efficiency

## Capabilities

### New Capabilities
- `network-scoring-engine`: Algorithm to compute network-wide and per-entity efficiency scores using distance-weighted volume, utilization ratios, and diversity factors
- `scoring-dashboard`: UI components displaying network score summary, entity leaderboards, and detailed per-DC/per-supplier breakdowns

### Modified Capabilities
_None — this is an additive analytics layer that reads existing data without changing rendering requirements._

## Impact

- `apps/Globify/src/services/`: New scoring engine module with distance calculations (haversine), normalization, and composite score computation
- `apps/Globify/src/components/Globe/types.ts`: Add NetworkScore, EntityScore interfaces
- New dashboard UI components (score bar, leaderboard, detail cards)
- Integration hooks for real-time score recalculation when network state changes (pairs with what-if simulator and disruption simulation)
