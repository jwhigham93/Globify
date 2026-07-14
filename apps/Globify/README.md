# Globify (frontend)

React Native + Expo 54 app rendering the supply-chain globe.

## Data source

The backend API is the **single source of truth** for all domain data — topology
(locations/routes), network risk, disruption simulation, and entity detail. The
app has **no offline/mock data path**; it fetches everything from the API using
[TanStack Query](https://tanstack.com/query) (see `src/services/queries/`).

## Running locally

The app requires the API to be running.

```sh
# 1. Start Postgres + the Go API (from the repo root)
cd services/supply-chain-api
docker compose up            # Postgres + API on http://localhost:8080

# 2. Point the app at the API and start Expo (from the repo root)
pnpm nx serve Globify
```

Set `API_BASE_URL` (via `expo.extra` in `app.json` or an EAS profile) to the
API's base URL. Without it, data requests fail — there is no local fallback.

### Auth in local dev

Auth is independent of the data source. If Cognito env vars
(`COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`) are **empty**, `config.isAuthEnabled`
is false and the sign-in screen is bypassed (`AuthProvider` treats the user as
authenticated). Provide those vars to exercise the real Cognito flow.

## Testing

Unit tests never require a running backend — data-access hooks are tested with a
mocked `apiClient` and a `QueryClient` wrapper.

```sh
pnpm nx test Globify
pnpm nx lint Globify
```

Seed-dataset referential integrity is validated in the backend
(`services/supply-chain-api/internal/seed`), not here.
