/**
 * `three/addons/misc/TileCreasedNormalsPlugin.js` has no type declaration
 * upstream — it's new enough (added alongside the three@0.185 bump, task
 * 9's fourth bug-fix) that DefinitelyTyped's `@types/three` package
 * (which is what actually types most other `three`/`three/addons/*`
 * imports in this project, e.g. `DRACOLoader`) hasn't caught up yet; `tsc`
 * itself says as much (TS7016, pointing at the real DefinitelyTyped repo).
 * A minimal shim matching the plugin's real constructor signature (see its
 * own upstream doc comment) rather than leaving it as an implicit `any`.
 */
declare module 'three/addons/misc/TileCreasedNormalsPlugin.js' {
  export class TileCreasedNormalsPlugin {
    constructor(options?: { creaseAngle?: number });
  }
}
