const fs = require('node:fs');
const path = require('node:path');

// 3d-tiles-renderer's package exports declare only an "import" condition
// (no "require") for its subpaths, and reject any deep path not
// explicitly listed (it has no "./package.json" export either) — so
// require.resolve() on anything in this package fails under Jest's CJS
// resolution, the same way a bare import of its subpaths does. Locating
// the package directory via a plain node_modules filesystem walk (not
// Node's module resolution algorithm) sidesteps the exports gate
// entirely, the same way Metro's own resolution effectively does.
function findPackageDir(pkgName: string, startDir: string): string {
  let dir = startDir;
  for (;;) {
    const candidate = path.join(dir, 'node_modules', pkgName);
    if (fs.existsSync(candidate)) return fs.realpathSync(candidate);
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not find node_modules/${pkgName} above ${startDir}`);
    }
    dir = parent;
  }
}

const tilesRendererRoot = findPackageDir('3d-tiles-renderer', __dirname);

module.exports = {
  displayName: 'globify-tiles',

  preset: 'jest-expo',
  moduleFileExtensions: ['ts', 'js', 'html', 'tsx', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapper: {
    '\\.svg$': '@nx/expo/plugins/jest/svg-mock',
    '^3d-tiles-renderer/r3f$': path.join(tilesRendererRoot, 'build/index.r3f.js'),
    '^3d-tiles-renderer/plugins$': path.join(tilesRendererRoot, 'build/index.plugins.js'),
    '^3d-tiles-renderer/three$': path.join(tilesRendererRoot, 'build/index.three.js'),
    '^3d-tiles-renderer/core$': path.join(tilesRendererRoot, 'build/index.core.js'),
  },
  // three ships `examples/jsm` as ESM only, and 3d-tiles-renderer's
  // build/*.js output (moduleNameMapper above) is also ESM-only — neither
  // is covered by jest-expo's default un-ignore list.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|three/examples|3d-tiles-renderer|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base))',
    '/node_modules/react-native-reanimated/plugin/',
  ],
  transform: {
    '\\.[jt]sx?$': [
      'babel-jest',
      {
        configFile: __dirname + '/babel.config.js',
      },
    ],
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp|ttf|otf|m4v|mov|mp4|mpeg|mpg|webm|aac|aiff|caf|m4a|mp3|wav|html|pdf|obj)$':
      require.resolve('jest-expo/src/preset/assetFileTransformer.js'),
  },
  coverageDirectory: '../../coverage/apps/globify-tiles',
};
