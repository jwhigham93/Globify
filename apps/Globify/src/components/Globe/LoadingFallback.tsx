/**
 * Loading fallback component for Suspense boundaries
 */

import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { styles } from './styles';

export const LoadingFallback: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#ffffff" />
    <Text style={styles.loadingText}>Loading Globe...</Text>
  </View>
);
