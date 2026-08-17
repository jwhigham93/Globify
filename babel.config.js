// Replaces babel.config.json (task 9 seventh bug-fix) with a new fallback
// preset, for the same reason apps/*'s own `.babelrc.js` → `babel.config.js`
// rename mattered in an earlier fix (see
// openspec/changes/tiles-globe-v2-init/tasks.md task 2.3): Babel's own
// upward per-file config search, and `@expo/metro-config`'s
// `projectRoot`-relative `loadBabelConfig` lookup, only recognize
// `.babelrc`/`.babelrc.js`/`babel.config.js` — never `babel.config.json` —
// as a *root* config file.
//
// Why this file exists at all: `withNxMetro` (used by both apps/Globify's
// and apps/globify-tiles' metro.config.js) sets Metro's `projectRoot` to
// this repo root, not the individual app directory (confirmed directly:
// `require('./apps/globify-tiles/metro.config.js').projectRoot` prints
// this directory, not `apps/globify-tiles`). For files under `node_modules`
// — which aren't descendants of any app's own directory and so can never
// reach an app-level `babel.config.js` via upward search either — both of
// those lookup paths land here instead. Previously they found only
// `babel.config.json` (no presets/plugins at all) and silently fell back to
// bare `babel-preset-expo` with none of the per-app customization each
// app's own `babel.config.js` declares.
//
// Concretely: apps/globify-tiles' three@0.185 bump (task 9) pulled in a
// `DRACOLoader.js` that uses `import.meta.url` unconditionally at module
// top level; that app's own `babel.config.js` sets
// `unstable_transformImportMeta: true` to handle it, but that setting
// never reached this node_modules file, and Android/Hermes bundling failed
// outright with "`import.meta` is not supported in Hermes." Duplicating
// the same option here — safe for apps/Globify too, since the transform is
// a narrow AST visitor that's a no-op for files with no `import.meta` — is
// what actually fixes it, not the app-level config (which was correct all
// along and never the problem).
//
// Not fully investigated: whether apps/Globify's own node_modules-targeted
// babel overrides (`/@react-three/`, `/three/`, etc., in its
// babel.config.js) have this exact same gap and have simply never been
// exercised by a dependency that needed them at Hermes-bundle time. Flagged
// as an open question, not silently assumed fine — see tasks.md.
//
// No `babelrcRoots` here (the old babel.config.json's only content) — it
// enables per-package `.babelrc`/`.babelrc.js` lookup under `apps/*`, but
// neither app uses that form; both already have their own top-level
// `babel.config.js` (confirmed: no `.babelrc*` file exists anywhere in the
// repo). It's also actively incompatible with this file's other role: this
// file gets loaded via Babel's `extends` mechanism in one of the two paths
// that reach it (`@expo/metro-config`'s `loadBabelConfig`), and Babel
// rejects `babelrcRoots` in an "extends"-loaded file outright
// ("only in root programmatic options, or babel.config.js/config file
// options") — confirmed by hitting that exact error before removing it.
module.exports = {
  presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
};
