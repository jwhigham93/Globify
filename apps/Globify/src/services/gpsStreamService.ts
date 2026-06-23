/**
 * GPS stream service — WebSocket client with auto-reconnect.
 *
 * Connects to the supply-chain-api WebSocket endpoint and emits
 * position_update messages to registered listeners.
 */

export interface PositionUpdate {
  vehicleId: string;
  lat: number;
  lng: number;
  heading?: number;
  speedMph?: number;
  recordedAt: string;
  gpsStatus: 'live' | 'stale' | 'lost';
  vehicleName?: string;
  originName?: string;
  destinationName?: string;
  routeStartedAt?: string;
}

export interface WsMessage {
  type: string;
  data: unknown;
}

type Listener = (msg: WsMessage) => void;

const INITIAL_RECONNECT_DELAY = 1_000;
const MAX_RECONNECT_DELAY = 30_000;

export class GpsStreamService {
  private url: string;
  private getToken?: () => string | null;
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectDelay = INITIAL_RECONNECT_DELAY;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  /**
   * @param url Base WebSocket URL.
   * @param getToken Optional provider for the Cognito access token. Browsers
   *   cannot set an Authorization header on a WebSocket, so the token is
   *   appended as a `?token=` query parameter and re-read on every (re)connect
   *   in case it has rotated.
   */
  constructor(url: string, getToken?: () => string | null) {
    this.url = url;
    this.getToken = getToken;
  }

  /** Build the connection URL, appending the current access token if present. */
  private buildUrl(): string {
    const token = this.getToken?.() ?? null;
    if (!token) return this.url;
    const separator = this.url.includes('?') ? '&' : '?';
    return `${this.url}${separator}token=${encodeURIComponent(token)}`;
  }

  /** Start the WebSocket connection. */
  connect(): void {
    if (this.disposed) return;
    this.cleanup();

    const ws = new WebSocket(this.buildUrl());

    ws.onopen = () => {
      this.reconnectDelay = INITIAL_RECONNECT_DELAY;
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data as string);
        this.listeners.forEach((fn) => fn(msg));
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (!this.disposed) this.scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };

    this.ws = ws;
  }

  /** Register a listener for incoming messages. Returns unsubscribe function. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Permanently close and clean up. */
  dispose(): void {
    this.disposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.cleanup();
    this.listeners.clear();
  }

  private cleanup(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 2,
        MAX_RECONNECT_DELAY
      );
      this.connect();
    }, this.reconnectDelay);
  }
}
