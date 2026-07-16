## Why

The frontend carries a full second implementation of the app's domain — risk and
disruption compute logic mirrored from Go, plus the entire ~700-line seed dataset
hardcoded in TypeScript — left over from building the app before the backend
existed. This duplication bloats the code and lets the two implementations drift
silently. The backend now owns every endpoint the app needs, so the frontend copy
is pure liability.

## What Changes

- **BREAKING (dev workflow)**: Remove frontend "dev mode" local-data path. Local
  development now requires the API running (`docker compose up`). The backend is
  the single source of truth.
- Remove frontend compute logic: `disruptionAnalysis.ts`, `concentrationRisk.ts`.
- Remove frontend mock/seed data: `mockVehicleData.ts`, `supplyChainLocations.ts`,
  `supplyChainRoutes.ts`, and the seed/lookup functions in `supplyChainData.ts`
  (`getSupplyChainVisualizationData`, `getLocationById`, `getOutboundRoutes`,
  `getInboundRoutes`, `buildSelectedEntity`). Keep the pure transforms
  (`transformToArcs`, `transformToDataPoints`, `getPointColorByType`,
  `getPointRadiusByType`).
- Remove the `config.isDevMode` flag and every `useApi = !config.isDevMode` branch
  and `.catch(() => computeLocally())` fallback.
- Add **TanStack Query** (`@tanstack/react-query`) as the data-fetching layer:
  five hooks wrapping the existing `apiClient` (supply-chain topology, network
  risk, disruption simulation, entity detail, vehicle route), replacing ~5
  hand-rolled `useEffect` fetches and a manual 300 ms debounce.
- Move the client-side lookup index (`locationsById` and route indexes) out of
  deleted module globals and into the topology query result, so panels read it
  from cache instead of importing seed arrays.
- Live GPS WebSocket streaming (`gpsStreamService` → `useVehiclePositions`) is
  **unchanged** — real streaming, not duplication.
- Auth is **unchanged**: the dev sign-in bypass runs off `config.isAuthEnabled`
  (empty Cognito IDs), independent of `isDevMode`.

## Capabilities

### New Capabilities
- `frontend-data-access`: How the mobile/web app fetches and caches supply-chain
  data from the backend API — the TanStack Query layer, its hooks, the shared
  topology cache and derived lookup indexes, and per-query loading/error behavior.
  Establishes the backend as the single source of truth for all domain data.

### Modified Capabilities
<!-- None. globe-scene requirements are unchanged; only the data source feeding it changes, which is captured by the new frontend-data-access capability. -->

## Impact

- **Frontend** (`apps/Globify`): deletes 5 service modules + specs, trims
  `supplyChainData.ts`, rewrites data wiring in `App.tsx`, `GlobeVisualization.tsx`,
  and `EntityDetailPanel.tsx`. New `src/hooks/queries/` directory.
- **Dependency**: adds `@tanstack/react-query` to `apps/Globify`.
- **Config**: removes `config.isDevMode`.
- **Tests**: deletes specs for removed modules; adds hook specs; updates
  `App`/`GlobeVisualization` tests that relied on dev-mode local data. Revisit
  `dataIntegrity.spec.ts` / `entityLookup.spec.ts` (may assert against deleted
  arrays).
- **Backend** (`services/supply-chain-api`): no changes — all endpoints
  (`/supply-chain/visualization`, `/risk/network`, `/disruption/simulate`,
  `/entities/:id`, `/vehicles/:id/route`) already exist.
- **Docs**: note the new "API required for local dev" workflow in
  `apps/Globify` README / `CLAUDE.md`.
