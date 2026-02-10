## Context

The Globify React Native app renders a 3D supply chain globe. Currently, `App.tsx` calls `getSupplyChainVisualizationData()` synchronously at module scope, and `GlobeVisualization.tsx` imports `allLocations`/`allRoutes` directly and computes risk/disruption metrics locally via `useMemo`. The Go API (`go-supply-chain-api`) now provides endpoints for all this data and computation. This change wires the frontend to the API.

The existing visualization transforms (`transformToArcs()`, `transformToDataPoints()`, `applyRiskColors*()`, `applyDisruption*()`, `applySelection*()`, `clusterByZoom()`) remain on the frontend — they depend on camera state and rendering constants.

## Goals / Non-Goals

**Goals:**
- Replace synchronous data imports with async API calls using `fetch`
- Add Cognito-based user authentication (sign-in screen, token storage, auto-refresh)
- Handle loading, error, and offline states gracefully
- Maintain identical globe rendering behavior — only the data source changes
- Keep mock data available as a dev/offline fallback

**Non-Goals:**
- Sign-up flow — user accounts will be pre-created in Cognito initially
- Offline-first or caching strategy (beyond dev fallback)
- State management library (Redux, Zustand) — React state + context is sufficient
- Push notifications or real-time updates
- Modifying visual behavior or adding new features

## Decisions

### 1. Fetch-based API client over Axios/Got

**Choice:** Plain `fetch()` wrapper in `apiClient.ts` with typed response parsing, automatic JWT attachment, retry with exponential backoff, and base URL configuration.

**Rationale:** React Native has built-in `fetch` support. Adding Axios would bring a dependency with no significant benefit for simple GET/POST JSON calls. The wrapper is ~100 lines and provides all needed functionality: auth header injection, JSON parsing, error normalization, retry logic.

**Alternative considered:** Axios — more features (interceptors, cancel tokens) but unnecessary for this use case. React Query / TanStack Query — good for caching but adds complexity beyond current needs.

### 2. amazon-cognito-identity-js for auth

**Choice:** Use `amazon-cognito-identity-js` directly (not Amplify) for Cognito sign-in and token management.

**Rationale:** Amplify is a large dependency that bundles many AWS services we don't need. `amazon-cognito-identity-js` is the lightweight underlying library that handles just authentication: sign-in, token refresh, session persistence. It works with React Native's AsyncStorage.

**Alternative considered:** AWS Amplify — full-featured but pulls in ~2MB of dependencies for auth alone. Manual JWT management — would require reimplementing SRP protocol.

### 3. Data loading in App.tsx via useEffect + useState

**Choice:** Replace the module-level `getSupplyChainVisualizationData()` call with:
```tsx
const [data, setData] = useState<{ locations: Location[]; routes: SupplyRoute[] } | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
  apiClient.get('/supply-chain/visualization')
    .then(setData)
    .catch(setError)
    .finally(() => setLoading(false));
}, []);
```
Continue running `transformToArcs()` and `transformToDataPoints()` locally after data arrives.

**Rationale:** Keeps the change minimal — same data flow, just async. The loading state uses the existing `LoadingFallback` component. Error state shows a retry button.

### 4. Risk/disruption fetched on demand

**Choice:** 
- Risk metrics: fetched once on mount via `GET /api/v1/risk/network` (same as current `useMemo(() => computeNetworkRiskMetrics(...), [])`)
- Disruption: fetched each time `disabledNodeIds` changes via `POST /api/v1/disruption/simulate`
- Entity detail: fetched on entity click via `GET /api/v1/entities/:id`

**Rationale:** This mirrors the existing computation triggers. Risk metrics are static (computed from all data), so fetched once. Disruption depends on user interaction state, so fetched reactively. Entity detail is fetched per selection to avoid loading all entity aggregations upfront.

### 5. AuthProvider context wrapping the app

**Choice:** An `AuthProvider` React context component that handles sign-in state, provides the current JWT token, and auto-refreshes tokens before expiry.

**Rationale:** All API calls need the JWT token. A context provider makes it available to `apiClient` without prop drilling. The auth state also controls whether to show a sign-in screen or the globe.

### 6. Environment configuration via app.json extras

**Choice:** Store `API_BASE_URL`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION` in `app.json` under `expo.extra` and read via `expo-constants`.

**Rationale:** Expo's standard pattern for environment configuration. Can be overridden per EAS build profile (dev/staging/prod) in `eas.json`.

## Risks / Trade-offs

- **[Loading latency]** → First render now requires network call instead of instant data. Mitigated by showing `LoadingFallback` spinner and potentially pre-fetching data.
- **[Disruption API latency]** → Each toggle of a disabled node triggers a POST request. Mitigated by debouncing the API call (300ms delay) so rapid toggles batch into one request.
- **[Auth complexity]** → Cognito adds a sign-in requirement. Mitigated by providing a dev mode bypass that uses mock data when `API_BASE_URL` is not configured.
- **[Race conditions]** → Multiple rapid entity selections could return out-of-order. Mitigated by tracking the latest selection ID and ignoring stale responses.
