/**
 * Loading fallback component for Suspense boundaries
 */

import React from 'react';
import { View } from 'react-native';
import { styles } from './styles';
import { Loader } from '../ui/Loader';

export const LoadingFallback: React.FC = () => (
  <View style={styles.loadingContainer}>
    <Loader label="Loading Globe..." />
  </View>
);
