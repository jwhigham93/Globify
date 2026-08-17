import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { AgXToneMapping, HalfFloatType, WebGLRenderer } from 'three';
import {
  TilesRenderer,
  TilesPlugin,
  GlobeControls,
  TilesAttributionOverlay,
} from '3d-tiles-renderer/r3f';
import type { GlobeControls as GlobeControlsImpl } from '3d-tiles-renderer/three';
import {
  CesiumIonAuthPlugin,
  GLTFExtensionsPlugin,
  TilesFadePlugin,
  UpdateOnChangePlugin,
} from '3d-tiles-renderer/plugins';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { TileCreasedNormalsPlugin } from 'three/addons/misc/TileCreasedNormalsPlugin.js';
import { config } from '../../services/config';
import { InitialCameraPosition } from './InitialCameraPosition';
import { AdjustHeightOnInteraction } from './AdjustHeightOnInteraction';
import { LocationMarkers } from './LocationMarkers';
import { RouteArcs } from './RouteArcs';
import { AtmosphereCloudsLayer } from './AtmosphereCloudsLayer';
import { AtmosphereCloudsControls } from './AtmosphereCloudsControls';
import {
  GOOGLE_PHOTOREALISTIC_TILES_ASSET_ID,
  DRACO_DECODER_PATH,
  INITIAL_CAMERA_LAT_DEG,
  INITIAL_CAMERA_LON_DEG,
  INITIAL_CAMERA_ALTITUDE_M,
} from './constants';

// Module-level singleton — must not be recreated on every render (it owns
// worker/network resources). type:'js' forces the pure-JS Draco decoder
// instead of the WASM one, sidestepping the native-runtime WASM risk noted
// in design.md's Risks section until that's verified on-device (task 1.4).
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
dracoLoader.setDecoderConfig({ type: 'js' });

// The time-of-day slider represents *local* solar time at
// INITIAL_CAMERA_LAT/LON_DEG (Chicago), not raw UTC — matching the
// reference's own approach (its comment: "0:00 UTC = 9:00 AM Tokyo",
// i.e. its hourUTC control is deliberately offset so the slider aligns
// with the *scene's* local time, not Greenwich). Without this, passing
// the slider's hour straight into setUTCHours means "noon" on the slider
// is actually ~7am local at Chicago in June — reported live as "lighting
// seems dark, 16:30 is the best lighting so far" (16:30 UTC == 11:30am
// CDT, i.e. accidentally close to actual local solar noon). Chicago is
// UTC-5 (CDT) at the fixed June 21 reference date already chosen below;
// DST-exact correctness isn't the point here (this is a fixed demo date,
// not a real-time clock), just making the slider's "noon" mean noon.
const CHICAGO_UTC_OFFSET_HOURS = 5; // UTC = local + 5 (CDT is UTC-5)
const DEFAULT_HOUR = 12; // local noon

// Matches the reference's creaseAngle exactly (30°). Google Photorealistic
// 3D Tiles ship without vertex normals at all — per this plugin's own
// upstream doc comment, it exists specifically "for photogrammetry tile
// sets like Google Photorealistic 3D Tiles which come without vertex
// normals." Without it, AerialPerspective's normal-buffer-based per-pixel
// lighting reconstruction has nothing meaningful to read on the tiles
// themselves (task 9 fourth bug-fix). Requires three@>=0.185 (added task
// 9's version bump) — absent from the three@0.184.x this app started on.
const TILE_CREASE_ANGLE_RAD = (30 * Math.PI) / 180;

// Matches the three.js webgl_loader_3dtiles reference example's near/far
// clip planes exactly (task 9 bug-fix). The prior { near: 1, far: 1e9 }
// gave a near:far ratio of 1e9 — catastrophically bad for a 24-bit WebGL
// depth buffer, which loses almost all precision at that range. Reported
// live as a "microscope"-style distortion when zooming in close to tiles
// (classic z-fighting/depth-precision symptom). 10/1e6 (ratio 1e5) is both
// what the reference uses and comfortably safe, and still covers this
// app's much-lower 500m initial altitude (see constants.ts).
const CAMERA_NEAR = 10;
const CAMERA_FAR = 1e6;
const CAMERA_FOV = 75;

/**
 * Reference-matching HDR render pipeline (task 9 bug-fix): the reference
 * example explicitly builds its renderer with `outputBufferType:
 * HalfFloatType` and sets `toneMapping = AgXToneMapping` /
 * `toneMappingExposure = 10` — AerialPerspective/Clouds output physically-
 * based radiance values designed for that pipeline. r3f's Canvas defaults
 * to ACESFilmicToneMapping at exposure 1 and a standard (non-HDR) output
 * buffer; left at those defaults, the atmosphere/clouds layer's output
 * reads as much darker than intended (reported live as "black clouds").
 *
 * IMPORTANT CAVEAT (task 9 ninth bug-fix, discovered several rounds
 * later): setting `toneMapping`/`toneMappingExposure` here alone does NOT
 * make it to the final rendered pixel whenever AtmosphereCloudsLayer.tsx's
 * `<EffectComposer>` is mounted — that component forcibly overrides
 * `gl.toneMapping = NoToneMapping` for its entire lifetime (by design,
 * see that file's header comment for the full explanation) and expects
 * tone mapping to be reinstated via its own `<ToneMapping>` effect
 * *inside* the composer instead, which is where the AGX curve is now
 * actually applied. `toneMappingExposure` (the float, not the mode enum)
 * is untouched by that override and still reaches the composer's
 * `<ToneMapping>` effect from here. Left in place at the renderer level
 * regardless — this app already has an unavailable-atmosphere fallback
 * path (see `atmosphereUnavailable`) where `<EffectComposer>` isn't
 * mounted at all, and the base tiles render directly, so this still does
 * real work for that path.
 * Passing a factory function to Canvas's `gl` prop (rather than a plain
 * options object) is required here — `outputBufferType` is a constructor
 * option and `toneMapping`/`toneMappingExposure` are post-construction
 * instance properties, and only the factory form is guaranteed to apply
 * both (per @react-three/fiber's own GLProps type).
 */
