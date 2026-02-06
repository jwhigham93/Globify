## Why

Chick-fil-A's supply chain depends on a handful of major suppliers (Tyson, Cargill, Sysco, Koch Foods, Perdue). If a single supplier provides a disproportionate share of total inbound DC volume, that's a concentration risk — a single point of failure that could cascade across the entire network. Today, Globify shows all suppliers with equal visual weight, making it impossible to spot dangerous dependencies at a glance.

## What Changes

- Add a "Concentration Risk" visualization mode that color-codes suppliers by their share of total inbound DC volume
- Suppliers with high concentration (e.g., >30% of total volume) render in red/warning colors; low-risk suppliers render in green
- Show per-supplier risk metrics: total volume supplied, number of DCs served, percentage of total network volume
- Add DC-level dependency indicators showing how diversified each DC's inbound supply mix is
- Provide a risk summary panel with a ranked list of suppliers by concentration score and an overall network diversification score

## Capabilities

### New Capabilities
- `concentration-risk-scoring`: Algorithm to calculate supplier concentration risk based on volume share, DC dependency count, and single-source exposure
- `concentration-risk-visualization`: Color-coded supplier/DC rendering mode with risk-level gradients and a summary risk panel

### Modified Capabilities
- `globe-scene`: Support toggling between standard view and concentration risk view, with dynamic point colors based on risk scores

## Impact

- `apps/Globify/src/components/Globe/types.ts`: Add risk score fields to Location, add ConcentrationRiskData interface
- `apps/Globify/src/services/`: New risk calculation module for concentration scoring
- `apps/Globify/src/components/Globe/GlobeScene.tsx`: Dynamic point color accessor based on active view mode
- `apps/Globify/src/components/Globe/constants.ts`: Risk color gradient constants (green → yellow → red)
- New UI panel component for risk summary rankings
