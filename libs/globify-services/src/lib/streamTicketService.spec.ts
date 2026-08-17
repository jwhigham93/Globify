/**
 * Unit tests for streamTicketService.
 */
import { fetchStreamTicket } from './streamTicketService';
import { post } from './apiClient';

jest.mock('./apiClient', () => ({
  post: jest.fn(),
}));

const mockPost = post as jest.MockedFunction<typeof post>;

describe('fetchStreamTicket', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('returns the ticket from the issue endpoint', async () => {
    mockPost.mockResolvedValue({ ticket: 'abc123', expiresIn: 30 });

    await expect(fetchStreamTicket()).resolves.toBe('abc123');
    expect(mockPost).toHaveBeenCalledWith('/vehicles/stream/ticket', {});
  });

  it('rejects (does not return null) when issuance fails', async () => {
    mockPost.mockRejectedValue(new Error('network down'));

    await expect(fetchStreamTicket()).rejects.toThrow('network down');
  });
});
