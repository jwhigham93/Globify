import { registerRootComponent } from 'expo';

// Paint the background black the instant the bundle arrives, before React renders.
if (typeof document !== 'undefined') {
  document.documentElement.style.background = '#000';
  document.body.style.background = '#000';
}

import App from './src/app/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
