/**
 * Typed HTTP client for the Go supply chain API.
 *
 * - Reads base URL from config
 * - Attaches JWT token from AuthProvider via setTokenGetter()
 * - Retries on network failure with exponential backoff (3 attempts)
 * - Normalizes error responses
 */
import { config } from './config';

/** Injected function that returns the current JWT token (or null). */
let tokenGetter: (() => string | null) | null = null;

/**
 * Register the token getter (called once from AuthProvider).
 * This avoids a circular dependency between apiClient and AuthProvider.
 */
export function setTokenGetter(fn: () => string | null): void {
  tokenGetter = fn;
}

/**
 * Returns the current access token (or null). Lets non-HTTP transports (e.g. the
 * WebSocket GPS stream) reuse the same token registered via setTokenGetter.
 */
export function getToken(): string | null {
  return tokenGetter ? tokenGetter() : null;
}

/** API error with status code */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const MAX_RETRIES = 3;
let retryBaseDelayMs = 1000;

/**
 * Override retry delay for testing. Pass 0 to make retries instant.
 */
export function setRetryDelay(ms: number): void {
  retryBaseDelayMs = ms;
}

/**
 * Internal fetch wrapper with retry logic.
 */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const baseUrl = config.apiBaseUrl;
  const url = `${baseUrl}/api/v1${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (tokenGetter) {
    const token = tokenGetter();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const init: RequestInit = {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);

      if (!response.ok) {
        let errorBody: unknown;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text();
        }
        const message =
          typeof errorBody === 'object' && errorBody !== null && 'error' in errorBody
            ? String((errorBody as { error: unknown }).error)
            : `HTTP ${response.status}`;
        throw new ApiError(message, response.status, errorBody);
      }

      return (await response.json()) as T;
    } catch (err) {
      // Don't retry HTTP errors (4xx/5xx) — only network failures
      if (err instanceof ApiError) {
        throw err;
      }
      lastError = err instanceof Error ? err : new Error(String(err));

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryBaseDelayMs * 2 ** attempt));
      }
    }
  }

  throw lastError ?? new Error('Request failed after retries');
}

/**
 * GET /api/v1/{path}
 */
export function get<T>(path: string): Promise<T> {
  return request<T>('GET', path);
}

/**
 * POST /api/v1/{path}
 */
export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>('POST', path, body);
}
