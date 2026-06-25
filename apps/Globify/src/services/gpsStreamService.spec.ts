/**
 * Unit tests for GpsStreamService — token propagation on the WS URL.
 */
import { GpsStreamService } from './gpsStreamService';

const originalWebSocket = (global as unknown as { WebSocket?: unknown }).WebSocket;

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  static instances: FakeWebSocket[] = [];
  url: string;
  readyState = FakeWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  (global as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;
});

afterEach(() => {
  (global as unknown as { WebSocket?: unknown }).WebSocket = originalWebSocket;
});

describe('GpsStreamService', () => {
  it('appends a single-use ticket as a query parameter on connect', async () => {
    const svc = new GpsStreamService(
      'wss://api.test.com/api/v1/vehicles/stream',
      async () => 'ticket-123'
    );
    await svc.connect();

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe(
      'wss://api.test.com/api/v1/vehicles/stream?ticket=ticket-123'
    );

    svc.dispose();
  });

  it('does not append a ticket parameter when none is available', async () => {
    const svc = new GpsStreamService(
      'wss://api.test.com/api/v1/vehicles/stream',
      async () => null
    );
    await svc.connect();

    expect(FakeWebSocket.instances[0].url).toBe('wss://api.test.com/api/v1/vehicles/stream');

    svc.dispose();
  });

  it('does not open an unauthenticated socket when ticket issuance fails', async () => {
    jest.useFakeTimers();
    try {
      const svc = new GpsStreamService('wss://api.test.com/stream', async () => {
        throw new Error('ticket issuance down');
      });
      await svc.connect();

      // The connect() catch path must back off rather than fall through to an
      // unauthenticated upgrade, so no WebSocket should have been created.
      expect(FakeWebSocket.instances).toHaveLength(0);

      svc.dispose();
    } finally {
      jest.useRealTimers();
    }
  });

  it('fetches a fresh ticket on each connect (tickets are single-use)', async () => {
    let n = 0;
    const svc = new GpsStreamService('wss://api.test.com/stream', async () => `ticket-${++n}`);
    await svc.connect();
    await svc.connect();

    expect(FakeWebSocket.instances[1].url).toBe('wss://api.test.com/stream?ticket=ticket-2');

    svc.dispose();
  });
});
