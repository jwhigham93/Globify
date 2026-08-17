import { Suspense } from 'react';
import { EffectComposer, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { Atmosphere, AerialPerspective } from '@takram/three-atmosphere/r3f';
import { Clouds } from '@takram/three-clouds/r3f';
import { LensFlare, Dithering } from '@takram/three-geospatial-effects/r3f';
import { AtmosphereCloudsErrorBoundary } from './AtmosphereCloudsErrorBoundary';

/**
 * Atmosphere (sky/aerial-perspective) + volumetric clouds, matching the
 * three.js webgl_loader_3dtiles reference example's visual layer — rendered
 * only when explicitly enabled (task 9.1's off-by-default toggle).
 *
 * This mirrors @takram/three-clouds' own README "Default clouds" example
 * *exactly* (down to prop order) rather than an ad-hoc composition — that
 * example is explicitly the "3d-tiles-renderer-integration" pattern (its
 * Storybook stories are literally named Tokyo/Fuji/London 3D-tiles demos),
 * i.e. this library's own reference build for our exact use case:
 *
 *   <Atmosphere>
 *     <EffectComposer enableNormalPass>
 *       <Clouds .../>
 *       <AerialPerspective sky sunLight skyLight />
 *     </EffectComposer>
 *   </Atmosphere>
 *
 * Two details in that snippet are load-bearing, not stylistic — getting
 * either wrong produced a black frame with only a thin atmospheric-limb
 * line at the globe's silhouette (confirmed live):
 *   1. `<Clouds>` MUST precede `<AerialPerspective>` in the composer.
 *      AerialPerspective reads buffers (e.g. shadow length) that Clouds
 *      writes; reversing the order starves it of that input.
 *   2. `enableNormalPass` on <EffectComposer> is required — AerialPerspective
 *      reconstructs world position from depth+normal to compute inscatter/
 *      transmittance per pixel, and silently produces wrong (black) output
 *      without a normal buffer to read.
 * No separate <Sky>/<SkyLight>/<SunLight> — this post-process-lighting mode
 * (the `sky`/`sunLight`/`skyLight` booleans on <AerialPerspective>) handles
 * sky background and lighting entirely inside the postprocess pass; adding
 * the light-source-mode components on top isn't part of this pattern and
 * isn't needed for the tiles' own (unlit) baked textures.
 *
 * No `textures`/`stbnTexture` props are passed to <Atmosphere>/<Clouds> —
 * left undefined, both packages generate their own precomputed textures
 * on the client via PrecomputedTexturesGenerator internally (confirmed in
 * @takram/three-atmosphere's own README: "If left undefined, the textures
 * will be generated using PrecomputedTexturesGenerator"). That generation
 * is async and Suspense-driven (via r3f's useLoader internally), so this
 * whole layer sits in its own <Suspense> boundary — the base tiles scene
 * (a sibling in TilesGlobeScene, not inside this boundary) keeps rendering
 * and stays interactive while it resolves, per the spec's requirement that
 * the async precompute not block first paint.
 *
 * `<Clouds>` props below are ported directly from the reference's
 * `CloudsEffect` configuration (task 9 second bug-fix), not the README's
 * generic "Default clouds" example — the user pointed out live that
 * cloud motion and cloud-cast shadows on the ground/tiles were both
 * present in the reference and missing here:
 *   `coverage = 0.3` (was 0.4, a README default with no basis in the
 *   reference); `localWeatherVelocity.set(0.001, 0)` for cloud drift —
 *   with no velocity, the weather texture is static and clouds never
 *   move; `shadow.{farScale,cascadeCount,mapSize,splitMode,splitLambda}`
 *   configuring the cascaded shadow maps clouds cast — with no shadow
 *   config, `CloudsEffect`'s shadow system runs on defaults that weren't
 *   tuned for this scene's scale.
 * `ExpandNestedProps<CloudsEffect, 'shadow'>` in `@takram/three-clouds`'s
 * own `CloudsProps` type confirms these nested `shadow.*` properties are
 * meant to be set via r3f's `shadow-<key>` dash-prop convention, the same
 * way `@react-three/fiber` exposes any nested object property.
 * `qualityPreset="high"` (from a different README example, not the
 * reference) was dropped — matching the reference means matching its
 * actual configuration, not a plausible-looking substitute.
 *
 * `shadow-maxFar`/`shadow-mapSize` are back to the reference's exact
 * values (`1e5`/`512×512`) as of task 9's tenth round — a prior round
 * (the eighth) raised these to `5e5`/`1024×1024` after a zoomed-out
 * screenshot showed severe cloud-shadow blob artifacts, reasoning that
 * `CascadedShadowMaps`' fixed `maxFar: 1e5` cap (confirmed from its own
 * source: `this._far = this.maxFar != null ? Math.min(this.maxFar,
 * camera.far * this.farScale) : camera.far * this.farScale`) was simply
 * too tight for this app's freely-zoomable camera. That diagnosis was
 * made *before* the ninth round's tone-mapping fix (see below) — with
 * `gl.toneMapping` stuck at `NoToneMapping` the whole time, raw HDR shadow
 * variance had no filmic curve to soften it, which plausibly made
 * ordinary shadow noise look far worse ("blob artifacts") than it
 * actually was. Once tone mapping was actually fixed, the user's report
 * changed from "shadows messed up" to "a little rough compared to the
 * example" — consistent with the eighth round's fix having corrected for
 * a problem it misdiagnosed under a confound, not a real config gap.
 * Reverted to isolate that: if roughness persists at the reference's own
 * exact values with tone mapping now genuinely active, whatever's left
 * is a separate, real issue worth chasing on its own — not something to
 * keep piling divergent values on top of blind.
 * Checked and ruled out in this pass: `stbnTexture` (spatiotemporal blue
 * noise, used to dither/soften raymarch and shadow sampling) — left
 * undefined here, same as `textures` above, but confirmed via
 * `@takram/three-clouds`'s own r3f source
 * (`stbnTexture: h = DEFAULT_STBN_URL`, then loaded through the same
 * loader hook used for the other cloud textures) that it already
 * auto-loads the *same* `DEFAULT_STBN_URL` asset the reference loads
 * explicitly via `new STBNLoader().load(DEFAULT_STBN_URL, ...)` — not a
 * gap, already matching.
 *
 * `<LensFlare>`/`<SMAA>`/`<Dithering>` (task 9 fifth bug-fix) close out the
 * reference's postprocessing pipeline, which chains
 * `[NormalPass, EffectPass(clouds, aerialPerspective), EffectPass(lensFlare),
 * EffectPass(smaa), EffectPass(dithering)]` — we had ported the first two
 * passes but not these three polish passes. All three have real r3f
 * wrapper components (an earlier note here claimed
 * `@takram/three-geospatial-effects` had "no r3f entry point at all" —
 * that was wrong; it lives at the `/r3f` subpath and was missed by only
 * checking for a top-level `r3f.d.ts`), so no manual `<primitive
 * object={...}>` bridging into `<EffectComposer>` was actually needed —
 * `LensFlare`/`Dithering` from `@takram/three-geospatial-effects/r3f`, and
 * `SMAA` from `@react-three/postprocessing` itself, are just ordinary
 * children like `<Clouds>`/`<AerialPerspective>`. Order matches the
 * reference's pass sequence exactly.
 *
 * `<ToneMapping mode={ToneMappingMode.AGX}>` (task 9 ninth bug-fix) is
 * NOT in the reference's pass list at all, and is the single biggest fix
 * in this file — user-reported "much brighter and whiter clouds and
 * illumination on buildings" in the reference vs. persistently dim/muted
 * output here, across every previous round of tuning, is explained by
 * this one architectural gap, confirmed by reading
 * `@react-three/postprocessing`'s own `EffectComposer.tsx` source
 * directly: it unconditionally sets `gl.toneMapping = NoToneMapping` for
 * its *entire* mounted lifetime (comment there: "Disable tone mapping
 * because threejs disallows tonemapping on render targets"), and never
 * reinstates it anywhere — that's this library's deliberate design; it
 * expects tone mapping to be added back as an explicit effect *inside*
 * the composer, via its own `<ToneMapping>` component, not left as a
 * renderer-level property. TilesGlobeScene.tsx's `AgXToneMapping` +
 * `toneMappingExposure = 10` on the renderer (added several rounds ago,
 * under the belief it was "the reference-matching HDR render pipeline")
 * has therefore likely never actually applied to a single rendered frame
 * once `<EffectComposer>` mounts, which — since `AtmosphereCloudsLayer`
 * is now always mounted (see TilesGlobeScene.tsx) — has effectively been
 * the *entire* time atmosphere/clouds have been visible at all. Every
 * screenshot showing dim/muted output was genuinely rendered with no
 * tone-mapping curve whatsoever, just raw HDR clamped to [0,1].
 * The vanilla reference never hits this: it doesn't use
 * `@react-three/postprocessing`'s `EffectComposer` at all — its own
 * custom `renderer.setEffects()` pipeline (see this file's header
 * comment) never touches `gl.toneMapping`, so `AgXToneMapping` set once
 * at renderer construction stays in effect through to the final blit.
 * `renderer.toneMappingExposure` (the float multiplier, as opposed to
 * `.toneMapping`, the mode enum) is untouched by EffectComposer's guard —
 * confirmed by reading Three.js's own tonemapping GLSL chunks (e.g.
 * `Reinhard2ToneMapping`/`Uncharted2ToneMapping`), which all multiply by
 * the shared `toneMappingExposure` uniform before applying their curve —
 * so `<ToneMapping mode={AGX}>` alone should pick up the renderer's
 * existing `exposure = 10` with no separate exposure prop needed.
 * Positioned after `<LensFlare>` and before `<SMAA>`/`<Dithering>`,
 * matching standard post-fx pipeline convention: tone-map the composited
 * HDR result down to LDR first, then anti-alias and dither the LDR image
 * — SMAA's edge detection is tuned for roughly-0-to-1 input, not raw HDR,
 * and dithering should operate on the final quantized output.
 * `Dithering` matters more than cosmetically here regardless — this
 * pipeline's `HalfFloatType` HDR buffer + AGX tone mapping is exactly the
 * combination that produces visible banding without a dithering pass.
 *
 * `<EffectComposer enableNormalPass multisampling={0}>` (task 9 tenth
 * round, found during the same deep pass that reverted the shadow
 * values above): `@react-three/postprocessing`'s `<EffectComposer>`
 * defaults `multisampling` to `8` (8x MSAA on its internal render
 * targets) when not specified — confirmed directly in its source. The
 * reference has no renderer-level MSAA at all; its only anti-aliasing is
 * the explicit `SMAAEffect` pass (a post-process edge-detection
 * technique, unrelated to MSAA). Running both simultaneously — 8x
 * hardware multisampling *and* SMAA — is a real, confirmed divergence
 * from the reference's actual pipeline, not present in its config at all.
 * Set to `0` to match the reference's SMAA-only approach exactly, which
 * also meaningfully reduces GPU/memory cost on an already-heavy pipeline.
 *
 * NOTE (task 9 fourteenth round): a subsequent attempt to drive sun
 * direction via `<Atmosphere ref={...}>` + `updateByDate()` instead of
 * the `date` prop below (chasing a "cloud shadows jump/disappear during
 * drag" report) was rolled back — it introduced a new regression (shadows
 * intermittently disappearing) without confirming it fixed the original
 * complaint, and the user asked to return to this exact state. `date` as
 * a plain prop, as written here, is the confirmed-working mechanism as of
 * this round.
 */
export function AtmosphereCloudsLayer({
  date,
  onError,
}: {
  date: Date;
  onError: () => void;
}) {
  return (
    <AtmosphereCloudsErrorBoundary onError={onError}>
      <Suspense fallback={null}>
        <Atmosphere date={date}>
          <EffectComposer enableNormalPass multisampling={0}>
            <Clouds
              coverage={0.3}
              localWeatherVelocity={[0.001, 0]}
              shadow-farScale={0.25}
              shadow-maxFar={1e5}
              shadow-cascadeCount={2}
              shadow-mapSize={[512, 512]}
              shadow-splitMode="practical"
              shadow-splitLambda={0.71}
            />
            <AerialPerspective sky sunLight skyLight />
            <LensFlare />
            <ToneMapping mode={ToneMappingMode.AGX} />
            <SMAA />
            <Dithering />
          </EffectComposer>
        </Atmosphere>
      </Suspense>
    </AtmosphereCloudsErrorBoundary>
  );
}
