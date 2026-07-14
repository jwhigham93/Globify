/**
 * Disruption simulation from the backend, keyed by the set of disabled node ids.
 * Replaces the former frontend computeDisruptionMetrics plus its hand-rolled
 * 300ms debounce and manual request cancellation — React Query dedupes by key
 * and retains the previous result while refetching.
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import * as apiClient from '../apiClient';
import { useAuth } from '../../app/AuthProvider';
import type { DisruptionMetrics } from '../../components/Globe/types';

export function useDisruptionSimulation(disabledNodeIds: string[]) {
  const { isAuthenticated } = useAuth();
  // Sort so key is stable regardless of selection order.
  const sortedIds = [...disabledNodeIds].sort();

  return useQuery({
    queryKey: ['disruption', 'simulate', sortedIds],
    queryFn: () =>
      apiClient.post<DisruptionMetrics>('/disruption/simulate', { disabledIds: sortedIds }),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });
}
