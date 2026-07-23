import React, { useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  StatusBar,
  Platform,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { GlobeVisualization } from '../components/Globe/GlobeVisualization';
import { transformToArcs, transformToDataPoints } from '../services/supplyChainData';
import { DEFAULT_BACKGROUND_COLOR } from '../components/Globe';
import { setTokenGetter } from '../services/apiClient';
import { queryClient } from '../hooks/queries/queryClient';
import { useSupplyChainData } from '../hooks/queries/useSupplyChainData';
import { AuthProvider, useAuth } from './AuthProvider';
import { SignInScreen } from './SignInScreen';

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

  // Show auth loading spinner
  if (authLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: DEFAULT_BACKGROUND_COLOR }]}>
        <ActivityIndicator size="large" color="#ffffff" />
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
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading supply chain data…</Text>
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

  // On web, use a div container for proper iframe rendering
  if (Platform.OS === 'web') {
    return (
      <div style={{ width: '100vw', height: '100vh', backgroundColor: DEFAULT_BACKGROUND_COLOR }}>
        {globeContent}
      </div>
    );
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
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorDetail: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#22AA44',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;
