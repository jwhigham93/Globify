# Globify — Supply Chain Visibility Platform

<img width="1919" height="952" alt="Screenshot 2026-06-12 094940" src="https://github.com/user-attachments/assets/a6f9510a-afd7-4cfd-a889-1f037cacf222" />

A full-stack supply chain visibility platform built around an interactive 3D globe. Renders real-time truck positions, supplier routes, disruption risk, and concentration risk for a representative QSR supply chain dataset.

**Tech highlights:** React Native · Expo 54 · Three.js (react-three-fiber) · custom GLSL tile shader · Go 1.26 · chi · PostgreSQL 17 · sqlc · WebSocket GPS streaming · AWS CDK v2 · Cognito auth · Lambda / App Runner / EKS deployment profiles

---

## What this demonstrates

| Area | Details |
|---|---|
| **3D WebGL rendering** | Custom tile shader loads NASA satellite imagery at progressive LOD; supplier arcs, truck markers, and risk heatmaps rendered as Three.js layers |
| **Real-time data** | Go WebSocket hub broadcasts GPS pings to all connected clients; React hook streams positions onto the globe without polling |
| **Risk scoring** | Supplier concentration risk, DC diversification index, and disruption simulation computed server-side with a domain model in Go |
| **Full-stack typing** | sqlc generates type-safe Go from raw SQL; API responses typed end-to-end into TypeScript |
| **Infrastructure as code** | AWS CDK v2 in Go — three cost-tiered profiles (Lambda $1/mo → App Runner $25/mo → EKS $196/mo) selectable at deploy time |
| **Auth** | Cognito user pool with JWT middleware in Go; token refresh handled client-side; auth bypassed in local dev |
| **Testing** | 261 Jest unit tests (frontend services), 39 Go tests (risk engine + API), 63 Playwright E2E tests (globe rendering, view modes, runtime stability) |

---

## Architecture

```
apps/
  Globify/            React Native + Expo 54 — iOS, Android, web
  Globify-e2e/        Playwright E2E tests
services/
  supply-chain-api/   Go 1.26 REST + WebSocket API
infra/
  cdk/                AWS CDK v2 (Go) — three deployment profiles
```

### Frontend

- **Globe**: `GlobeScene.tsx` → `GlobeVisualization.tsx` orchestrates Three.js layers via `react-three-fiber`
- **Tile rendering**: custom GLSL shader in `tileShader.ts` samples NASA imagery tiles based on camera zoom
- **Services** (`src/services/`): pure TypeScript, no React — each has a `.spec.ts` alongside it
- **Real-time**: `gpsStreamService.ts` → `useVehiclePositions.ts` → truck markers on globe

### Backend

- **Router**: chi with Cognito JWT middleware (`internal/auth/cognito.go`)
- **Database**: pgx/v5 + sqlc-generated queries; migrations in `migrations/`
- **Risk engine**: `internal/risk/` (concentration, DC diversification) + `internal/disruption/` (simulation)
- **WebSocket hub**: `internal/ws/hub.go` — fan-out broadcast to all connected clients
- **Secrets**: database URL stored in AWS SSM Parameter Store; read at Lambda cold start via `SSM_DATABASE_URL`

### Infrastructure

Three CDK profiles selectable with `-c profile=<name>`:

| Profile | Stack | Monthly cost |
|---|---|---|
| `ultra-lite` | Lambda + Neon (external Postgres) | ~$1–3 |
| `lite` | App Runner + RDS + NAT instance | ~$25 |
| `full` | EKS + RDS + NAT Gateway + WAF | ~$196 |

---

## Quick Start

### Mock data mode (no server needed)

The fastest way to run Globify — uses built-in mock data, no database or API required:

```sh
make dev
# or: pnpm nx serve Globify
```

### Full-stack local mode

Runs the Go API against a local PostgreSQL instance:

```sh
make fullstack
```

This starts PostgreSQL in Docker, runs migrations, seeds data, starts the API on `:8080`, and launches the Expo dev server.

```sh
make stop   # stop everything, restore mock-data defaults
```

### Individual targets

| Command | Description |
|---|---|
| `make dev` | Globify with mock data (no server) |
| `make api` | PostgreSQL + API only |
| `make fullstack` | Everything together |
| `make stop` | Stop all, restore config |
| `make test` | All tests (JS unit + Go) |
| `make test-e2e` | Playwright E2E |

---

## Run Modes

Controlled by `app.json` › `expo.extra`:

| Mode | `API_BASE_URL` | `COGNITO_*` | Behaviour |
|---|---|---|---|
| **Mock data** | _(empty)_ | _(empty)_ | Bundled TypeScript mock data. No network calls. |
| **Local API** | `http://localhost:8080` | _(empty)_ | Local Go API. Auth bypassed. |
| **Production** | `https://api.example.com` | _(set)_ | Deployed API. Cognito sign-in required. |

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| pnpm | 9+ (`npm i -g pnpm`) |
| Go | 1.26+ |
| Docker | 24+ (full-stack mode only) |
| golang-migrate | `go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest` |

---

## Testing

```sh
pnpm nx test Globify                              # 261 Jest unit tests
cd services/supply-chain-api && go test ./...     # 39 Go tests
pnpm nx e2e Globify-e2e                           # 63 Playwright E2E tests
make test                                          # everything at once
```

---

## Project Structure

### Globify (`apps/Globify/src/`)

| Path | Purpose |
|---|---|
| `app/App.tsx` | Root component — auth gate + data loading |
| `app/AuthProvider.tsx` | Cognito context; bypassed when `isAuthEnabled` is false |
| `components/Globe/GlobeVisualization.tsx` | Three.js globe — orchestrates all layers |
| `components/Globe/tileShader.ts` | Custom GLSL for NASA satellite tile sampling |
| `services/apiClient.ts` | Typed HTTP client with JWT injection and retry |
| `services/gpsStreamService.ts` | WebSocket client for real-time truck positions |
| `services/concentrationRisk.ts` | Supplier concentration risk scoring |
| `services/disruptionAnalysis.ts` | Disruption impact simulation |

### Supply Chain API (`services/supply-chain-api/`)

| Path | Purpose |
|---|---|
| `cmd/server/main.go` | Entrypoint — SSM secret resolution, server startup |
| `internal/api/` | HTTP handlers and chi router |
| `internal/auth/cognito.go` | Cognito JWT validation middleware |
| `internal/db/` | pgx connection pool + sqlc-generated queries |
| `internal/risk/` | Concentration risk and DC diversification engine |
| `internal/disruption/` | Disruption simulation and impact scoring |
| `internal/ws/hub.go` | WebSocket fan-out hub |
| `migrations/` | SQL migrations (golang-migrate) and seed data |

See [`services/supply-chain-api/README.md`](services/supply-chain-api/README.md) for full API documentation.

---

## Nx Workspace

```sh
pnpm nx graph                    # visualize project dependency graph
pnpm nx show project Globify     # list available targets
pnpm nx affected --target=test   # run tests only for changed projects
```
