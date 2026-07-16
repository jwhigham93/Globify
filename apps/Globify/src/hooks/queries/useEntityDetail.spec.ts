/**
 * Tests for useEntityDetail: fetches the clicked location's detail, and stays
 * idle when no location is selected or the user is unauthenticated.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEntityDetail } from './useEntityDetail';
import * as apiClient from '../../services/apiClient';

jest.mock('../../services/apiClient');

let mockAuthenticated = true;
jest.mock('../../app/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: mockAuthenticated }),
}));

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthenticated = true;
});

describe('useEntityDetail', () => {
  it('fetches detail for the selected location', async () => {
    const detail = { type: 'supplier', location: { id: 'sup-1' } };
    mockedGet.mockResolvedValueOnce(detail);

    const { result } = renderHook(() => useEntityDetail('sup-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedGet).toHaveBeenCalledWith('/entities/sup-1');
    expect(result.current.data).toEqual(detail);
  });

  it('stays idle when no location is selected', () => {
    const { result } = renderHook(() => useEntityDetail(null), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('stays disabled while unauthenticated', () => {
    mockAuthenticated = false;

    const { result } = renderHook(() => useEntityDetail('sup-1'), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedGet).not.toHaveBeenCalled();
  });
});
