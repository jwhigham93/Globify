## Why

The Globify React Native app currently imports hardcoded TypeScript data at module load time. With the Go API and AWS infrastructure in place, the frontend needs to fetch data from the live API instead. This change replaces synchronous data imports with async API calls, adds Cognito authentication, and introduces loading/error states — completing the transition from mock data to a full client-server architecture.

## What Changes

- Create an API client service (`apiClient.ts`) with base URL configuration, JWT token attachment, error handling, and retry logic
- Integrate AWS Cognito authentication for user sign-in and token management
- Refactor `App.tsx` to load data asynchronously via `useEffect` instead of synchronous module-level import
- Update `GlobeVisualization.tsx` to fetch risk metrics and disruption simulation from the API instead of computing locally
- Update entity selection to call `GET /entities/:id` instead of local `buildSelectedEntity()`
- Add loading states and error handling throughout the data flow
- Keep all visualization transforms (`transformToArcs`, `transformToDataPoints`, color application, LOD clustering) on the frontend unchanged
- Provide environment configuration for API URL and Cognito settings

## Capabilities

### New Capabilities
- `api-client`: HTTP client service for communicating with the Go supply chain API, including JWT token management and error handling
- `cognito-auth-flow`: Cognito user authentication integration for the React Native app (sign-in, token refresh, token storage)

### Modified Capabilities
- `globe-scene`: Data loading changes from synchronous import to async fetch with loading/error states

## Impact

- **Modified files**: `App.tsx`, `GlobeVisualization.tsx` — data loading refactored to async
- **New files**: `services/apiClient.ts`, `services/authService.ts`, `app/AuthProvider.tsx`
- **Dependencies**: `amazon-cognito-identity-js` or AWS Amplify Auth
- **Environment config**: `API_BASE_URL`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION`
- **Removed local computation**: `concentrationRisk.ts` and `disruptionAnalysis.ts` no longer called directly — their results come from the API. Files remain for reference/fallback but are unused in production flow.
- **Mock data fallback**: `supplyChainLocations.ts`, `supplyChainRoutes.ts` remain as offline/dev fallback
