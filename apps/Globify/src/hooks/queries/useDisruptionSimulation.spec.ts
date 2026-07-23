/**
 * Tests for useDisruptionSimulation: auth gating, stable query key regardless of
 * selection order, and no placeholder data from a previous selection.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDisruptionSimulation } from './useDisruptionSimulation';
import * as apiClient from '../../services/apiClient';

jest.mock('../../services/apiClient');

let mockAuthenticated = true;
jest.mock('../../app/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: mockAuthenticated }),
}));

const mockedPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

const metricsFixture = {
  disabledCount: 1,
  disabledNodes: ['dc-1'],
  affectedRouteCount: 3,
  orphanedRestaurants: [],
  partiallyServedRestaurants: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthenticated = true;
});

describe('useDisruptionSimulation', () => {
  it('posts sorted disabled ids when authenticated', async () => {
    mockedPost.mockResolvedValueOnce(metricsFixture);

    const { result } = renderHook(() => useDisruptionSimulation(['dc-1', 'sup-2']), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedPost).toHaveBeenCalledWith('/disruption/simulate', {
      disabledIds: ['dc-1', 'sup-2'],
    });
  });

  it('sorts ids so selection order does not change the query key', async () => {
    mockedPost.mockResolvedValue(metricsFixture);
    const wrapper = makeWrapper();

    const first = renderHook(() => useDisruptionSimulation(['sup-2', 'dc-1']), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    const second = renderHook(() => useDisruptionSimulation(['dc-1', 'sup-2']), { wrapper });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));

    // Same sorted key — served from cache, no second request
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it('does not expose the previous selection as placeholder data', async () => {
    mockedPost.mockResolvedValue(metricsFixture);
    const wrapper = makeWrapper();

    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useDisruptionSimulation(ids),
      { wrapper, initialProps: { ids: ['dc-1'] } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ ids: ['sup-2'] });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isSuccess).toBe(false);
  });

  it('stays disabled and fires no request while unauthenticated', () => {
    mockAuthenticated = false;

    const { result } = renderHook(() => useDisruptionSimulation(['dc-1']), {
      wrapper: makeWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('stays disabled and fires no request with an empty selection', () => {
    const { result } = renderHook(() => useDisruptionSimulation([]), {
      wrapper: makeWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedPost).not.toHaveBeenCalled();
  });
});
