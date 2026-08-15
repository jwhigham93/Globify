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
- **Globe components** live in `src/components/Globe/` — `GlobeScene.tsx` is the root, `GlobeVisualization.tsx` orchestrates layers. Layers that own their own globe-parented group (rather than going through `three-globe`'s `objectsData`) follow `TruckLayer.tsx`'s pattern — `CityLabelsLayer.tsx` (vectorized city-name labels, `@react-three/drei`'s `Text`/troika-three-text) is the other example; its screen-space label-overlap decluttering lives in `services/labelCollision.ts`
- **`@react-three/drei` imports must come from `@react-three/drei/native`, never the package root.** The root barrel pulls in drei utilities that reach zustand's devtools middleware, which references `import.meta.env` — valid in a real ES module, but Metro's bundle output isn't one, so the whole app throws `Cannot use 'import.meta' outside a module` at runtime (on web *and* native — this isn't a web-only DOM issue). `@react-three/drei/native` is drei's own curated RN-safe subset (`Text`, `Billboard`, `Line`, etc.) and doesn't hit that code path. Any new drei component must be checked against `native/index.js` in the installed package before use.
- **Services** in `src/services/` are pure TS — no React — and each has a `.spec.ts` alongside it
- **Auth**: AWS Cognito via `AuthProvider.tsx`; token is injected into `apiClient.ts` via `setTokenGetter`
- **Real-time**: WebSocket GPS stream in `gpsStreamService.ts` → `useVehiclePositions.ts`
- **View modes**: `standard` / `concentration-risk` / `disruption` — data
  overlays cycled via `ViewModeToggle`, all rendered on the same single
  Three.js/`three-globe` pipeline (no separate flat-map or satellite
  renderer exists)
- **HUD overlays**: shared tokens in `src/components/ui/` — `theme.ts` (brutalist:
  radius 0, opaque fills, hard borders, mono uppercase via `textTransform`),
  `layout.ts` (single `NARROW_BREAKPOINT`, named anchor slots, safe-area insets).
  Panels declare a slot; they never carry their own absolute offsets. Icons are
  drawn with Views (`ui/Shape.tsx`), never glyphs — emoji and symbol characters
  resolve to different fonts with different metrics per platform.
- **Web HTML shell** is `apps/Globify/public/index.html` — Expo's Metro web
  bundler reads the template from `public/`, substitutes `%LANG_ISO_CODE%` /
  `%WEB_TITLE%`, and appends the bundle `<script>`. A `web/index.html` is *not*
  read by anything. The `enhanceMiddleware` hook in `metro.config.js` no longer
  runs on current Metro, so anything it injects is dead — put it in the template.

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
- **The Go suite currently needs no database.** Every test under
  `services/supply-chain-api` is a pure unit test — nothing references
  `DATABASE_URL`, `pgxpool`, or `ConnectPool`, and there is no `TestMain`, so
  `go test ./...` passes with no Postgres reachable. CI runs it without a service
  container for that reason. There is no DB integration coverage today; query
  code (`internal/db`, sqlc output) is exercised only at runtime.
- If you add a test that opens a connection: don't mock the database — use a real
  Postgres via Docker Compose (`services/supply-chain-api/docker-compose.yml`),
  and add both a service container and a `migrations/` apply step to the
  `go-test` job in `.github/workflows/deploy.yml`. An empty database is not
  enough; the schema lives in migrations, not in test fixtures.
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
