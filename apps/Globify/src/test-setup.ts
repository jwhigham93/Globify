// Mock Expo's winter runtime import meta registry
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__ExpoImportMetaRegistry = {
  getModuleExportPromiseByUrl: jest.fn(),
};

// Mock react-native-webview
jest.mock('react-native-webview', () => {
  const React = require('react');

  return {
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: React.forwardRef((props: any, ref: any) => {
      const mockRef = {
        injectJavaScript: jest.fn(),
      };

      // Expose mock ref for testing
      React.useImperativeHandle(ref, () => mockRef);

      const { View } = require('react-native');
      return React.createElement(View, {
        ...props,
        testID: props.testID,
      });
    }),
  };
});

if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (object) => JSON.parse(JSON.stringify(object));
}
