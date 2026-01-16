/**
 * WebView Bridge Utilities
 * Type guards and validators for React Native ↔ WebView communication
 */

import type {
  DataPoint,
  RNToWebViewMessage,
  WebViewToRNMessage,
} from './types';

/**
 * Type guard to check if a message is from React Native to WebView.
 */
export function isRNToWebViewMessage(msg: unknown): msg is RNToWebViewMessage {
  if (typeof msg !== 'object' || msg === null) return false;
  const { type } = msg as { type?: string };
  return type === 'UPDATE_DATA' || type === 'SET_ROTATION' || type === 'RESET_VIEW';
}

/**
 * Type guard to check if a message is from WebView to React Native.
 */
export function isWebViewToRNMessage(msg: unknown): msg is WebViewToRNMessage {
  if (typeof msg !== 'object' || msg === null) return false;
  const { type } = msg as { type?: string };
  return (
    type === 'STATE_UPDATE' ||
    type === 'READY' ||
    type === 'ERROR' ||
    type === 'POINT_CLICKED'
  );
}

/**
 * Validates a DataPoint object.
 * Throws TypeError if invalid.
 */
export function validateDataPoint(point: unknown): asserts point is DataPoint {
  if (typeof point !== 'object' || point === null) {
    throw new TypeError('DataPoint must be an object');
  }

  const { lat, lng } = point as { lat?: unknown; lng?: unknown };

  if (typeof lat !== 'number' || lat < -90 || lat > 90) {
    throw new TypeError('DataPoint.lat must be a number in range [-90, 90]');
  }

  if (typeof lng !== 'number' || lng < -180 || lng > 180) {
    throw new TypeError('DataPoint.lng must be a number in range [-180, 180]');
  }

  // Optional fields validation
  const { size, color } = point as { size?: unknown; color?: unknown };
  if (size !== undefined && (typeof size !== 'number' || size <= 0)) {
    throw new TypeError('DataPoint.size must be a positive number if provided');
  }

  if (color !== undefined && typeof color !== 'string') {
    throw new TypeError('DataPoint.color must be a string if provided');
  }
}

/**
 * Validates an array of DataPoint objects.
 * Returns array of valid points, logs errors for invalid points.
 */
export function validateDataPoints(points: unknown[]): DataPoint[] {
  const validPoints: DataPoint[] = [];

  points.forEach((point, index) => {
    try {
      validateDataPoint(point);
      validPoints.push(point as DataPoint);
    } catch (error) {
      console.warn(`Invalid data point at index ${index}:`, error);
    }
  });

  return validPoints;
}

/**
 * Safely parse JSON message from WebView.
 * Returns parsed message or null if invalid.
 */
export function parseWebViewMessage(data: string): WebViewToRNMessage | null {
  try {
    const parsed = JSON.parse(data);
    
    if (isWebViewToRNMessage(parsed)) {
      return parsed;
    }
    
    console.warn('Unknown WebView message type:', parsed);
    return null;
  } catch (error) {
    console.error('Failed to parse WebView message:', error);
    return null;
  }
}

/**
 * Create a message to send to WebView.
 * Returns JavaScript code string for injectJavaScript.
 */
export function createRNMessage(message: RNToWebViewMessage): string {
  const messageJson = JSON.stringify(message);
  return `
    window.handleRNMessage(${messageJson});
    true; // Prevent alert
  `;
}
