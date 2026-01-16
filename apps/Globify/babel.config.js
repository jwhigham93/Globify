module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Transform import.meta for packages that use ESM features
    // This fixes the "Cannot use 'import.meta' outside a module" error
    // See: https://github.com/expo/expo/issues/30323
    overrides: [
      {
        // Match node_modules packages that need import.meta transformation
        test: [
          /@react-three/,
          /three/,
          /three-globe/,
          /drei/,
          /troika/,
        ],
        plugins: ['babel-plugin-transform-import-meta'],
      },
    ],
  };
};
