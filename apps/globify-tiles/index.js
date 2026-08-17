import { registerRootComponent } from 'expo';

import App from './src/app/App';

// Web-only fix for a real gap in Expo's own `unstable_transformImportMeta`
// polyfill (see babel.config.js / apps/globify-tiles/babel.config.js):
// `ImportMetaRegistry.url` resolves via `document.currentScript?.src` on
// web (expo/src/utils/getBundleUrl.web.ts), which is only populated during
// a <script> tag's own synchronous top-level execution — not for code
// reached via Metro's lazy `metroRequire()` deep inside our own dependency
// graph (e.g. three's DRACOLoader.js, pulled in from TilesGlobeScene.tsx,
// itself deferred-required from App.tsx rather than statically imported).
// By the time DRACOLoader.js's top-level `import.meta.url` usage runs,
// `document.currentScript` is already null, so the polyfill's `.url`
// getter returns null, and `new URL(relativePath, null)` throws "Failed to
// construct 'URL': Invalid base URL" — reported live as a white screen on
// web (task 9). `window.location.href` is always a valid absolute URL
// regardless of *when* it's read, unlike `document.currentScript`, so it's
// a safe universal fallback whenever the original getter comes back empty.
// Native is unaffected — getBundleUrl.native.ts reads
// `NativeModules.SourceCode.scriptURL`, which has no such timing gap.
if (typeof window !== 'undefined' && globalThis.__ExpoImportMetaRegistry) {
  const registry = globalThis.__ExpoImportMetaRegistry;
  const originalUrlDescriptor = Object.getOwnPropertyDescriptor(registry, 'url');
  if (originalUrlDescriptor?.get) {
    Object.defineProperty(registry, 'url', {
      configurable: true,
      get() {
        return originalUrlDescriptor.get.call(registry) ?? window.location.href;
      },
    });
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
