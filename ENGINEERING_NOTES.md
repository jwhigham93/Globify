# Engineering Notes

Globify is a 3D globe visualization of a QSR (quick-service restaurant) supply chain — suppliers, distribution centers, restaurants, delivery routes, live truck GPS — built as a way to get real depth in Go, AWS CDK, Expo/React Native, and WebGL by building something that was actually interesting to look at. Globe-style visualizations (Google Earth, Mapbox GL, CesiumJS) always seemed like magic from the outside; this project is an attempt at a sliver of that magic from scratch, and it left a lot more respect for how much engineering sits underneath "zoom into a map."

These notes are the story behind the code: the constraints that shaped it, the problems that took longest to solve, and an honest account of what's finished versus still in flight.

## What it does

- A 3D globe with supplier/DC/restaurant points and animated, volume-weighted arcs showing flow through the supply chain.
- A **concentration risk** view — suppliers providing more than 30% of inbound volume to a distribution center are flagged, surfacing single-point-of-failure risk that a plain map wouldn't show.
- **Disruption simulation** — disable a node and watch the network recompute reachability and reroute in real time.
- Click-to-inspect detail panels, platform-adaptive (slide-in on web, bottom sheet on mobile).
- Live truck GPS over WebSocket, with a simulator driving realistic movement when there's no real fleet to plug in.
- Google sign-in via Cognito Hosted UI.
- Three view modes — globe, flat-map, satellite.

## Architecture

React Native/Expo 54 on the frontend (Three.js via `react-three-fiber`, a custom GLSL tile shader) talking to a Go 1.26 API (chi, pgx, sqlc) backed by Postgres (Neon on the cheapest deploy tier). Infrastructure is AWS CDK v2, written in Go, with three interchangeable deployment profiles selected by a single context flag:

| Profile | Stack | Cost | Purpose |
|---|---|---|---|
| `full` | EKS + RDS + NAT Gateway + WAF | ~$196/mo | what a production deployment at a real company would look like |
| `lite` | App Runner + RDS + NAT instance | ~$25/mo | a middle ground that still runs a persistent process |
| `ultra-lite` | Lambda + Neon (external DB) | ~$1–3/mo | what's actually deployed day to day |

The three profiles share the same domain code — `infra/cdk/main.go` switches which CDK stacks get instantiated based on `-c profile=`. `ultra-lite` isn't just a smaller version of the others, though; Lambda is stateless with no long-lived connections, so the real-time layer had to be designed around that constraint rather than just deployed at a smaller size. That distinction ended up being one of the more interesting problems in the project (below).

## Problems worth talking about

### Metro couldn't bundle three.js for web

Expo's Metro bundler doesn't support `import.meta` (used internally by three.js) and by default runs out of heap bundling `three` + `three-globe` for the web target. Two fixes, both still in place:

- `apps/Globify/babel.config.js` transpiles away `import.meta` via `babel-plugin-transform-import-meta` (tracked upstream as `expo/expo#30323`).
- The web serve target now runs with `NODE_OPTIONS=--max-old-space-size=8192` so the bundler doesn't OOM at the default ~4GB heap.

The evaluation of alternatives — plain Three.js, `react-globe.gl`'s WebView-based approach, what eventually got built — is written up in `openspec/changes/archive/2026-03-14-migrate-globe-spec-to-openspec/design.md`.

### There's no such thing as a WebSocket on Lambda

Lambda Function URLs have a 15-minute timeout and don't support connection upgrades — a WebSocket needs a long-lived process, which is precisely what Lambda doesn't offer. Rather than drop real-time tracking on the cheap tier, the API runs two WebSocket hub implementations behind the same interface, chosen at startup (`services/supply-chain-api/cmd/server/main.go:84-102`):

- `internal/ws/hub.go` — a conventional gorilla-websocket hub with single-goroutine channel fan-out, used on `lite`/`full` where a persistent process exists.
- `internal/wshub/hub.go` — API Gateway WebSocket API backed by DynamoDB connection storage, used on `ultra-lite`. One quirk discovered along the way: the Lambda Web Adapter routes API Gateway WS events to `POST /events`, not the `$connect` route the AWS docs lead you to expect — handled in `internal/api/websocket_apigw.go`.

The gorilla hub was the original, only implementation; the DynamoDB version came later, once the ultra-lite profile was actually deployed and it turned out Function URLs don't support WebSocket upgrades at all. It's a good example of a design that had to change after hitting a real platform constraint rather than a theoretical one.

### Hardening auth for something actually deployed publicly

