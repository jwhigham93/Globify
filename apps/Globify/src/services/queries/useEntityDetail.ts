/**
 * Entity detail (supplier / DC / restaurant) from the backend for a clicked
 * location. Replaces the former frontend buildSelectedEntity. Route and cluster
 * selections are built client-side and do not use this hook.
 */
import { useQuery } from '@tanstack/react-query';
import * as apiClient from '../apiClient';
import { useAuth } from '../../app/AuthProvider';
import type { SelectedSupplier, SelectedDC, SelectedRestaurant } from '../../components/Globe/types';

export type EntityDetail = SelectedSupplier | SelectedDC | SelectedRestaurant;

export function useEntityDetail(id: string | null) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['entities', id],
    queryFn: () => apiClient.get<EntityDetail>(`/entities/${id}`),
    enabled: isAuthenticated && !!id,
  });
}
