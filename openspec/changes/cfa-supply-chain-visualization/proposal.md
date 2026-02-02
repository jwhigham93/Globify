## Why

The Globify app currently shows simple data points on the globe. To demonstrate its value for CFA Supply chain visualization, we need to show the flow of goods from 3rd party suppliers → CFA Supply distribution centers → Chick-fil-A restaurants. This transforms the app from a generic globe demo into a meaningful supply chain visibility tool.

## What Changes

- Replace simple point visualization with supply chain arc visualization
- Add new data types for locations (suppliers, DCs, restaurants) and routes
- Implement animated arcs showing supply flow with gradient colors:
  - Supplier → DC: yellow (#FFFF00) to blue (#00A3FF)
  - DC → Restaurant: blue (#00A3FF) to CFA red (#E60E33)
- Add volume-based arc thickness for high-volume routes
- Include mock data representing real CFA Supply DC locations and sample restaurants (including Singapore and UK)

## Capabilities

### New Capabilities
- `supply-chain-arcs`: Animated arc visualization showing supply flow between locations with gradient colors and volume-based thickness
- `supply-chain-data`: Data model and mock data for suppliers, distribution centers, restaurants, and routes

### Modified Capabilities
- `globe-visualization`: Update to render arcs layer alongside existing point layer

## Impact

- `apps/Globify/src/components/Globe/types.ts`: Add Location, SupplyRoute, ArcData interfaces
- `apps/Globify/src/services/`: New mock data files for supply chain
- `apps/Globify/src/components/Globe/GlobeScene.tsx`: Add arcs rendering
- `apps/Globify/src/components/Globe/constants.ts`: Add arc color constants
