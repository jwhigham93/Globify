import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GpsStreamService,
  PositionUpdate,
  WsMessage,
} from './gpsStreamService';
import { getToken, post } from './apiClient';

/**
 * Fetch a short-lived, single-use ticket for the GPS WebSocket stream.
 * The JWT authenticates this HTTP call; only the opaque ticket reaches the WS URL.
 */
async function fetchStreamTicket(): Promise<string | null> {
  try {
    const res = await post<{ ticket: string; expiresIn: number }>('/vehicles/stream/ticket', {});
    return res.ticket;
  } catch {
    return null;
  }
}

export interface VehiclePosition extends PositionUpdate {
  updatedAt: number; // monotonic timestamp for staleness checks
}

/**
 * React hook that subscribes to the GPS WebSocket stream and maintains
 * a map of vehicle positions, automatically updating on new pings.
 *
 * Also polls the bulk positions endpoint on mount for initial state.
 */
export function useVehiclePositions(
  wsUrl: string | undefined,
  apiBaseUrl: string | undefined
) {
  const [positions, setPositions] = useState<Map<string, VehiclePosition>>(
    new Map()
  );
  const [connected, setConnected] = useState(false);
  const serviceRef = useRef<GpsStreamService | null>(null);

  // Load initial positions from REST endpoint
  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;

    const token = getToken();
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    fetch(`${apiBaseUrl}/api/v1/vehicles/positions`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: PositionUpdate[]) => {
        if (cancelled) return;
        const map = new Map<string, VehiclePosition>();
        for (const p of data) {
          map.set(p.vehicleId, { ...p, updatedAt: Date.now() });
        }
        setPositions(map);
      })
      .catch(() => {
        /* initial load failure is non-fatal */
      });

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  // Handle incoming WebSocket message
  const handleMessage = useCallback((msg: WsMessage) => {
    if (msg.type === 'position_update') {
      const raw = msg.data as Record<string, unknown>;
      if (
        typeof raw?.vehicleId !== 'string' ||
        typeof raw?.lat !== 'number' ||
        typeof raw?.lng !== 'number' ||
        raw.lat < -90 || raw.lat > 90 ||
        raw.lng < -180 || raw.lng > 180 ||
        !['live', 'stale', 'lost'].includes(raw.gpsStatus as string)
      ) {
        return;
      }
      const update = raw as unknown as PositionUpdate;
      setPositions((prev) => {
        const next = new Map(prev);
        next.set(update.vehicleId, { ...update, updatedAt: Date.now() });
        return next;
      });
    }
  }, []);

  // WebSocket lifecycle
  useEffect(() => {
    if (!wsUrl) return;

    const svc = new GpsStreamService(wsUrl, fetchStreamTicket);
    serviceRef.current = svc;

    const unsub = svc.subscribe((msg) => {
      if (msg.type === 'position_update') {
        setConnected(true);
      }
      handleMessage(msg);
    });

    void svc.connect();

    return () => {
      unsub();
      svc.dispose();
      serviceRef.current = null;
      setConnected(false);
    };
  }, [wsUrl, handleMessage]);

  return { positions, connected };
}
