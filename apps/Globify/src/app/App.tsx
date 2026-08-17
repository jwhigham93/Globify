import React, { useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  StatusBar,
  Platform,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { GlobeVisualization } from '../components/Globe/GlobeVisualization';
import { transformToArcs, transformToDataPoints, setTokenGetter } from '@jw-dev/globify-services';
import { DEFAULT_BACKGROUND_COLOR } from '../components/Globe';
import { queryClient } from '../hooks/queries/queryClient';
import { useSupplyChainData } from '../hooks/queries/useSupplyChainData';
import { AuthProvider, useAuth } from './AuthProvider';
import { SignInScreen } from './SignInScreen';
import { Loader } from '../components/ui/Loader';
import { color, space, type, surface } from '../components/ui/theme';

declare global {
  interface Window { __hideLoadingShell?: () => void; }
}

/**
 * Inner app shell — uses auth context.
 * Loads supply-chain topology from the backend via TanStack Query.
 */
const AppContent = () => {
  const { isAuthenticated, isLoading: authLoading, token } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.__hideLoadingShell) {
      window.__hideLoadingShell();
    }
  }, []);

  // Wire the token getter so apiClient can attach JWT headers
  useEffect(() => {
    setTokenGetter(() => token);
  }, [token]);

  const { locations, routes, isLoading, isError, error, refetch } = useSupplyChainData();

  // Transform data locally for visualization
  const arcs = useMemo(() => transformToArcs(locations, routes), [locations, routes]);
  const points = useMemo(() => transformToDataPoints(locations), [locations]);

  // Show auth loading indicator
  if (authLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: DEFAULT_BACKGROUND_COLOR }]}>
        <Loader />
      </View>
    );
  }

  // Show sign-in screen when auth is enabled and the user is not signed in
  if (!isAuthenticated) {
    return <SignInScreen />;
  }

  // Show data loading state
  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: DEFAULT_BACKGROUND_COLOR }]}>
        <Loader label="Loading supply chain data…" />
      </View>
    );
  }

  // Show error with retry
  if (isError) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: DEFAULT_BACKGROUND_COLOR }]}>
        <Text style={styles.errorText}>Failed to load data</Text>
        <Text style={styles.errorDetail}>{error?.message ?? 'Unknown error'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.7}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const globeContent = (
    <GlobeVisualization dataPoints={points} arcsData={arcs} testID="globe-visualization" />
  );

  // On web, use a div container for proper iframe rendering. Sizing lives in
  // the .globify-root class in public/index.html — an inline style cannot
  // express the `height: 100%; height: 100dvh` fallback pair that iOS needs.
  if (Platform.OS === 'web') {
    return <div className="globify-root">{globeContent}</div>;
  }

  // Native platforms use SafeAreaView
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>{globeContent}</SafeAreaView>
    </>
  );
};

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </QueryClientProvider>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    ...type.title,
    color: color.danger,
    fontSize: 16,
    marginBottom: space.sm,
  },
  errorDetail: {
    ...type.body,
    color: color.textDim,
    marginBottom: space.xl,
    textAlign: 'center',
  },
  retryButton: {
    ...surface.button,
    ...surface.buttonActive,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  retryText: {
    ...type.buttonActiveLabel,
  },
});

export default App;
