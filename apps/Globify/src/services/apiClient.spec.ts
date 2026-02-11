/**
 * Unit tests for apiClient
 */
import { get, post, setTokenGetter, setRetryDelay, ApiError } from './apiClient';

// Mock config
jest.mock('./config', () => ({
  config: {
    apiBaseUrl: 'https://api.test.com',
    isDevMode: false,
  },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  setTokenGetter(null as unknown as () => string | null);
  setRetryDelay(0); // instant retries for tests
});

describe('apiClient', () => {
  describe('successful requests', () => {
    it('should make a GET request and return parsed JSON', async () => {
      const data = { locations: [{ id: 'loc-1' }] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await get('/locations');

      expect(result).toEqual(data);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/v1/locations',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should make a POST request with body', async () => {
      const body = { disabledNodes: [{ id: 'sup-1', type: 'supplier' }] };
      const responseData = { affectedRoutes: 3 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
      });

      const result = await post('/disruption/simulate', body);

      expect(result).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/v1/disruption/simulate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        }),
      );
    });
  });

  describe('auth header attachment', () => {
    it('should attach Authorization header when token getter is set', async () => {
      setTokenGetter(() => 'test-jwt-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await get('/locations');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-jwt-token',
          }),
        }),
      );
    });

    it('should not attach Authorization header when no token getter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await get('/locations');

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders.Authorization).toBeUndefined();
    });
  });

  describe('error response handling', () => {
    it('should throw ApiError with status and message on non-2xx response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'location not found' }),
      });

      await expect(get('/locations/bad-id')).rejects.toThrow(ApiError);
      await mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'location not found' }),
      });

      try {
        await get('/locations/bad-id');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).status).toBe(404);
        expect((e as ApiError).message).toBe('location not found');
      }
    });

    it('should not retry on HTTP errors (4xx/5xx)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'bad request' }),
      });

      await expect(get('/bad')).rejects.toThrow(ApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry on network failure', () => {
    it('should retry up to 3 times on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ok: true }),
        });

      const result = await get('/locations');
      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should throw after all retries are exhausted', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network request failed'));

      await expect(get('/locations')).rejects.toThrow('Network request failed');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