function createGlobeRenderer(canvasProps: ConstructorParameters<typeof WebGLRenderer>[0]) {
  const renderer = new WebGLRenderer({
    ...canvasProps,
    outputBufferType: HalfFloatType,
  });
  renderer.toneMapping = AgXToneMapping;
  renderer.toneMappingExposure = 10;
  return renderer;
}

/**
 * Photorealistic-tiles scene: TilesRenderer + GlobeControls +
 * CesiumIonAuthPlugin (task 4), with the supply-chain location-marker
 * (7.1) and route-arc (7.2) overlays, and the optional atmosphere+clouds
 * layer (task 9) on top. Trucks/view-modes/entity-detail land in later
 * task-7 sub-tasks.
 *
 * Atmosphere/clouds are always on (revised from task 9.1's original
 * off-by-default toggle — the reference has no "off" state either, and
 * the base tiles alone look washed out under this scene's AgX/exposure-10
 * tone mapping, which is calibrated for the atmosphere layer's output, not
 * the tiles' baked textures alone). `atmosphereUnavailable` still exists
 * and still latches permanently true once AtmosphereCloudsErrorBoundary
 * reports a failure — graceful degradation to the base tiles scene on a
 * broken Beta dependency remains valuable even without a manual toggle.
 *
 * No `<ambientLight>`/`<directionalLight>` here (task 9 third bug-fix,
 * removed) — the reference example has zero Three.js scene lights; it
 * relies entirely on AerialPerspective's post-process lighting (its
 * `sunLight`/`skyLight` flags) for illumination. Our earlier fixed-position,
 * fixed-intensity lights were a leftover from before the atmosphere layer
 * existed, and — reported live — masked AerialPerspective's actual
 * time-of-day-driven relighting: a constant light source dominating
 * alongside a subtle time-varying one reads as "nothing changed." Photo-
 * realistic tiles ship photogrammetry-baked (already-lit) textures, so
 * they render correctly with zero added lights either way, atmosphere on
 * or off — the reference proves this by working with no lights at all.
 */
export function TilesGlobeScene() {
  const [atmosphereUnavailable, setAtmosphereUnavailable] = useState(false);
  const [hour, setHour] = useState(DEFAULT_HOUR);
  const globeControlsRef = useRef<GlobeControlsImpl>(null);

  // A fixed reference date, varying only by hour-of-day. `hour` is *local*
  // solar time at the scene's lat/lon (see CHICAGO_UTC_OFFSET_HOURS above);
  // convert to UTC before handing to setUTCHours. setUTCHours accepts a
  // fractional hoursValue directly (ECMA-262 MakeTime uses it unrounded),
  // so a fractional hour like 16.5 already yields a smooth, continuous
  // timestamp — no separate minutes math needed.
  const date = useMemo(() => {
    const d = new Date(Date.UTC(2024, 5, 21));
    const utcHour = (hour + CHICAGO_UTC_OFFSET_HOURS) % 24;
    d.setUTCHours(utcHour, 0, 0, 0);
    return d;
  }, [hour]);

  return (
    <View style={styles.container}>
      <Canvas
        gl={createGlobeRenderer}
        camera={{ position: [0, 0, 0], fov: CAMERA_FOV, near: CAMERA_NEAR, far: CAMERA_FAR }}
      >
        <TilesRenderer>
          <TilesPlugin
            plugin={CesiumIonAuthPlugin}
            args={[
              {
                apiToken: config.cesiumIonToken,
                assetId: GOOGLE_PHOTOREALISTIC_TILES_ASSET_ID,
                autoRefreshToken: true,
              },
            ]}
          />
          <TilesPlugin plugin={GLTFExtensionsPlugin} args={[{ dracoLoader }]} />
          <TilesPlugin
            plugin={TileCreasedNormalsPlugin}
            args={[{ creaseAngle: TILE_CREASE_ANGLE_RAD }]}
          />
          <TilesPlugin plugin={TilesFadePlugin} />
          <TilesPlugin plugin={UpdateOnChangePlugin} />
          <GlobeControls ref={globeControlsRef} adjustHeight={false} enableDamping />
          <AdjustHeightOnInteraction controlsRef={globeControlsRef} />
          <TilesAttributionOverlay />
          <InitialCameraPosition
            latDeg={INITIAL_CAMERA_LAT_DEG}
            lonDeg={INITIAL_CAMERA_LON_DEG}
            altitudeM={INITIAL_CAMERA_ALTITUDE_M}
          />
          <LocationMarkers />
          <RouteArcs />
        </TilesRenderer>
        {!atmosphereUnavailable && (
          <AtmosphereCloudsLayer date={date} onError={() => setAtmosphereUnavailable(true)} />
        )}
      </Canvas>
      <AtmosphereCloudsControls
        unavailable={atmosphereUnavailable}
        hour={hour}
        onHourChange={setHour}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
