import { StatusBar } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '../services/config';
import { MissingCesiumTokenNotice } from '../components/MissingCesiumTokenNotice';

const queryClient = new QueryClient();

export const App = () => {
  // Fail loudly rather than rendering a blank scene — see
  // v2-tiles-app-shell's missing-token requirement.
  if (!config.isCesiumConfigured) {
    return <MissingCesiumTokenNotice />;
  }

  // Deferred (not a static top-level import): 3d-tiles-renderer's package
  // exports map is ESM-only (no "require" condition), which Metro resolves
  // fine but Jest's CJS resolver cannot. Requiring it here means the
  // missing-token test path above never needs to resolve it at all —
  // matching apps/Globify's own convention of not render-testing its actual
  // r3f Canvas tree (WebGL doesn't exist under Jest/jsdom anyway).
  const {
    TilesGlobeScene,
  } = require('../components/Globe/TilesGlobeScene') as typeof import('../components/Globe/TilesGlobeScene');

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar barStyle="light-content" />
      <TilesGlobeScene />
    </QueryClientProvider>
  );
};

export default App;
