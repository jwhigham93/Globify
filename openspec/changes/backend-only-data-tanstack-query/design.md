## Context

The frontend was built before the backend existed, with a `config.isDevMode`
(`!apiBaseUrl`) path that serves local mock data and computes risk/disruption in
TypeScript. In API mode, each `apiClient` call also carries a
`.catch(() => computeLocally())` fallback. The result is a full second
implementation of the domain (compute + ~700 lines of seed data) that duplicates
the Go backend and can drift silently. The backend already exposes every required
endpoint, and `App.tsx` already fetches topology from `/supply-chain/visualization`.

## Goals / Non-Goals

**Goals**
- Backend is the single source of truth; remove frontend compute + seed data.
- Replace ~5 hand-rolled `useEffect` fetches (and a manual 300 ms debounce) with a
  declarative TanStack Query layer that provides caching, retry, and loading/error
  states.
- Preserve the client-side lookup index by deriving it from fetched topology.

**Non-Goals**
- No backend changes (all endpoints exist).
- No auth changes (dev bypass runs off `isAuthEnabled`, not `isDevMode`).
- No cross-language single-sourcing of the seed dataset — once the TS mock is
  deleted, the SQL seed is the only copy (YAGNI).
- Live GPS WebSocket path is untouched.

## Decisions

### Decision: Adopt TanStack Query rather than hand-roll fetch states
Removing the `.catch` fallbacks creates a need for real loading/error/retry at
every call site. TanStack Query supplies that declaratively plus caching and
stale-while-revalidate, is Expo/React-Native compatible, and lets us delete the
manual debounce and `cancelled`-flag plumbing.

**Alternative considered — strip only, keep manual `useEffect` fetches**: smaller
diff, no new dependency, but forces hand-written loading/error/retry in ~5 places
and keeps the manual debounce. Rejected: the dedup goal is exactly what surfaces
the need TanStack Query fills.

### Decision: Topology query owns the lookup index
`getLocationById` / `allLocations` / `getOutboundRoutes` / `getInboundRoutes` are
used as an ambient lookup index even in API mode (by `EntityDetailPanel` and
`GlobeVisualization` display code), not only as fallbacks. Deleting the seed
arrays therefore requires a replacement. `useSupplyChainData()` returns memoized
indexes derived from the fetched topology, and the TanStack Query cache becomes
the single in-memory source:

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

### Decision: Disruption keyed by disabled-node set with previous-data retention
`useDisruptionSimulation(disabledNodeIds)` posts to `/disruption/simulate`, keyed
by the sorted node ids, with `placeholderData: keepPreviousData`. This replaces
the hand-rolled 300 ms debounce and cancellation flag: React Query dedupes and
retains the last result while refetching.

### Decision: `config.isDevMode` removed entirely; auth untouched
`isDevMode` is data-only (`!apiBaseUrl`). The dev sign-in bypass is a separate
getter, `isAuthEnabled` (`!!cognitoUserPoolId && !!cognitoClientId`), and
`AuthProvider.tsx` sets `isAuthenticated: !config.isAuthEnabled || !!token`.
Removing `isDevMode` needs zero auth changes; the stale comment in `App.tsx`
implying otherwise is corrected.

## Data flow

```
QueryClientProvider
  AuthProvider (isAuthenticated <- isAuthEnabled || token)
    AppContent
      useSupplyChainData() ── GET /supply-chain/visualization ──▶ cache
        │  locations, routes, locationsById, in/outbound indexes
        ├─ transformToArcs / transformToDataPoints (pure, kept)
        └─ GlobeVisualization
             useNetworkRisk() ─────── GET /risk/network
             useDisruptionSimulation(disabledNodeIds) ─ POST /disruption/simulate
             useEntityDetail(id) ──── GET /entities/:id
             useVehicleRoute(id) ──── GET /vehicles/:id/route
             useVehiclePositions() ── WS /vehicles/stream   (unchanged)
             EntityDetailPanel ── locationsById from useSupplyChainData()
```

Hook → endpoint → replaced code:

| Hook | Call | Replaces |
|---|---|---|
| `useSupplyChainData()` | `GET /supply-chain/visualization` | `getSupplyChainVisualizationData`, `allLocations`/`allRoutes`, `getLocationById`, `getOutbound/InboundRoutes` |
| `useNetworkRisk()` | `GET /risk/network` | `computeNetworkRiskMetrics` (`concentrationRisk.ts`) |
| `useDisruptionSimulation(ids)` | `POST /disruption/simulate` | `computeDisruptionMetrics` + manual debounce |
| `useEntityDetail(id)` | `GET /entities/:id` | `buildSelectedEntity` |
| `useVehicleRoute(id)` | `GET /vehicles/:id/route` | manual fetch + `.catch` fallback |

## Type parity (verify during implementation)

`types.ts` stays. Panels expect `NetworkRiskMetrics`, `DisruptionMetrics`,
`SelectedEntity`. Implementation MUST verify backend JSON field parity against the
Go handlers/models (`internal/risk`, `internal/disruption`, `internal/models`,
`/entities` handler). If a field differs, add a thin response→type mapper in the
corresponding hook rather than changing the panels.

## Error handling

- **App root / topology**: on error, render the existing full-screen "Failed to
  load data" + Retry (retry = `refetch`); on loading, existing spinner.
- **Per-panel** (risk, disruption, entity, vehicle route): each renders its own
  loading/error state from its query — no silent local recompute.
- **QueryClient**: bounded retries with backoff.

## Open questions (resolve during implementation)

1. **`dataIntegrity.spec.ts` / `entityLookup.spec.ts`** — these import
   `supplyChain*`. If they assert against the deleted hardcoded arrays, either
   delete them (data now lives only in the DB seed) or repoint them at the backend
   seed as source of truth.
2. **`QueryClientProvider` placement** relative to `AuthProvider` — provider must
   wrap `AppContent`; confirm token wiring via `setTokenGetter` still runs before
   the first authenticated query.

## Risks / Trade-offs

- **Type drift** between Go responses and TS types — mitigated by the parity
  verification step.
- **`EntityDetailPanel` timing** — it resolves names synchronously from a global
  today; reading from the query means it depends on topology being loaded. Topology
  loads at the root before the globe renders, but the empty-index case must be
  handled gracefully.
- **New dependency** (`@tanstack/react-query`) and a rewritten fetch layer — scoped
  to `apps/Globify`, offset by deleting ~900 lines of duplicated code and the
  manual fetch boilerplate.
