# Backend-only data + TanStack Query

**Date:** 2026-07-09
**Branch:** `feat/auth-websocket-gps`
**Status:** Approved design — pending implementation plan

## Problem

The frontend (`apps/Globify`) carries a full second implementation of the app's
domain. It originated from building the app before the backend existed, with a
"dev mode" that runs with no backend. Two kinds of duplication result:

1. **Compute logic mirrored Go ↔ TS** — the backend re-implements what the
   frontend already computes:

   | Domain | Frontend | Backend |
   |---|---|---|
   | Disruption analysis | `disruptionAnalysis.ts` | `internal/disruption/analysis.go` |
   | Concentration / network risk | `concentrationRisk.ts` | `internal/risk/*.go` |
   | Entity detail assembly | `buildSelectedEntity` (`supplyChainData.ts`) | `GET /entities/:id` handler |

2. **The seed dataset itself, duplicated in two languages** —
   `supplyChainLocations.ts` (~304 L) + `supplyChainRoutes.ts` (~391 L) hardcode
   the same ~200 restaurants / 10 DCs / 12 suppliers / ~230 routes that live in
   `services/supply-chain-api/migrations/000002_seed_data.up.sql` (same ids:
   `sup-tyson`, `dc-atlanta`, …).

The mechanism tying them together is `GlobeVisualization.tsx`:
`useApi = !config.isDevMode`. The local compute + mock data are load-bearing in
two situations — dev mode with no backend, and as a `.catch()` error fallback
even in API mode (each `apiClient` call recomputes locally on failure).

This is not dead code; it is a deliberate offline/resilience layer. It is also
exactly the bloat we want to remove.

## Decision

**The backend is the single source of truth.** Production always talks to the
API; the frontend's local compute and mock data are removed. Local development
requires the API running (`docker compose up`).

Adopt **TanStack Query** (`@tanstack/react-query`) as the data-fetching layer.
This is deliberate and synergistic: removing the `.catch(() => computeLocally())`
fallbacks creates a need for real loading / error / retry behavior at every call
site. That behavior is currently hand-rolled in ~5 places with `useEffect` +
`cancelled` flags + a manual 300 ms debounce. TanStack Query replaces all of it
with declarative queries and adds caching, stale-while-revalidate, and retries.
It is React Native / Expo compatible.

### What is NOT duplication (kept as-is)

- `riskVisuals.ts`, `disruptionVisuals.ts`, `truckVisuals.ts` — pure data→color/
  geometry mapping, frontend-only.
- `truckStatus.ts` — no backend equivalent.
- LOD clustering, collision detection, tile code, selection highlight.
- `transformToArcs`, `transformToDataPoints`, `getPointRadiusByType`,
  `getPointColorByType` in `supplyChainData.ts` — pure transforms that operate on
  *fetched* data (already used on API data in `App.tsx`). **Kept.**
- Live GPS streaming (`gpsStreamService.ts` → `useVehiclePositions.ts`) — a real
  WebSocket path to the backend, not duplication. **Unchanged.**

### Auth is out of scope (already decoupled)

`config.isDevMode` is `!apiBaseUrl` — a **data-only** flag. The dev-auth bypass
is a *separate* getter, `config.isAuthEnabled` (`!!cognitoUserPoolId &&
!!cognitoClientId`). `AuthProvider.tsx:90` sets
`isAuthenticated: !config.isAuthEnabled || !!token`. Removing `isDevMode`
therefore does not touch auth: with empty Cognito IDs, local dev still bypasses
the sign-in screen. No new flag is needed. (An earlier comment in `App.tsx`
implied `isDevMode` gated auth; that comment is stale.)

## Architecture

### New data layer — `src/services/queries/`

A `QueryClientProvider` wraps the app root (in `App.tsx`, above `AuthProvider`
or between it and `AppContent`; token wiring via `setTokenGetter` is preserved).
Query client defaults: a small retry count with backoff, and a sensible
`staleTime` so risk/topology are not refetched on every render.

