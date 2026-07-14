## 1. Setup

- [ ] 1.1 Add `@tanstack/react-query` to `apps/Globify` (`pnpm add` in the app), verify Expo/RN compatibility
- [ ] 1.2 Create `src/services/queries/queryClient.ts` with a configured `QueryClient` (bounded retries + backoff, sensible `staleTime`)
- [ ] 1.3 Nest providers as `QueryClientProvider` (outermost) → `AuthProvider` → `AppContent`; keep `setTokenGetter` token wiring

## 2. Verify backend contract

- [ ] 2.1 Confirm response shapes of `/supply-chain/visualization`, `/risk/network`, `/disruption/simulate`, `/entities/:id`, `/vehicles/:id/route` against Go handlers/models
- [ ] 2.2 Diff each against frontend `types.ts` (`NetworkRiskMetrics`, `DisruptionMetrics`, `SelectedEntity`, `Location`, `SupplyRoute`); note any field mismatches needing a mapper

## 3. Query hooks

- [ ] 3.0 Gate every authenticated query with `enabled: isAuthenticated` so no request fires before the token is wired
- [ ] 3.1 `useSupplyChainData()` → `GET /supply-chain/visualization`, returning `locations`, `routes`, and memoized `locationsById` / `outboundByLocationId` / `inboundByLocationId`, plus loading/error state
- [ ] 3.2 `useNetworkRisk()` → `GET /risk/network` (+ mapper if 2.2 found drift)
- [ ] 3.3 `useDisruptionSimulation(disabledNodeIds)` → `POST /disruption/simulate`, keyed by sorted ids, `placeholderData: keepPreviousData`
- [ ] 3.4 `useEntityDetail(id)` → `GET /entities/:id`
- [ ] 3.5 `useVehicleRoute(id)` → `GET /vehicles/:id/route`

## 4. Rewire consumers

- [ ] 4.1 `App.tsx`: replace manual `fetchData` `useEffect` with `useSupplyChainData()`; drive spinner/error-retry UI from query state; keep `transformToArcs`/`transformToDataPoints`
- [ ] 4.2 `GlobeVisualization.tsx`: remove `useApi`/`isDevMode` branches; use `useNetworkRisk`, `useDisruptionSimulation`, `useEntityDetail`, `useVehicleRoute`; read lookups from `useSupplyChainData()`
- [ ] 4.3 `GlobeVisualization.tsx`: remove dev-mode mock-vehicle tick effect and `mockPositions`; source positions only from `useVehiclePositions` (WebSocket)
- [ ] 4.4 `EntityDetailPanel.tsx`: read `locationsById` from `useSupplyChainData()` instead of importing `getLocationById`; handle empty-index gracefully
- [ ] 4.5 Add per-panel loading/error states for risk, disruption, entity, vehicle-route queries

## 5. Delete duplicated code

- [ ] 5.1 Delete `disruptionAnalysis.ts` (+ spec) and `concentrationRisk.ts` (+ spec)
- [ ] 5.2 Delete `mockVehicleData.ts` (+ spec), `supplyChainLocations.ts` (+ spec), `supplyChainRoutes.ts` (+ spec)
- [ ] 5.3 Trim `supplyChainData.ts`: remove `getSupplyChainVisualizationData`, `getLocationById`, `getOutboundRoutes`, `getInboundRoutes`, `buildSelectedEntity`; keep pure transforms
- [ ] 5.4 Remove `config.isDevMode` getter and any remaining references
- [ ] 5.5 Grep for dangling imports of deleted modules/functions; fix or remove

## 6. Tests

- [ ] 6.1 Delete specs for deleted modules; keep pure-transform tests in `supplyChainData.spec.ts`
- [ ] 6.2 Add hook specs (QueryClient test wrapper + mocked `apiClient`): loading→success and loading→error per hook; verify `useSupplyChainData` derived indexes
- [ ] 6.3 Update `App` / `GlobeVisualization` tests that relied on dev-mode local data to mock the query hooks / `apiClient`
- [ ] 6.4 Delete `dataIntegrity.spec.ts` / `entityLookup.spec.ts` (they asserted on deleted frontend seed arrays)
- [ ] 6.5 Add/confirm a backend Go test validating DB-seed referential integrity (now the sole copy of the dataset)
- [ ] 6.6 Add a hook spec asserting authenticated queries stay disabled until `isAuthenticated` (no request fires)
- [ ] 6.7 `pnpm nx test Globify` green; `pnpm nx lint Globify` clean

## 7. Verify & document

- [ ] 7.1 Run the app against the local API (`docker compose up`); confirm globe, risk, disruption toggle, entity panel, and live trucks all render from the backend
- [ ] 7.2 Document the "API required for local dev" workflow in `apps/Globify` README / `CLAUDE.md`
