/**
 * Tests for useVehicleRoute: fetches the selected vehicle's route endpoints, and
 * stays idle when no vehicle is selected or the user is unauthenticated.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVehicleRoute } from './useVehicleRoute';
import * as apiClient from '../../services/apiClient';

jest.mock('../../services/apiClient');

let mockAuthenticated = true;
jest.mock('../../app/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: mockAuthenticated }),
}));

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

const routeFixture = {
  originLat: 40,
  originLng: -90,
  destinationLat: 33,
  destinationLng: -84,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthenticated = true;
});

describe('useVehicleRoute', () => {
  it('fetches the route for the selected vehicle', async () => {
    mockedGet.mockResolvedValueOnce(routeFixture);

    const { result } = renderHook(() => useVehicleRoute('truck-7'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedGet).toHaveBeenCalledWith('/vehicles/truck-7/route');
    expect(result.current.data).toEqual(routeFixture);
  });

  it('stays idle when no vehicle is selected', () => {
    const { result } = renderHook(() => useVehicleRoute(null), { wrapper: makeWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('stays disabled while unauthenticated', () => {
    mockAuthenticated = false;

    const { result } = renderHook(() => useVehicleRoute('truck-7'), { wrapper: makeWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedGet).not.toHaveBeenCalled();
  });
});
