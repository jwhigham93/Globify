/**
 * Supply-chain topology (locations + routes), fetched via the shared
 * apiClient — same backend, same endpoint, same response shape as v1's
 * apps/Globify/src/hooks/queries/useSupplyChainData.ts.
 *
 * No auth gate yet (`enabled` is always true) — task 8 ports AuthProvider
 * into this app; until then this matches the "Cognito unconfigured, auth
 * bypassed" local-dev mode v1 already documents.
 */
import { useQuery } from '@tanstack/react-query';
import * as apiClient from '@jw-dev/globify-services';
import type { Location, SupplyRoute } from '@jw-dev/globify-services';

export interface VisualizationData {
  locations: Location[];
  routes: SupplyRoute[];
}

export const supplyChainQueryKey = ['supply-chain', 'visualization'] as const;

export function useSupplyChainData() {
  const query = useQuery({
    queryKey: supplyChainQueryKey,
    queryFn: () => apiClient.get<VisualizationData>('/supply-chain/visualization'),
  });

  return {
    locations: query.data?.locations ?? [],
    routes: query.data?.routes ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  };
}
