## 1. Data Layer — Concentration Risk Scoring Engine

- [ ] 1.1 Add types to `types.ts`: `SupplierRiskScore { supplierId: string, name: string, totalVolume: number, volumeShare: number, riskScore: number, riskLevel: 'low' | 'medium' | 'high', dcCount: number }`, `DCDiversificationScore { dcId: string, name: string, supplierCount: number, diversificationScore: number, supplierBreakdown: { supplierId: string, volumeShare: number }[] }`, `NetworkRiskMetrics { networkDiversificationScore: number, hhi: number, supplierRisks: SupplierRiskScore[], dcDiversification: DCDiversificationScore[] }`
- [ ] 1.2 Create `services/concentrationRisk.ts` module with:
  - `computeSupplierRiskScores(routes, locations)` — aggregates supplier volumes, computes percentage share, assigns risk level thresholds (0-20=low, 20-35=medium, 35+=high)
  - `computeDCDiversification(routes, locations)` — computes per-DC supplier count + normalized entropy score (0-100)
  - `computeNetworkHHI(supplierRiskScores)` — sum of squared market shares
  - `computeNetworkRiskMetrics(routes, locations)` — returns full `NetworkRiskMetrics`
- [ ] 1.3 Write unit tests for `concentrationRisk.ts` covering: balanced suppliers → high diversification, single dominant supplier → high HHI, single-supplier DC → diversification 0, all equal → max diversification

## 2. Visual Layer — Risk Color Mapping

- [ ] 2.1 Add risk color constants to `constants.ts`: `RISK_COLOR_LOW = '#00CC00'`, `RISK_COLOR_MEDIUM = '#CCCC00'`, `RISK_COLOR_HIGH = '#CC0000'`, risk thresholds
- [ ] 2.2 Create `services/riskVisuals.ts` module with:
  - `riskScoreToColor(score)` — linear interpolation green→yellow→red using THREE.Color.lerpColors()
  - `applyRiskColorsToPoints(dataPoints, networkMetrics)` — returns new DataPoint[] with risk-based colors for suppliers/DCs, unchanged for restaurants
- [ ] 2.3 Write unit tests for `riskVisuals.ts` covering: low score → green, medium → yellow, high → red, restaurants unchanged

## 3. View Mode Toggle

- [ ] 3.1 Add `viewMode` state (`'standard' | 'concentration-risk'`) to `GlobeVisualization` component
- [ ] 3.2 Create `components/Globe/ViewModeToggle.tsx` — a toggle button component indicating current mode
- [ ] 3.3 Use `useMemo` to compute `NetworkRiskMetrics` from route/location data (computed once, not per-render)
- [ ] 3.4 Use `useMemo` to derive risk-colored `DataPoint[]` when viewMode is 'concentration-risk', standard colors otherwise
- [ ] 3.5 Pass the appropriate DataPoint[] to GlobeScene based on active viewMode

## 4. Risk Summary Panel

- [ ] 4.1 Create `components/Globe/RiskPanel.tsx` component with semi-transparent overlay positioned bottom-left
- [ ] 4.2 Display network diversification score as a prominent number with color indicator
- [ ] 4.3 Display ranked supplier list (highest risk first) with name, risk score, risk level badge, and colored bar
- [ ] 4.4 Display per-DC diversification scores with supplier breakdown
- [ ] 4.5 Conditionally render panel only when `viewMode === 'concentration-risk'`
- [ ] 4.6 Style panel for both web and native platforms

## 5. Integration & Testing

- [ ] 5.1 Integration test: toggle to concentration risk view → verify supplier points change to risk colors
- [ ] 5.2 Integration test: toggle back to standard view → verify all points revert to type-based colors
- [ ] 5.3 Integration test: verify risk panel shows/hides with view mode toggle
- [ ] 5.4 Visual verification: confirm risk colors render correctly on the live globe with mock data
- [ ] 5.5 Verify existing tests still pass (no regressions)
- [ ] 5.6 Verify risk scores match expected values for the mock dataset (Tyson ~26.6%, Koch ~23.2%, etc.)