The auth layer went through a dedicated hardening pass: validating Cognito **access** tokens rather than ID tokens (an easy mistake to make and a common one), sharing a single verifier across HTTP and WebSocket, and per-IP rate limiting. The interesting part was WebSocket auth specifically — browsers won't set an `Authorization` header on a WS upgrade request, so the token has to travel some other way. The first pass used a `?token=` query parameter, which works but means the token lands in edge and access logs. That was replaced with single-use, 30-second-TTL, sha256-hashed tickets stored in Postgres (`internal/auth/ws_ticket.go`): the client exchanges a real token for a disposable ticket, and only the ticket — never the token — appears in the URL.

### Designing for cost as a first-class constraint

The three deployment profiles existed from the start of the CDK project rather than evolving one into the other — `infra/cdk/README.md` has the full cost breakdown per profile (EKS's control plane alone runs $73/mo). Treating "how much does this cost to run" as a real design constraint, not an afterthought, shaped a lot of the infrastructure decisions, especially the WebSocket architecture described above.

## On not reinventing MapLibre

Worth being upfront about: the globe renderer here is hand-built — Three.js, a custom GLSL tile shader, `react-three-fiber` — because the point was to understand what's actually happening underneath something like Google Maps or Mapbox, not to ship the fastest possible product. Having built it, there's real respect now for what a library like MapLibre GL actually is: a C++ renderer compiled to WebAssembly, with years of engineering behind tiling, label placement, and progressive zoom that this project would be reinventing badly if pushed much further. For a product that needed true digital-twin-grade progressive zoom and vector tile support, MapLibre would be the right call, and the effort saved would go into the supply-chain domain logic instead of the renderer. Building it from scratch was the right call for what this project was for; it wouldn't be the right call for shipping something real. The alternatives actually considered at the time — including a WebView-based `react-globe.gl` approach — are documented in `openspec/changes/archive/2026-03-14-migrate-globe-spec-to-openspec/design.md`.

## Current state and what's next

The most recent work merged Google OAuth (replacing username/password), the DynamoDB WebSocket pivot described above, an EventBridge-driven GPS simulator (fires every 2 minutes, moves trucks in a heading-biased pattern so the demo has live motion without a real fleet feeding it), and a GitHub OIDC deploy role in place of long-lived IAM access keys.

Known, deliberately deferred items:

- `infra/cdk/main.go` — the Cognito callback `WebOrigin` is a hardcoded CloudFront domain literal rather than wired dynamically from the web-hosting stack's output. It fails safe (Cognito rejects an unregistered redirect URI rather than allowing anything through), but it would break if that CloudFront distribution were ever torn down and recreated. The fix is a stack-construction reorder — known, just not urgent enough to have done yet.
- `infra/cdk/stacks/lambda_api.go` — the shared secret gating the EventBridge GPS simulator trigger is embedded in the rule's static event input, which is readable by anyone with `events:DescribeRule` access to the AWS account. It can't simply be removed — it's the only thing distinguishing a genuine EventBridge tick from a spoofed public HTTP call, since the Lambda Web Adapter routes both through the same code path. The real fix is fetching it from Secrets Manager at invoke time. Low urgency because the blast radius today is limited to fake GPS pings, not data access.
- Progressive globe textures — `tileShader.ts` already composites up to 8 high-resolution tile overlays; the OpenSpec task tracker for this feature undercounts actual progress relative to the code, a reminder that spec docs drift even when the code doesn't.
- CI/CD and broader security hardening are both explicitly in progress.
- Some duplication exists between the local/offline risk and disruption logic (kept in TypeScript as an unused fallback) and the live Go implementation — flagged, not yet cleaned up.

## Notable files

A map of the parts of the codebase that do the most interesting work:

| File | What it does |
|---|---|
| `apps/Globify/src/components/Globe/tileShader.ts` | Custom GLSL shader compositing up to 8 high-res tile overlays onto the base globe texture, with geographic-bounds alpha fade |
| `services/supply-chain-api/cmd/server/main.go:84-102` | Selects between the two WebSocket hub implementations based on deployment environment |
| `services/supply-chain-api/internal/auth/ws_ticket.go` | Single-use, sha256-hashed, 30-second-TTL WebSocket auth tickets |
| `services/supply-chain-api/internal/auth/cognito.go` | Cognito JWT verification with JWKS caching |
| `services/supply-chain-api/internal/risk/` | Concentration risk scoring, ported from an earlier TypeScript prototype to the live Go backend |
| `infra/cdk/stacks/` | The three cost-tiered CDK stacks, selected via the `switch profile` in `infra/cdk/main.go` |
| `services/supply-chain-api/internal/api/gps_simulator.go` | EventBridge-driven GPS simulator behind the live truck motion |
