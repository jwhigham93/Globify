/**
 * Stream-ticket service — issues short-lived, single-use tickets for the GPS
 * WebSocket stream.
 *
 * Browsers cannot set an Authorization header on a WebSocket, so the client
 * obtains an opaque ticket from this authenticated HTTP call and appends it to
 * the WS URL as `?ticket=`. The JWT authenticates this call; only the opaque
 * ticket ever reaches the WS URL (and thus any access log).
 */
import { post } from './apiClient';

export interface StreamTicketResponse {
  ticket: string;
  expiresIn: number;
}

/**
 * Fetch a fresh single-use stream ticket. Rejects on failure (it does not
 * coerce errors into null) so callers such as GpsStreamService enter their
 * retry/backoff path instead of attempting an unauthenticated connection.
 */
export async function fetchStreamTicket(): Promise<string> {
  const res = await post<StreamTicketResponse>('/vehicles/stream/ticket', {});
  return res.ticket;
}
