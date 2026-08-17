module.exports = function (api) {
  api.cache(true);
  return {
    // `unstable_transformImportMeta` (task 9 sixth bug-fix, superseding the
    // hand-rolled `overrides`/`babel-plugin-transform-import-meta` approach
    // this file used previously): Expo's own `import.meta` transform,
    // replacing `import.meta` with `globalThis.__ExpoImportMetaRegistry` —
    // a real object (`expo/src/winter/ImportMetaRegistry`, installed by
    // Expo's own runtime on every platform) exposing a working `.url`, not
    // just a syntax no-op. Surfaced by the three@0.185 bump (task 9): its
    // `DRACOLoader.js` now does `new URL(path, import.meta.url)` at module
    // top level unconditionally (regardless of which Draco decoder variant
    // this app actually uses — see the `type: 'js'` decoder config in
    // TilesGlobeScene.tsx), which crashed Android/Hermes bundling outright
    // ("`import.meta` is not supported in Hermes") — this is the exact fix
    // Expo's own error message names. The old regex-scoped `overrides`
    // plugin is REMOVED, not left alongside this: it likely just replaced
    // `import.meta` with an empty object, and if it ran first it would
    // silently break `.url` access into `undefined` — `new URL(path,
    // undefined)` throws at runtime — a real conflict, not redundant
    // safety. (Root cause for the *other* `import.meta` bug this session
    // hit — zustand's `.mjs` build being resolved at all — was a Metro
    // resolver condition mismatch, fixed in metro.config.js; that fix is
    // independent of this one and still in place.)
    //
    // This app-level config alone is NOT sufficient for node_modules files
    // (e.g. the DRACOLoader.js case above) — see the repo-root
    // babel.config.js for why, and why the same option is duplicated there.
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
  };
};
