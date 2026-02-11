# Globify — Supply Chain Visualization

An Nx monorepo containing **Globify**, a React Native / Expo 3D globe app for visualizing global supply chains, and a **Go REST API** that serves supply chain data from PostgreSQL.

## Architecture

```
apps/Globify/          React Native + Expo + Three.js globe visualization
apps/Globify-e2e/      Playwright end-to-end tests
services/supply-chain-api/   Go REST API (chi, pgx, sqlc, PostgreSQL 16)
```

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | `npm install` at repo root |
| Go | 1.22+ | Only needed for full-stack mode |
| Docker | 24+ | Only needed for full-stack mode (PostgreSQL) |
| golang-migrate | latest | `go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest` |

## Quick Start

A root-level `Makefile` provides shortcuts for all common workflows. Run `make help` to see every target.

### Mock Data Mode (no server needed)

The fastest way to run Globify — uses built-in mock data, no database or API required:

```sh
make dev
# or equivalently:
npx nx serve Globify
```

### Full-Stack Local Mode (API + PostgreSQL)

Runs the Go API against a local PostgreSQL instance while Globify connects to `http://localhost:8080`:

```sh
make fullstack
```

This single command will:
1. Start PostgreSQL in Docker
2. Run database migrations and seed data
3. Start the Go API server on `:8080`
4. Patch `app.json` to point at `localhost:8080`
5. Start the Expo dev server

To stop everything and restore mock-data defaults:

```sh
make stop
```

### Individual Targets

| Command | Description |
|---------|-------------|
| `make dev` | Start Globify with mock data (no server) |
| `make api` | Start PostgreSQL + API only |
| `make api-stop` | Stop PostgreSQL + API |
| `make fullstack` | Start everything together |
| `make stop` | Stop everything, restore mock-data config |
| `make test` | Run all tests (JS unit + Go) |
| `make test-e2e` | Run Playwright E2E tests |
| `make help` | List all available targets |

## Run Modes

Globify supports three run modes controlled by `app.json` > `expo.extra`:

| Mode | `API_BASE_URL` | `COGNITO_*` | Behaviour |
|------|---------------|-------------|-----------|
| **Mock data** | _(empty)_ | _(empty)_ | Uses bundled TypeScript mock data. No network calls. |
| **Local API** | `http://localhost:8080` | _(empty)_ | Fetches from local Go API. Auth is bypassed. |
| **Production** | `https://api.example.com` | _(set)_ | Fetches from deployed API. Cognito sign-in required. |

## Testing

```sh
# All JS unit tests (Jest, 261 tests)
npx nx test Globify

# Go API tests (39 tests)
cd services/supply-chain-api && make test

# E2E tests (Playwright, 63 tests)
npx nx e2e Globify-e2e

# Everything at once
make test
```

## Project Structure

### Globify (React Native / Expo)

- `src/app/App.tsx` — Root component with auth & data loading
- `src/app/AuthProvider.tsx` — Cognito auth context (bypassed when `isAuthEnabled` is false)
- `src/app/SignInScreen.tsx` — Cognito sign-in UI
- `src/components/Globe/GlobeVisualization.tsx` — Three.js globe renderer
- `src/services/config.ts` — Runtime configuration from `app.json` extras
- `src/services/apiClient.ts` — Typed HTTP client with JWT & retry
- `src/services/authService.ts` — Cognito token management

### Supply Chain API (Go)

- `cmd/server/main.go` — Server entrypoint
- `internal/api/` — HTTP handlers and router (chi)
- `internal/auth/` — Cognito JWT middleware
- `internal/db/` — PostgreSQL repository (pgx + sqlc)
- `internal/models/` — Domain types
- `internal/risk/` — Risk computation engine
- `internal/disruption/` — Disruption simulation
- `migrations/` — SQL migrations and seed data

See [`services/supply-chain-api/README.md`](services/supply-chain-api/README.md) for full API documentation.

## Nx Workspace

This is an [Nx](https://nx.dev) monorepo. Useful commands:

```sh
npx nx graph              # Visualize project dependencies
npx nx show project Globify  # See available targets
npx nx list               # List installed plugins
```
