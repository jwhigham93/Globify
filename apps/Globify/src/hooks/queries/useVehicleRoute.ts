/**
 * Origin/destination coordinates for a selected vehicle's route, from the backend.
 */
import { useQuery } from '@tanstack/react-query';
import * as apiClient from '../../services/apiClient';
import { useAuth } from '../../app/AuthProvider';

export interface VehicleRoute {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
}

export function useVehicleRoute(vehicleId: string | null) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['vehicles', vehicleId, 'route'],
    queryFn: () => apiClient.get<VehicleRoute>(`/vehicles/${vehicleId}/route`),
    enabled: isAuthenticated && !!vehicleId,
  });
}
