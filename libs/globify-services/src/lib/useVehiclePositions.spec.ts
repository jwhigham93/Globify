/**
 * Tests for the GPS position hook, focused on burst coalescing.
 *
 * The server broadcasts one message per vehicle, so a simulation tick lands as
 * a burst of ~20. Committing each separately produced 20 React renders per
 * tick, and downstream a full rebuild of the marker layer each time.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useVehiclePositions } from './useVehiclePositions';
import type { WsMessage, PositionUpdate } from './gpsStreamService';

// Capture the subscriber so tests can push messages as the socket would.
let emit: ((msg: WsMessage) => void) | null = null;

jest.mock('./gpsStreamService', () => ({
  GpsStreamService: jest.fn().mockImplementation(() => ({
    subscribe: (listener: (msg: WsMessage) => void) => {
      emit = listener;
      return () => {
        emit = null;
      };
    },
    connect: jest.fn().mockResolvedValue(undefined),
    dispose: jest.fn(),
  })),
}));

jest.mock('./streamTicketService', () => ({
  fetchStreamTicket: jest.fn().mockResolvedValue(null),
}));

jest.mock('./apiClient', () => ({ getToken: () => null }));

function positionUpdate(id: string, overrides: Partial<PositionUpdate> = {}): WsMessage {
  return {
    type: 'position_update',
    data: {
      vehicleId: id,
      lat: 39,
      lng: -94,
      gpsStatus: 'live',
      recordedAt: '2026-01-01T00:00:00Z',
      ...overrides,
    },
  };
}

/** Render the hook with the WS wired up but no REST base URL. */
function renderPositions() {
  return renderHook(() => useVehiclePositions('ws://test', undefined));
}

beforeEach(() => {
  emit = null;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useVehiclePositions', () => {
  it('coalesces a burst into a single committed update', async () => {
    const { result } = renderPositions();
    await waitFor(() => expect(emit).not.toBeNull());

    const before = result.current.positions;

    act(() => {
      for (let i = 0; i < 20; i++) emit!(positionUpdate(`v-${i}`));
    });

    // Nothing is committed until the scheduled flush runs.
    expect(result.current.positions).toBe(before);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(result.current.positions.size).toBe(20);
    expect(result.current.positions.get('v-0')?.lat).toBe(39);
    expect(result.current.positions.get('v-19')).toBeDefined();
  });

  it('keeps the last value when one vehicle reports twice in a burst', async () => {
    const { result } = renderPositions();
    await waitFor(() => expect(emit).not.toBeNull());

    act(() => {
      emit!(positionUpdate('v-1', { lat: 10 }));
      emit!(positionUpdate('v-1', { lat: 20 }));
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(result.current.positions.size).toBe(1);
    expect(result.current.positions.get('v-1')?.lat).toBe(20);
  });

  it('merges later bursts into existing state', async () => {
    const { result } = renderPositions();
    await waitFor(() => expect(emit).not.toBeNull());

    act(() => emit!(positionUpdate('v-1')));
    act(() => jest.runOnlyPendingTimers());
    act(() => emit!(positionUpdate('v-2')));
    act(() => jest.runOnlyPendingTimers());

    expect(result.current.positions.size).toBe(2);
  });

  it('drops malformed updates without committing', async () => {
    const { result } = renderPositions();
    await waitFor(() => expect(emit).not.toBeNull());

    const before = result.current.positions;
    act(() => {
      emit!({ type: 'position_update', data: { vehicleId: 'x' } });
      emit!(positionUpdate('bad-lat', { lat: 999 }));
      emit!(positionUpdate('bad-status', { gpsStatus: 'nope' as never }));
      emit!({ type: 'other', data: {} });
    });
    act(() => jest.runOnlyPendingTimers());

    expect(result.current.positions).toBe(before);
    expect(result.current.positions.size).toBe(0);
  });

  it('discards a pending flush on unmount', async () => {
    const { result, unmount } = renderPositions();
    await waitFor(() => expect(emit).not.toBeNull());

    act(() => emit!(positionUpdate('v-1')));
    unmount();

    // Must not warn about updating an unmounted component, and must not throw.
    expect(() => act(() => jest.runOnlyPendingTimers())).not.toThrow();
    expect(result.current.positions.size).toBe(0);
  });

  it('treats an undefined API base URL as same-origin, not the literal string "undefined"', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => [] } as Response);
    try {
      renderHook(() => useVehiclePositions('ws://test', undefined));

      await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toBe('/api/v1/vehicles/positions');
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
