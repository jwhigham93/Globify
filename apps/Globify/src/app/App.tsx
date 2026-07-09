import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { GlobeVisualization } from '../components/Globe/GlobeVisualization';
import {
  getSupplyChainVisualizationData,
  transformToArcs,
  transformToDataPoints,
} from '../services/supplyChainData';
import { DEFAULT_BACKGROUND_COLOR } from '../components/Globe';
import { config } from '../services/config';
import * as apiClient from '../services/apiClient';
import { setTokenGetter } from '../services/apiClient';
import { AuthProvider, useAuth } from './AuthProvider';
import { SignInScreen } from './SignInScreen';
import type { Location, SupplyRoute } from '../components/Globe/types';

declare global {
  interface Window { __hideLoadingShell?: () => void; }
}

/**
 * Inner app shell — uses auth context.
 * Loads data from API or falls back to local mock data in dev mode.
 */
const AppContent = () => {
  const { isAuthenticated, isLoading: authLoading, token } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.__hideLoadingShell) {
      window.__hideLoadingShell();
    }
  }, []);

  const [data, setData] = useState<{ locations: Location[]; routes: SupplyRoute[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Wire the token getter so apiClient can attach JWT headers
  useEffect(() => {
    setTokenGetter(() => token);
  }, [token]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (config.isDevMode) {
        // Dev mode fallback — use local mock data
        const viz = getSupplyChainVisualizationData();
        setData({ locations: viz.locations, routes: viz.routes });
      } else {
        const result = await apiClient.get<{ locations: Location[]; routes: SupplyRoute[] }>(
          '/supply-chain/visualization',
        );
        setData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data once authenticated (or immediately in dev mode)
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  // Transform data locally for visualization
  const arcs = useMemo(
    () => (data ? transformToArcs(data.locations, data.routes) : []),
    [data],
  );
  const points = useMemo(
    () => (data ? transformToDataPoints(data.locations) : []),
    [data],
  );

  // Show auth loading spinner
  if (authLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: DEFAULT_BACKGROUND_COLOR }]}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  // Show sign-in screen when not authenticated (and not in dev mode)
  if (!isAuthenticated) {
    return <SignInScreen />;
  }

  // Show data loading state
  if (loading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: DEFAULT_BACKGROUND_COLOR }]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading supply chain data…</Text>
      </View>
    );
  }

  // Show error with retry
  if (error) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: DEFAULT_BACKGROUND_COLOR }]}>
        <Text style={styles.errorText}>Failed to load data</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData} activeOpacity={0.7}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const globeContent = (
    <GlobeVisualization
      dataPoints={points}
      arcsData={arcs}
      locations={data?.locations}
      routes={data?.routes}
      testID="globe-visualization"
    />
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
  <AuthProvider>
    <AppContent />
  </AuthProvider>
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
