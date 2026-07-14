/**
 * Supply-chain topology (locations + routes) from the backend, plus the derived
 * lookup indexes the UI needs. This is the single in-memory source of truth for
 * topology — it replaces the former hardcoded seed arrays and their lookup
 * helpers. Fetched once and shared from the query cache by every consumer.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as apiClient from '../apiClient';
import { useAuth } from '../../app/AuthProvider';
import type { Location, SupplyRoute } from '../../components/Globe/types';

export interface VisualizationData {
  locations: Location[];
  routes: SupplyRoute[];
}

export const supplyChainQueryKey = ['supply-chain', 'visualization'] as const;

export function useSupplyChainData() {
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: supplyChainQueryKey,
    queryFn: () => apiClient.get<VisualizationData>('/supply-chain/visualization'),
    enabled: isAuthenticated,
  });

  const indexes = useMemo(() => {
    const locations = query.data?.locations ?? [];
    const routes = query.data?.routes ?? [];

    const locationsById = new Map<string, Location>();
    for (const loc of locations) locationsById.set(loc.id, loc);

    const outboundByLocationId = new Map<string, SupplyRoute[]>();
    const inboundByLocationId = new Map<string, SupplyRoute[]>();
    const push = (map: Map<string, SupplyRoute[]>, key: string, route: SupplyRoute) => {
      const list = map.get(key);
      if (list) list.push(route);
      else map.set(key, [route]);
    };
    for (const route of routes) {
      push(outboundByLocationId, route.sourceId, route);
      push(inboundByLocationId, route.destId, route);
    }

    return { locations, routes, locationsById, outboundByLocationId, inboundByLocationId };
  }, [query.data]);

  return {
    ...indexes,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
