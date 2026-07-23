/**
 * Tests for useSupplyChainData — runs against a mocked apiClient with a
 * QueryClient test wrapper; no live backend.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSupplyChainData } from './useSupplyChainData';
import * as apiClient from '../../services/apiClient';

jest.mock('../../services/apiClient');
jest.mock('../../app/AuthProvider', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

const fixture = {
  locations: [
    { id: 'sup-1', name: 'Supplier One', lat: 40, lng: -90, type: 'supplier' as const },
    { id: 'dc-1', name: 'DC One', lat: 33, lng: -84, type: 'dc' as const },
    { id: 'rest-1', name: 'Restaurant One', lat: 35, lng: -80, type: 'restaurant' as const },
  ],
  routes: [
    { id: 'r1', sourceId: 'sup-1', destId: 'dc-1', volume: 100 },
    { id: 'r2', sourceId: 'dc-1', destId: 'rest-1', volume: 40 },
  ],
};

beforeEach(() => jest.clearAllMocks());

describe('useSupplyChainData', () => {
  it('fetches topology and derives lookup indexes', async () => {
    mockedGet.mockResolvedValueOnce(fixture);

    const { result } = renderHook(() => useSupplyChainData(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockedGet).toHaveBeenCalledWith('/supply-chain/visualization');
    expect(result.current.locations).toHaveLength(3);
    expect(result.current.locationsById.get('dc-1')?.name).toBe('DC One');
    expect(result.current.outboundByLocationId.get('sup-1')?.[0].destId).toBe('dc-1');
    expect(result.current.inboundByLocationId.get('rest-1')?.[0].sourceId).toBe('dc-1');
  });

  it('surfaces an error and empty indexes on failure', async () => {
    mockedGet.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() => useSupplyChainData(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.locations).toEqual([]);
    expect(result.current.locationsById.size).toBe(0);
  });
});
