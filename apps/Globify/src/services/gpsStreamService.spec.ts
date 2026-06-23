/**
 * Unit tests for GpsStreamService — token propagation on the WS URL.
 */
import { GpsStreamService } from './gpsStreamService';

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

describe('GpsStreamService', () => {
  it('appends the access token as a query parameter on connect', () => {
    const svc = new GpsStreamService('wss://api.test.com/api/v1/vehicles/stream', () => 'access-tok-123');
    svc.connect();

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe(
      'wss://api.test.com/api/v1/vehicles/stream?token=access-tok-123'
    );

    svc.dispose();
  });

  it('does not append a token parameter when no token is available', () => {
    const svc = new GpsStreamService('wss://api.test.com/api/v1/vehicles/stream', () => null);
    svc.connect();

    expect(FakeWebSocket.instances[0].url).toBe('wss://api.test.com/api/v1/vehicles/stream');

    svc.dispose();
  });

  it('reads a fresh token on each connect (token may rotate)', () => {
    let current = 'first';
    const svc = new GpsStreamService('wss://api.test.com/stream', () => current);
    svc.connect();
    current = 'second';
    svc.connect();

    expect(FakeWebSocket.instances[1].url).toBe('wss://api.test.com/stream?token=second');

    svc.dispose();
  });
});
