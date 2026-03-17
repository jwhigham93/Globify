/**
 * Unit tests for trip status computation
 */
import {
  computeTripStatus,
  formatTravelTime,
} from './truckStatus';

describe('computeTripStatus', () => {
  it('returns signal-lost when GPS is lost', () => {
    const result = computeTripStatus('lost', 60);
    expect(result.status).toBe('signal-lost');
    expect(result.label).toBe('Signal Lost');
    expect(result.icon).toBe('✕');
  });

  it('returns signal-delay when GPS is stale', () => {
    const result = computeTripStatus('stale', 55);
    expect(result.status).toBe('signal-delay');
    expect(result.label).toBe('Signal Delay');
  });

  it('returns en-route for live truck at highway speed', () => {
    const result = computeTripStatus('live', 65);
    expect(result.status).toBe('en-route');
    expect(result.label).toBe('En Route');
    expect(result.color).toBe('#00E676');
  });

  it('returns slow-traffic for live truck under 10 mph', () => {
    const result = computeTripStatus('live', 5);
    expect(result.status).toBe('slow-traffic');
    expect(result.label).toBe('Slow Traffic');
  });

  it('returns stopped for live truck at 0 mph', () => {
    const result = computeTripStatus('live', 0);
    expect(result.status).toBe('stopped');
  });

  it('returns stopped when speedMph is undefined', () => {
    const result = computeTripStatus('live', undefined);
    expect(result.status).toBe('stopped');
  });

  it('GPS lost takes priority over speed data', () => {
    // Even if speed is 65 mph, lost GPS means "signal lost"
    const result = computeTripStatus('lost', 65);
    expect(result.status).toBe('signal-lost');
  });

  it('GPS stale takes priority over speed data', () => {
    const result = computeTripStatus('stale', 0);
    expect(result.status).toBe('signal-delay');
  });

  it('boundary: exactly 10 mph is en-route', () => {
    const result = computeTripStatus('live', 10);
    expect(result.status).toBe('en-route');
  });

  it('boundary: 9.9 mph is slow-traffic', () => {
    const result = computeTripStatus('live', 9.9);
    expect(result.status).toBe('slow-traffic');
  });
});

describe('formatTravelTime', () => {
  it('formats hours and minutes', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000 - 15 * 60 * 1000).toISOString();
    const result = formatTravelTime(twoHoursAgo);
    expect(result).toBe('2h 15m');
  });

  it('formats minutes only when under an hour', () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const result = formatTravelTime(thirtyMinAgo);
    expect(result).toBe('30m');
  });

  it('returns dash for undefined input', () => {
    expect(formatTravelTime(undefined)).toBe('—');
  });

  it('returns dash for empty string', () => {
    expect(formatTravelTime('')).toBe('—');
  });

  it('returns dash for invalid date string', () => {
    expect(formatTravelTime('not-a-date')).toBe('—');
  });

  it('returns 0m for just now', () => {
    const now = new Date().toISOString();
    const result = formatTravelTime(now);
    expect(result).toBe('0m');
  });
});
