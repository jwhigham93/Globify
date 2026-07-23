/**
 * Tests for the shared QueryClient's retry policy: HTTP errors (ApiError) are
 * never retried; other failures retry at most twice.
 */
import { queryClient } from './queryClient';
import { ApiError } from '../../services/apiClient';

const retry = queryClient.getDefaultOptions().queries?.retry as (
  failureCount: number,
  error: Error,
) => boolean;

describe('queryClient', () => {
  it('does not retry ApiError (HTTP 4xx/5xx)', () => {
    expect(retry(0, new ApiError('Not Found', 404))).toBe(false);
  });

  it('retries network errors up to twice', () => {
    const err = new Error('network down');
    expect(retry(0, err)).toBe(true);
    expect(retry(1, err)).toBe(true);
    expect(retry(2, err)).toBe(false);
  });

  it('caches results for five minutes', () => {
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(5 * 60 * 1000);
  });
});
