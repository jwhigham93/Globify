jest.mock('expo/src/winter/ImportMetaRegistry', () => ({
  ImportMetaRegistry: {
    get url() {
      return null;
    },
  },
}));

if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (object) => JSON.parse(JSON.stringify(object));
}

// jest-expo loads .env.local (and friends) into process.env regardless of
// test environment — unlike Next.js/CRA's convention of skipping .env.local
// under NODE_ENV=test. That makes App.spec.tsx's "missing token" test
// depend on whether the developer running it happens to have a real
// Cesium Ion token in .env.local for local dev, which is exactly the kind
// of drift a test shouldn't have. Force the deterministic "unconfigured"
// state here — this runs before each test file's own imports, so
// config.ts sees it at module-load time.
process.env.EXPO_PUBLIC_CESIUM_ION_TOKEN = '';
