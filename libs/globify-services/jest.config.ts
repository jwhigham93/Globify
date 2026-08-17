module.exports = {
  displayName: 'globify-services',

  // jest-expo (not the generator's default node/SWC config) — this library
  // is consumed by two Expo apps and one of its modules
  // (useVehiclePositions.ts) is a React hook tested via
  // @testing-library/react-native's renderHook, which needs a
  // React-Native-aware test environment. Mirrors apps/globify-tiles's
  // jest.config.ts.
  preset: 'jest-expo',
  moduleFileExtensions: ['ts', 'js', 'html', 'tsx', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  // three ships `examples/jsm` as ESM only and jest-expo's preset does not
  // un-ignore it, so carModel.ts's import of BufferGeometryUtils fails to
  // parse. Mirrors apps/Globify/jest.config.ts's identical fix.
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
  },
  coverageDirectory: '../../coverage/libs/globify-services',
};
