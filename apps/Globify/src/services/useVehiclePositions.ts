import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GpsStreamService,
  PositionUpdate,
  WsMessage,
} from './gpsStreamService';

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

    fetch(`${apiBaseUrl}/api/v1/vehicles/positions`)
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
      const update = msg.data as PositionUpdate;
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

    const svc = new GpsStreamService(wsUrl);
    serviceRef.current = svc;

    const unsub = svc.subscribe((msg) => {
      if (msg.type === 'position_update') {
        setConnected(true);
      }
      handleMessage(msg);
    });

    svc.connect();

    return () => {
      unsub();
      svc.dispose();
      serviceRef.current = null;
      setConnected(false);
    };
  }, [wsUrl, handleMessage]);

  return { positions, connected };
}
