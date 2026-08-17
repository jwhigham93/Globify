# Globify Tiles (v2, in progress)

Photorealistic-3D-Tiles globe UI — a separate app from
[`apps/Globify`](../Globify/README.md) (v1), built on Google Photorealistic
Tiles (via Cesium Ion) + `3d-tiles-renderer` + `@takram/three-atmosphere`/
`@takram/three-clouds`, integrating the same supply-chain visualizations as
v1 on top of a different renderer.

> Full plan, research, and decisions:
> [`openspec/changes/tiles-globe-v2-init/`](../../openspec/changes/tiles-globe-v2-init/).
> This app is still early — only scaffolding, dependency setup, and Cesium Ion
> token plumbing exist so far; the tiles scene itself lands in a later task.

## Cesium Ion token

The app authenticates Google Photorealistic Tiles requests via a Cesium Ion
API token, supplied **only** through the `EXPO_PUBLIC_CESIUM_ION_TOKEN`
environment variable — unlike this repo's other config values (e.g.
Cognito's User Pool ID in `apps/Globify/app.json`), it is **never** committed
to `app.json` or any other file in source control, because it's a bearer
credential rather than an identifier. See
[`design.md` Decision 5](../../openspec/changes/tiles-globe-v2-init/design.md)
for the full rationale.

Without a token configured, the app shows a clear
"Cesium Ion token not configured" notice instead of a blank screen
(`src/components/MissingCesiumTokenNotice.tsx`).

### Local development

Get a free Cesium Ion account and token at
[ion.cesium.com](https://ion.cesium.com/tokens). Then either:

```sh
# One-off, this shell session only
EXPO_PUBLIC_CESIUM_ION_TOKEN=<your-token> pnpm nx serve globify-tiles --web
```

or create `apps/globify-tiles/.env.local` (already gitignored by Expo's
default `.gitignore`):

```
EXPO_PUBLIC_CESIUM_ION_TOKEN=<your-token>
```

### EAS / CI builds

Set `EXPO_PUBLIC_CESIUM_ION_TOKEN` as an
[EAS secret](https://docs.expo.dev/eas/environment-variables/) (or the
equivalent CI secret store) scoped to this app's build profile — do not add
it to `eas.json` directly, since that file is committed.

## Testing

```sh
pnpm nx test globify-tiles
pnpm nx lint globify-tiles
```

## Status

Dual-target (mobile + web) is being attempted first; see the task-1 spike
outcome in
[`tasks.md`](../../openspec/changes/tiles-globe-v2-init/tasks.md) for what's
been verified (Metro bundles the full dependency set on both web and
Android) versus what's still an open gap (real on-device rendering
behavior — no Android SDK/emulator was available to verify that part).
