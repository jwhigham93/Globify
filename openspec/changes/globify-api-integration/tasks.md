## 1. Environment Configuration

- [ ] 1.1 Add `API_BASE_URL`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION` to `app.json` under `expo.extra` (empty defaults for dev mode)
- [ ] 1.2 Create `services/config.ts` that reads these values from `expo-constants` and exports them

## 2. Auth Service

- [ ] 2.1 Install `amazon-cognito-identity-js` and `@react-native-async-storage/async-storage` dependencies
- [ ] 2.2 Create `services/authService.ts` — CognitoUserPool initialization, `signIn(email, password)`, `signOut()`, `getCurrentToken()`, `refreshSession()` functions
- [ ] 2.3 Create `app/AuthProvider.tsx` — React context providing `{ isAuthenticated, isLoading, token, signIn, signOut }` with auto-refresh on token expiry
- [ ] 2.4 Create a minimal `app/SignInScreen.tsx` — email + password fields, sign-in button, error display

## 3. API Client

- [ ] 3.1 Create `services/apiClient.ts` — typed `get<T>()` and `post<T>()` functions using `fetch`, automatic `Authorization: Bearer` header from AuthProvider token, base URL from config, retry with exponential backoff (3 attempts)
- [ ] 3.2 Write unit tests for apiClient: successful request, retry on failure, auth header attachment, error response handling

## 4. App Data Loading Refactor

- [ ] 4.1 Refactor `App.tsx` — replace synchronous `getSupplyChainVisualizationData()` with `useEffect` + `useState` async fetch from `GET /api/v1/supply-chain/visualization`, show `LoadingFallback` while loading, show error screen with retry on failure
- [ ] 4.2 Add dev mode fallback: when `API_BASE_URL` is empty, call `getSupplyChainVisualizationData()` locally as before
- [ ] 4.3 Wrap the app tree with `AuthProvider` — show `SignInScreen` when unauthenticated, show globe when authenticated (skip auth in dev mode)
- [ ] 4.4 Continue calling `transformToArcs(locations, routes)` and `transformToDataPoints(locations)` locally after API data arrives

## 5. GlobeVisualization API Integration

- [ ] 5.1 Pass `locations` and `routes` as props to `GlobeVisualization` instead of importing `allLocations`/`allRoutes` directly
- [ ] 5.2 Replace `useMemo(() => computeNetworkRiskMetrics(...), [])` with `useEffect` fetching `GET /api/v1/risk/network` — add loading state for risk panel
- [ ] 5.3 Replace `useMemo(() => computeDisruptionMetrics(...), [disabledNodeIds])` with debounced (300ms) `POST /api/v1/disruption/simulate` — add loading indicator during simulation
- [ ] 5.4 Replace `buildSelectedEntity(location)` call in click handler with `GET /api/v1/entities/:id` — add loading state for entity detail panel, ignore stale responses
- [ ] 5.5 Keep all local visualization transforms unchanged: `applyRiskColorsToPoints`, `applyRiskColorsToArcs`, `applyDisruptionToPoints`, `applyDisruptionToArcs`, `applySelectionToPoints`, `applySelectionToArcs`, `clusterByZoom`

## 6. Testing & Verification

- [ ] 6.1 Update existing Jest tests — mock `apiClient` calls in component tests, verify loading/error states render correctly
- [ ] 6.2 Verify dev mode still works: app renders globe with mock data when no API URL is configured
- [ ] 6.3 Verify all existing E2E tests pass with dev mode (no API dependency)
