module.exports = {
  displayName: 'Globify',

  preset: 'jest-expo',
  moduleFileExtensions: ['ts', 'js', 'html', 'tsx', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapper: {
    '\\.svg$': '@nx/expo/plugins/jest/svg-mock',
  },
  // three ships `examples/jsm` as ESM only and jest-expo's preset does not
  // un-ignore it, so anything importing OrbitControls or BufferGeometryUtils
  // (Controls.tsx, carModel.ts) fails to parse. This mirrors the preset's list
  // with `three/examples` added; the rest of three resolves to its CJS build.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|three/examples|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base))',
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
  coverageDirectory: '../../coverage/apps/Globify',
};
