import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GpsStreamService,
  PositionUpdate,
  WsMessage,
} from './gpsStreamService';
import { getToken } from './apiClient';
import { fetchStreamTicket } from './streamTicketService';

export interface VehiclePosition extends PositionUpdate {
  updatedAt: number; // monotonic timestamp for staleness checks
}

/**
 * Window over which incoming pings are batched before committing to state.
 * Roughly one frame — long enough to absorb a whole broadcast burst, short
 * enough to be imperceptible.
 */
const POSITION_FLUSH_MS = 16;

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

  // Load initial positions from REST endpoint.
  //
  // No guard on an empty base URL: apiClient composes `${baseUrl}/api/v1...`
  // unconditionally, so an empty base means same-origin, which is how the rest
  // of the app loads data in dev. Bailing out here instead made the vehicle
  // layer silently unreachable whenever API_BASE_URL was unset. `apiBaseUrl`
  // is `string | undefined`, though, so it's normalized to `''` first —
  // otherwise "undefined" itself ends up as a URL path segment.
  useEffect(() => {
    let cancelled = false;

    const token = getToken();
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    fetch(`${apiBaseUrl ?? ''}/api/v1/vehicles/positions`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return;
        const map = new Map<string, VehiclePosition>();
        for (const p of data as PositionUpdate[]) {
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

  // The server broadcasts one message per vehicle, so a tick arrives as a burst
  // of ~20. Committing each one separately meant 20 renders — and, downstream,
  // 20 rebuilds of the whole marker layer. Buffer them and commit once.
  const pendingRef = useRef<Map<string, VehiclePosition>>(new Map());
  const flushHandleRef = useRef<number | null>(null);

  const flush = useCallback(() => {
    flushHandleRef.current = null;
    const pending = pendingRef.current;
    if (pending.size === 0) return;
    // Hand the buffer off and start a fresh one. The state updater runs lazily
    // during render, so clearing this map in place afterwards would empty it
    // before the merge ever reads it.
    pendingRef.current = new Map();
    setPositions((prev) => {
      const next = new Map(prev);
      for (const [id, position] of pending) next.set(id, position);
      return next;
    });
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushHandleRef.current !== null) return;
    // A timeout rather than requestAnimationFrame: each socket message arrives
    // in its own task, so the window has to span tasks to batch a burst, and a
    // frame callback does not run at all when the frame loop is idle.
    flushHandleRef.current = setTimeout(flush, POSITION_FLUSH_MS) as unknown as number;
  }, [flush]);

  // Handle incoming WebSocket message
  const handleMessage = useCallback(
    (msg: WsMessage) => {
      if (msg.type !== 'position_update') return;
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
      pendingRef.current.set(update.vehicleId, {
        ...update,
        updatedAt: Date.now(),
      });
      scheduleFlush();
    },
    [scheduleFlush],
  );

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
      if (flushHandleRef.current !== null) {
        clearTimeout(flushHandleRef.current);
        flushHandleRef.current = null;
      }
      pendingRef.current.clear();
    };
  }, [wsUrl, handleMessage]);

  return { positions, connected };
}
