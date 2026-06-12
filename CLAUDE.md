<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

---

# Project: Globify

Supply-chain visibility platform — a 3D globe showing real-time truck positions, supplier routes, disruption risk, and concentration risk for a representative QSR supply chain dataset.

## Monorepo layout

```
apps/
  Globify/          React Native (Expo 54) mobile + web app
  Globify-e2e/      Playwright E2E tests
services/
  supply-chain-api/ Go 1.26 REST + WebSocket API
infra/
  cdk/              AWS CDK v2 in Go — three deployment profiles
openspec/           Feature specs (proposal → design → tasks → archive)
tools/scripts/      NASA tile processing, S3 sync, local tile server
```

## Package manager

**pnpm** — always prefix Nx commands with `pnpm nx`.

## Common commands

```sh
# Frontend
pnpm nx serve Globify          # Expo dev server (web + mobile)
pnpm nx test Globify           # Jest unit tests
pnpm nx lint Globify
pnpm nx e2e Globify-e2e        # Playwright E2E

# Backend (run directly, not via Nx)
cd services/supply-chain-api
go test ./...
go build ./cmd/server
docker compose up              # local Postgres + API

# Infra
cd infra/cdk
cdk synth -c profile=ultra-lite
cdk deploy --all -c profile=ultra-lite
```

## Architecture

### Frontend — `apps/Globify`

- **React Native + Expo 54** targeting iOS, Android, and web
- **3D globe**: Three.js via `react-three-fiber` with custom GLSL tile shader (`tileShader.ts`)
- **Globe components** live in `src/components/Globe/` — `GlobeScene.tsx` is the root, `GlobeVisualization.tsx` orchestrates layers
- **Services** in `src/services/` are pure TS — no React — and each has a `.spec.ts` alongside it
- **Auth**: AWS Cognito via `AuthProvider.tsx`; token is injected into `apiClient.ts` via `setTokenGetter`
- **Real-time**: WebSocket GPS stream in `gpsStreamService.ts` → `useVehiclePositions.ts`
- **View modes**: globe / flat-map / satellite — cycled via `ViewModeToggle`

### Backend — `services/supply-chain-api`

- **Go 1.26**, chi router, zerolog, pgx/v5, sqlc-generated queries
- **Auth middleware**: validates Cognito JWT (`internal/auth/cognito.go`)
- **Database**: PostgreSQL — migrations in `migrations/`, sqlc queries in `sqlc/queries/`
- **Risk scoring**: supplier concentration (`internal/risk/`), disruption analysis (`internal/disruption/`)
- **WebSocket hub**: `internal/ws/hub.go` — broadcasts GPS pings to connected clients
- **Database secret**: stored in AWS SSM Parameter Store (`/supply-chain/DATABASE_URL`) — read at cold start via `SSM_DATABASE_URL` env var; falls back to `DATABASE_URL` for local dev

### Infrastructure — `infra/cdk`

Three deployment profiles selectable with `-c profile=<name>`:

| Profile | Stack | Cost |
|---|---|---|
| `full` | EKS + RDS + NAT Gateway + WAF | ~$196/mo |
| `lite` | App Runner + RDS + NAT instance | ~$25/mo |
| `ultra-lite` | Lambda + Neon (external DB) | ~$1–3/mo |

## Testing approach

- Unit tests: Jest (frontend), `go test` (backend)
- No mocking of the database in Go tests — integration tests hit a real Postgres instance via Docker Compose
- Playwright E2E in `apps/Globify-e2e/` cover globe rendering, view-mode cycling, UI overlays, runtime stability

## Environment

- **WSL2** on Windows — line endings are normalized to LF via `.gitattributes`
- Local dev uses Docker Compose for Postgres (`services/supply-chain-api/docker-compose.yml`)
- Tile assets served locally via `tools/scripts/serve-tiles-local.mjs`

## Feature workflow (OpenSpec)

New features follow the OpenSpec process in `openspec/changes/`:
1. `proposal.md` — what and why
2. `design.md` — how
3. `specs/<area>/spec.md` — detailed spec per component
4. `tasks.md` — implementation checklist
5. Archived to `openspec/changes/archive/` after merge

Use the `openspec-propose`, `openspec-explore`, and `openspec-apply-change` skills for this workflow.