Hooks wrapping the existing `apiClient` (`apiClient.get`/`apiClient.post`):

| Hook | Call | Replaces |
|---|---|---|
| `useSupplyChainData()` | `GET /supply-chain/visualization` → `{ locations, routes }` | `getSupplyChainVisualizationData`, global `allLocations`/`allRoutes` |
| `useNetworkRisk()` | `GET /risk/network` | `computeNetworkRiskMetrics` (`concentrationRisk.ts`) |
| `useDisruptionSimulation(disabledNodeIds)` | `POST /disruption/simulate` | `computeDisruptionMetrics` + manual 300 ms debounce |
| `useEntityDetail(id)` | `GET /entities/:id` | `buildSelectedEntity` |
| `useVehicleRoute(id)` | `GET /vehicles/:id/route` | existing manual fetch (`.catch` fallback) |

`useDisruptionSimulation` is keyed by the sorted `disabledNodeIds` and uses
`placeholderData: keepPreviousData` so toggling nodes shows the previous result
while refetching — replacing the hand-rolled debounce and `cancelled` flag.

### The lookup-index problem (the non-trivial part)

`getLocationById` / `allLocations` (and `getOutboundRoutes` / `getInboundRoutes`)
are **not only fallbacks** — they are used as an ambient client-side lookup
index even in API mode:

- `EntityDetailPanel.tsx` (4 sites) — resolve route source/dest names.
- `GlobeVisualization.tsx` (~lines 428, 437, 476, 492) — resolve disabled-node
  and DC names, and build point-click detail.

Once the global seed arrays are deleted, these consumers need a lookup built from
the *fetched* topology. Solution: the TanStack Query cache becomes the single
in-memory source of truth, exposed through `useSupplyChainData()`, which returns
memoized indexes derived from the fetched data:

```ts
// useSupplyChainData() return shape
{
  locations: Location[];
  routes: SupplyRoute[];
  locationsById: Map<string, Location>;
  outboundByLocationId: Map<string, SupplyRoute[]>;
  inboundByLocationId: Map<string, SupplyRoute[]>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}
```

`EntityDetailPanel` and `GlobeVisualization` consume `locationsById` /
`outboundByLocationId` / `inboundByLocationId` from this hook instead of importing
module-level globals. The topology query is fetched once at the app root and read
from cache by descendants (no prop-drilling, no refetch).

### Removed flags / branches

- `config.isDevMode` getter and every `useApi = !config.isDevMode` branch.
- `App.tsx` `if (config.isDevMode) { getSupplyChainVisualizationData() }` branch —
  becomes an unconditional query.
- `GlobeVisualization` dev-mode mock-vehicle tick effect and `mockPositions`
  state; `vehiclePositions` comes only from `livePositions` (WebSocket).

## Components / files

### Delete (source + spec)

- `src/services/disruptionAnalysis.ts` (+ `.spec.ts`)
- `src/services/concentrationRisk.ts` (+ `.spec.ts`)
- `src/services/mockVehicleData.ts` (+ spec if present)
- `src/services/supplyChainLocations.ts` (+ spec if present)
- `src/services/supplyChainRoutes.ts` (+ spec if present)

### Edit `src/services/supplyChainData.ts`

- **Remove:** `getSupplyChainVisualizationData`, `getLocationById`,
  `getOutboundRoutes`, `getInboundRoutes`, `buildSelectedEntity`.
- **Keep:** `getPointRadiusByType`, `getPointColorByType`, `transformToArcs`,
  `transformToDataPoints` (pure; operate on passed-in data).
- Update its spec to drop tests for removed functions; keep transform tests.

### Add `src/services/queries/`

- `queryClient.ts` — configured `QueryClient`.
- `useSupplyChainData.ts`, `useNetworkRisk.ts`, `useDisruptionSimulation.ts`,
  `useEntityDetail.ts`, `useVehicleRoute.ts` (+ specs).

### Edit consumers

