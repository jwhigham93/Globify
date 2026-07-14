/**
 * Network / supplier-concentration risk metrics from the backend.
 * Replaces the former frontend computeNetworkRiskMetrics.
 */
import { useQuery } from '@tanstack/react-query';
import * as apiClient from '../apiClient';
import { useAuth } from '../../app/AuthProvider';
import type { NetworkRiskMetrics } from '../../components/Globe/types';

export const networkRiskQueryKey = ['risk', 'network'] as const;

export function useNetworkRisk() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: networkRiskQueryKey,
    queryFn: () => apiClient.get<NetworkRiskMetrics>('/risk/network'),
    enabled: isAuthenticated,
  });
}
