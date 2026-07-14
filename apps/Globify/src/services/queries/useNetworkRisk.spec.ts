/**
 * Tests for useNetworkRisk, including the auth gate: an authenticated query must
 * not fire before the user is authenticated.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNetworkRisk } from './useNetworkRisk';
import * as apiClient from '../apiClient';

jest.mock('../apiClient');

// Auth state is controlled per-test via this mutable flag.
let mockAuthenticated = true;
jest.mock('../../app/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: mockAuthenticated }),
}));

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

const riskFixture = {
  networkDiversificationScore: 72,
  hhi: 0.21,
  supplierRisks: [],
  dcDiversification: [],
  restaurantRisks: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthenticated = true;
});

describe('useNetworkRisk', () => {
  it('fetches network risk when authenticated', async () => {
    mockedGet.mockResolvedValueOnce(riskFixture);

    const { result } = renderHook(() => useNetworkRisk(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedGet).toHaveBeenCalledWith('/risk/network');
    expect(result.current.data?.networkDiversificationScore).toBe(72);
  });

  it('stays disabled and fires no request while unauthenticated', async () => {
    mockAuthenticated = false;
    mockedGet.mockResolvedValueOnce(riskFixture);

    const { result } = renderHook(() => useNetworkRisk(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedGet).not.toHaveBeenCalled();
  });
});
