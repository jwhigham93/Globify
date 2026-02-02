# Tasks: CFA Supply Chain Visualization

## 1. Data Types

- [x] 1.1 Add Location interface to types.ts (id, name, lat, lng, type)
- [x] 1.2 Add SupplyRoute interface to types.ts (id, sourceId, destId, routeType, volume, isActive)
- [x] 1.3 Add ArcData interface to types.ts (startLat, startLng, endLat, endLng, color, strokeWidth, label)
- [x] 1.4 Add LocationType and RouteType union types

## 2. Constants

- [x] 2.1 Add SUPPLIER_TO_DC_COLOR gradient constant [yellow, blue]
- [x] 2.2 Add DC_TO_RESTAURANT_COLOR gradient constant [blue, CFA red]
- [x] 2.3 Add arc stroke constants (BASE_STROKE, MIN_STROKE, MAX_STROKE)
- [x] 2.4 Add arc animation constants (DASH_LENGTH, DASH_GAP, ANIMATE_TIME)
- [x] 2.5 Add point radius constants by location type (supplier: 0.5, dc: 0.8, restaurant: 0.3)

## 3. Mock Data

- [x] 3.1 Create supplyChainLocations.ts with DC locations (6 real CFA Supply DCs)
- [x] 3.2 Add supplier locations to mock data (5 suppliers)
- [x] 3.3 Add restaurant locations to mock data (30-50 US + Singapore + UK)
- [x] 3.4 Create supplyChainRoutes.ts with supplier→DC routes
- [x] 3.5 Add DC→restaurant routes with varying volumes
- [x] 3.6 Create supplyChainData.ts with combined exports and transform utility

## 4. Arc Transform Utility

- [x] 4.1 Create transformToArcs function (locations + routes → ArcData[])
- [x] 4.2 Implement volume-to-strokeWidth calculation with min/max bounds
- [x] 4.3 Add route type to color gradient mapping

## 5. Globe Integration

- [x] 5.1 Update GlobeScene props to accept arcsData
- [x] 5.2 Add arcs configuration to three-globe instance
- [x] 5.3 Configure arc styling (color, stroke, dash animation)
- [x] 5.4 Add arcLabel configuration for hover/tap tooltips
- [x] 5.5 Configure point radius by location type
- [x] 5.6 Update GlobeVisualization to pass arc data

## 6. App Integration

- [x] 6.1 Update App.tsx to import supply chain data
- [x] 6.2 Transform and pass arc data to GlobeVisualization
- [x] 6.3 Update point data to use supply chain locations

## 7. Verify

- [x] 7.1 Run linter to ensure no errors
- [x] 7.2 Verify app builds successfully
- [ ] 7.3 Visual verification of arcs rendering with correct colors and animation
