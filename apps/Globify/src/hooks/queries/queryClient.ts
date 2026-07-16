/**
 * Shared TanStack Query client for the app.
 *
 * The Go API's own client (apiClient) already retries network failures with
 * backoff, so we keep React Query's retry modest and let it own caching and
 * loading/error state. ApiError (HTTP 4xx/5xx) is not worth retrying.
 */
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../services/apiClient';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError) return false;
        return failureCount < 2;
      },
    },
  },
});