- `App.tsx` — wrap in `QueryClientProvider`; replace manual `fetchData`
  `useEffect` with `useSupplyChainData()`; keep spinner/error-retry UI driven by
  query state; keep `setTokenGetter` wiring.
- `GlobeVisualization.tsx` — remove `useApi`/mock branches; use the query hooks;
  read lookups from `useSupplyChainData()`.
- `EntityDetailPanel.tsx` — read `locationsById` from `useSupplyChainData()`
  instead of importing `getLocationById`.

## Data flow

```
QueryClientProvider
  AuthProvider (isAuthenticated <- isAuthEnabled || token)
    AppContent
      useSupplyChainData() ── GET /supply-chain/visualization ──▶ cache
        │  locations, routes, locationsById, in/outbound indexes
        ├─ transformToArcs / transformToDataPoints (pure)
        └─ GlobeVisualization
             useNetworkRisk() ─────── GET /risk/network
             useDisruptionSimulation(disabledNodeIds) ─ POST /disruption/simulate
             useEntityDetail(id) ──── GET /entities/:id
             useVehicleRoute(id) ──── GET /vehicles/:id/route
             useVehiclePositions() ── WS /vehicles/stream   (unchanged)
             EntityDetailPanel ── locationsById from useSupplyChainData()
```

## Error handling

- **App root / topology:** if `useSupplyChainData()` errors, render the existing
  full-screen "Failed to load data" + Retry (retry = `refetch`). If loading,
  existing spinner.
- **Per-panel (risk, disruption, entity, vehicle route):** each panel renders its
  own loading and error state from the query — no silent local recompute. Errors
  surface to the user instead of being masked by a fallback computation.
- **QueryClient:** bounded retries with backoff for transient failures.

## Type parity (implementation-time verification)

`types.ts` stays. The panels expect `NetworkRiskMetrics`, `DisruptionMetrics`,
and `SelectedEntity`. Backend JSON shapes must match these. **Implementation must
verify field parity** against the Go handlers/models
(`internal/risk`, `internal/disruption`, `internal/models`, `/entities` handler);
if a field differs, add a thin response→type mapper in the corresponding hook
rather than changing the panels. This is an explicit step in the plan.

## Testing

- Delete specs for deleted modules.
- Keep pure-transform specs in `supplyChainData.spec.ts` (arcs / points / colors).
- Add hook specs: render each hook with a `QueryClientProvider` test wrapper and a
  mocked `apiClient`; assert loading → success and loading → error transitions,
  and (for `useSupplyChainData`) that the derived indexes are correct.
- Update `App` and `GlobeVisualization` tests that relied on dev-mode local data
  to instead mock the query hooks / `apiClient`.
- `dataIntegrity.spec.ts` and `entityLookup.spec.ts`: these import
  `supplyChain*` — check whether they assert against the deleted hardcoded arrays.
  If so, either delete (data now lives in the DB seed) or repoint at the backend
  seed as the source of truth. Decide during implementation.

## Dev experience

- `config.isDevMode` removed. Local dev requires the API (`docker compose up` for
  Postgres + API). Document this in `apps/Globify` README and/or `CLAUDE.md`.
- Local dev auth is unchanged: empty Cognito env vars ⇒ `isAuthEnabled=false` ⇒
  sign-in screen bypassed.

## Out of scope

- Cross-language single-sourcing of the seed dataset (JSON fixture feeding both DB
  seed and any future frontend fixtures). Once the TS mock arrays are deleted, the
  SQL seed becomes the only copy, so this is unnecessary now (YAGNI). Revisit only
  if a frontend fixture is reintroduced.
- Any change to the Go backend — every required endpoint already exists.
- Auth behavior.

## Risks

- **Type drift** between Go responses and TS types — mitigated by the parity
  verification step above.
- **`EntityDetailPanel` behavior change** — it currently resolves names
  synchronously from a global. Reading from `useSupplyChainData()` means it
  depends on the topology query being loaded; since topology loads at the root
  before the globe renders, the map is populated by the time panels open, but the
  implementation should handle the empty-map case gracefully (id fallback).
