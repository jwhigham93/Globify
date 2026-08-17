/**
 * Upstream declaration-gap workaround. `3d-tiles-renderer/three`'s public
 * `.d.ts` entry (`src/three/renderer/index.d.ts`) only re-exports
 * `Ellipsoid` from `./math/Ellipsoid.js`, not the `CAMERA_FRAME` /
 * `ENU_FRAME` / `OBJECT_FRAME` / `Frames` constants that same module
 * exports at runtime (confirmed directly: `node --input-type=module -e
 * "import * as m from './build/index.three.js'; console.log(m.CAMERA_FRAME)"`
 * prints a real value). Same class of gap as the `EllipsoidContext` one
 * noted in InitialCameraPosition.tsx — unlike that one, there's no
 * alternative typed API providing the same value, so it's augmented here
 * once instead of `@ts-expect-error`-ing at every call site.
 *
 * The `export {}` below is required, not decorative: a `.d.ts` file with no
 * top-level import/export is an ambient *global* declaration, and
 * `declare module` inside one REPLACES the named module's types wholesale
 * instead of merging with them (learned by hitting this directly — the
 * first version of this file silently broke every other import from
 * `3d-tiles-renderer/three`, including ones with real upstream types).
 * `export {}` makes this file itself a module, which switches `declare
 * module` to augmentation/merge semantics.
 */
export {};

declare module '3d-tiles-renderer/three' {
  export const CAMERA_FRAME: number;
}
