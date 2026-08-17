const { withNxMetro } = require('@nx/expo');
const { getDefaultConfig } = require('@expo/metro-config');
const { mergeConfig } = require('metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const customConfig = {
  cacheVersion: 'globify-tiles-2',
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'cjs', 'mjs', 'svg'],
  },
};

const nxConfig = withNxMetro(mergeConfig(defaultConfig, customConfig), {
  // Change this to true to see debugging info.
  // Useful if you have issues resolving modules
  debug: false,
  // all the file extensions used for imports other than 'ts', 'tsx', 'js', 'jsx', 'json'
  extensions: [],
  // Specify folders to watch, in addition to Nx defaults (workspace libraries and node_modules)
  watchFolders: [],
});

// withNxMetro sets resolver.resolveRequest unconditionally (to its own
// workspace-aware resolver), so a resolveRequest set inside customConfig
// above is silently discarded — it has to be layered on *after*
// withNxMetro instead, delegating to Nx's resolver for everything else.
const nxResolveRequest = nxConfig.resolver.resolveRequest;
nxConfig.resolver.resolveRequest = (context, moduleName, platform, ...rest) => {
  // zustand (pulled in transitively by @react-three/drei) publishes a
  // "react-native" export condition pointing at its CJS build, but for
  // platform:"web" Metro's package-exports resolution falls through to
  // the "import"/"module" condition instead, landing on its ESM
  // (esm/*.mjs) build, which uses raw `import.meta.env`. Metro's web
  // output is a single non-module <script>, so that throws
  // "Cannot use 'import.meta' outside a module" at runtime. Force the
  // same CJS build native platforms already get by calling Metro's own
  // base resolver (context.resolveRequest, independent of Nx's override
  // above) with a narrowed condition list.
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    return context.resolveRequest(
      { ...context, unstable_conditionNames: ['react-native'] },
      moduleName,
      platform,
    );
  }
  return nxResolveRequest(context, moduleName, platform, ...rest);
};

module.exports = nxConfig;
