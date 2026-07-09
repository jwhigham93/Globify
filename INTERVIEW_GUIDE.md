# Walking Through Globify — Interview Guide

This is a prep doc for talking through this project live, not documentation for users of the repo (that's what the READMEs are for). It exists so you don't have to hold the whole history in your head — read it once before the interview, skim the headers during.

## The 30-second pitch

Globify is a 3D globe visualization of a QSR (quick-service restaurant) supply chain — suppliers, distribution centers, restaurants, truck routes, live GPS — built to learn Go, AWS CDK, Expo/React Native, and WebGL by building something you actually wanted to see exist. Globe-style visualizations (Google Earth, Mapbox GL, CesiumJS) always looked like magic; this project is what it takes to build a sliver of that yourself, and it left you with real respect for how much engineering sits underneath "zoom into a map."

## What you'll actually show them

1. **The globe** — supplier/DC/restaurant points, animated volume-weighted arcs, live truck GPS pings over WebSocket, three view modes (globe / flat-map / satellite).
2. **Concentration risk view** — suppliers providing >30% of inbound volume to a DC light up red. This is the "why does this matter to a business" moment — it's not just a pretty globe, it's a resilience-planning tool.
3. **Disruption simulation** — click a node, disable it, watch the graph reroute/orphan in real time.
4. **Click-to-inspect panels** — platform-adaptive (slide-in on web, bottom sheet on mobile) detail views per entity.
5. **Sign-in** — Google OAuth via Cognito Hosted UI (as of the PR merged just before this interview — see "Recent work" below).

If you only have five minutes, do 1 and 2. They're the most visually convincing and the most "so what."

## Architecture, in one breath

React Native/Expo 54 frontend (Three.js via `react-three-fiber`, custom GLSL tile shader) → Go 1.26 REST+WebSocket API (chi, pgx, sqlc) → Postgres (Neon for the cheap tier). Deploys to AWS via CDK v2 (written in Go) at one of three cost tiers you pick with `-c profile=`:

| Profile | Stack | Cost | When you'd actually use it |
|---|---|---|---|
| `full` | EKS + RDS + NAT Gateway + WAF | ~$196/mo | "this is what a real company would run" |
| `lite` | App Runner + RDS + NAT instance | ~$25/mo | middle ground, still has a persistent process |
| `ultra-lite` | Lambda + Neon (external DB) | ~$1–3/mo | what's actually deployed for a portfolio piece |

**The interesting part**: `ultra-lite` isn't just "the cheap one," it's architecturally different. Lambda is stateless and has no long-lived connections, so the WebSocket layer had to be redesigned around that constraint rather than just deployed smaller. See "Hard problem #2" below.

## Hard problems (this is the part they're actually asking about)

### 1. Metro bundler couldn't handle three.js on web

Expo's Metro bundler doesn't support `import.meta` (used by three.js internals) and ran out of heap (~4GB default) bundling `three` + `three-globe` for web. Two separate fixes, both still live:

- `apps/Globify/babel.config.js:18` — `babel-plugin-transform-import-meta` transpiles `import.meta` away. Referenced upstream issue: `expo/expo#30323`.
- Commit `9774205` (2026-02-10) — bumped `NODE_OPTIONS=--max-old-space-size=8192` on the web serve target so the bundler doesn't OOM.

The full evaluation of alternatives (pure Three.js vs. `react-globe.gl`'s WebView-based approach vs. what got built) is written up in `openspec/changes/archive/2026-03-14-migrate-globe-spec-to-openspec/design.md` if you want to refresh your memory on *why* `@react-three/fiber` + `three-globe` won before you're asked.

### 2. WebSocket doesn't exist on Lambda — so there are two hub implementations

Lambda Function URLs have a 15-minute timeout and don't support connection upgrades — a WebSocket needs a long-lived process, which is the opposite of what Lambda is. Rather than give up real-time tracking on the cheap tier, the API runs **two hub implementations behind the same interface**, selected at startup by environment (`services/supply-chain-api/cmd/server/main.go:84-102`):

- `internal/ws/hub.go` — classic gorilla-websocket hub, single-goroutine channel fan-out. Used for `lite`/`full` where a persistent process exists.
- `internal/wshub/hub.go` — API Gateway WebSocket API + DynamoDB connection storage. Used for `ultra-lite`. Discovered along the way: Lambda Web Adapter routes API Gateway WS events to `POST /events`, not the `$connect` route you'd expect — that dispatch quirk is handled in `internal/api/websocket_apigw.go`.

This is a good "tell me about a time you had to change your design after hitting a platform constraint" answer — the original build used gorilla-only; the DynamoDB pivot came later once ultra-lite was actually deployed and Function URLs turned out not to support WS upgrades at all.

### 3. Auth hardening for a real, publicly-deployed system

Squash-merged as PR #15 ("harden auth across all layers"). The one-liner: validate Cognito **access** tokens, not ID tokens (a real, easy-to-make mistake); share one `auth.Verifier` across HTTP and WS; WebSocket auth can't use an `Authorization` header (browsers won't set one on the WS upgrade request), so it originally went through a `?token=` query param — which means the token would land in edge/access logs. Fixed with **single-use, 30-second-TTL, sha256-hashed tickets** stored in Postgres (`internal/auth/ws_ticket.go`) — the client exchanges a real token for a disposable ticket, and only the ticket ever touches the URL.

### 4. Picking a cost tier that doesn't bankrupt a pet project

`infra/cdk/README.md` has the full cost breakdown per profile (EKS control plane alone is $73/mo). The CDK app was built with all three profiles from day one (commit `19ed7e1`) rather than evolved incrementally — same Go stack code, different `-c profile=` context flag swaps `cluster.go` for `apprunner.go` for `lambda_api.go`. Worth mentioning if asked about designing for cost as a first-class constraint rather than an afterthought.

## Recent work (so you don't get caught flat-footed)

As of this interview prep session, **PR #19 was just merged into `main`**: Google OAuth (replacing username/password), the DynamoDB WebSocket pivot described above, an EventBridge-driven GPS simulator (fires every 2 min, moves trucks ~440m/tick so the demo has live motion without a real fleet), and a GitHub OIDC deploy role (replacing long-lived IAM user access keys). If you haven't clicked through the app since before this, the sign-in flow looks different now.

**Known, deliberately-deferred follow-ups** — mention these proactively if asked "what would you do next," it reads better than getting caught by a code reviewer's question:
- `infra/cdk/main.go` — the Cognito callback `WebOrigin` is a hardcoded CloudFront domain literal rather than wired dynamically from the `WebHostingStack` output. Fails *safe* (Cognito just rejects an unregistered redirect URI), but breaks if that CloudFront distribution is ever torn down and recreated. Fix is a stack-construction reorder (`WebHosting`/`Security` before `Auth`) — a good "I know the fix, I triaged it as non-urgent" answer.
- `infra/cdk/stacks/lambda_api.go` — `GPS_SIM_TOKEN` (the shared secret gating the EventBridge simulator trigger) is embedded in the EventBridge rule's static event input, which is readable by anyone with `events:DescribeRule` IAM access to the account. It can't just be deleted — it's the only thing distinguishing a genuine EventBridge tick from a spoofed public HTTP call, since Lambda Web Adapter routes both through the same code path. Real fix is fetching it from Secrets Manager at invoke time instead of baking it into the CDK-defined rule. Blast radius today is low (worst case: fake GPS pings), which is why it's triaged below the auth-token issue.
- Progressive globe textures (higher-resolution NASA tile overlays as you zoom) — `tileShader.ts` composites up to 8 tile overlays already; the OpenSpec tracker for this (`progressive-globe-textures`) undercounts progress relative to the actual code, a good example of "the spec docs drifted, the code didn't."
- CI/CD and security hardening are both explicitly in-progress, not finished — say so directly rather than overselling.
- Local offline mode and backend code have some duplication (risk/disruption logic exists in both TS, kept as an unused fallback, and Go, the live path) — flagged, not yet cleaned up.

## The MapLibre question (have this answer ready)

If asked "why not use an existing library" or "what would you do differently" — this is your best answer, and it shows judgment rather than just execution:

> I built the globe myself — Three.js, a custom GLSL tile shader, `react-three-fiber` — because I wanted to understand what's actually happening under a Google Maps or Mapbox. Having built it, I now genuinely respect how much is there: MapLibre GL is a C++ renderer compiled to WebAssembly, with years of work on tiling, label placement, and progressive zoom that I'd be reinventing badly if I kept pushing this custom engine further. For a *product* — something that needs true digital-twin-grade progressive zoom, dynamic labeling, and vector tile support — I'd reach for MapLibre and spend my effort on the supply-chain domain logic instead of the renderer. Building it from scratch here was the right call for *learning*; it would be the wrong call for *shipping*.

This is explored in more depth in `openspec/changes/archive/2026-03-14-migrate-globe-spec-to-openspec/design.md`, which documents the alternatives actually considered (including a WebView-based `react-globe.gl` option) before committing to the current stack.

## Code tour — file:line cheat sheet

Pull these up live if asked to show real code, in rough order of "most impressive first":

| What | Where | Why it's worth showing |
|---|---|---|
| GLSL tile compositing | `apps/Globify/src/components/Globe/tileShader.ts` (194 lines) | Custom shader blending up to 8 high-res tile overlays with geographic-bounds alpha fade — the "I actually wrote WebGL" proof point |
| Dual WebSocket hub selection | `services/supply-chain-api/cmd/server/main.go:84-102` | Shows the Lambda-vs-persistent-process tradeoff being handled explicitly, not papered over |
| Single-use WS auth tickets | `services/supply-chain-api/internal/auth/ws_ticket.go` | Security-conscious design: sha256-hashed, 30s TTL, atomic `DELETE...RETURNING` so a ticket can't be replayed |
| Cognito JWT verification | `services/supply-chain-api/internal/auth/cognito.go` (242 lines) | JWKS caching, access-token (not ID-token) validation |
| Risk scoring | `services/supply-chain-api/internal/risk/` | HHI/Shannon-entropy-inspired concentration risk, ported from an earlier TS prototype to Go for the real backend |
| Three cost-tiered CDK stacks | `infra/cdk/stacks/` (12 files) selected via `infra/cdk/main.go`'s `switch profile` | Same domain code, three deployment shapes — a good "designing for cost" story |
| GPS simulator | `services/supply-chain-api/internal/api/gps_simulator.go` | EventBridge-driven, heading-biased movement — why the demo has live motion without a real GPS feed |

## Fuzzy-memory quick reference

Facts you're likely to blank on mid-conversation:

- **Stack**: Expo 54 (React Native + web) / Three.js via `react-three-fiber` / Go 1.26 + chi + pgx/v5 + sqlc / Postgres (Neon on ultra-lite) / AWS CDK v2 in Go.
- **Cost tiers**: full ~$196/mo (EKS+RDS+NAT+WAF), lite ~$25/mo (App Runner+RDS), ultra-lite ~$1-3/mo (Lambda+Neon).
- **Stale GPS thresholds**: live <5min, stale 5–15min, lost >15min (`truck-gps-data-model` change).
- **PR #15** = auth hardening (access tokens, WS tickets, RBAC scaffold, rate limiting). **PR #19** = Google OAuth + DynamoDB WS hub + GPS simulator + GitHub OIDC deploys — merged same day as this interview prep.
- **Testing**: root README (last rewritten in `ce47645`) states 261 Jest / 39 Go / 63 Playwright E2E tests as of that writing — PR #19 added more, so treat that as "roughly this many, run `pnpm nx test Globify` / `go test ./...` for the current count" rather than quoting it as exact.
- If asked "what's on `main` right now" — everything in this doc is current as of the PR #19 merge. Don't accidentally describe the pre-merge state (old gorilla-only hub, username/password auth) as current.
