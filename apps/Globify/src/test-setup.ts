// Mock Expo's winter runtime import meta registry
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__ExpoImportMetaRegistry = {
  getModuleExportPromiseByUrl: jest.fn(),
};

// Polyfill for structuredClone
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (object) => JSON.parse(JSON.stringify(object));
}
