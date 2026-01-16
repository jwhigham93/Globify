/**
 * Unit tests for WebView bridge utilities
 * Written following TDD principles
 */

import {
  isRNToWebViewMessage,
  isWebViewToRNMessage,
  validateDataPoint,
  validateDataPoints,
  parseWebViewMessage,
  createRNMessage,
} from './bridgeUtils';
import type { RNToWebViewMessage } from './types';

describe('Bridge Utils', () => {
  describe('isRNToWebViewMessage', () => {
    it('should return true for UPDATE_DATA message', () => {
      const message = { type: 'UPDATE_DATA', payload: [] };
      expect(isRNToWebViewMessage(message)).toBe(true);
    });

    it('should return true for SET_ROTATION message', () => {
      const message = { type: 'SET_ROTATION', payload: { x: 0, y: 0, z: 0 } };
      expect(isRNToWebViewMessage(message)).toBe(true);
    });

    it('should return true for RESET_VIEW message', () => {
      const message = { type: 'RESET_VIEW' };
      expect(isRNToWebViewMessage(message)).toBe(true);
    });

    it('should return false for non-object input', () => {
      expect(isRNToWebViewMessage(null)).toBe(false);
      expect(isRNToWebViewMessage(undefined)).toBe(false);
      expect(isRNToWebViewMessage('string')).toBe(false);
      expect(isRNToWebViewMessage(123)).toBe(false);
    });

    it('should return false for WebView to RN message types', () => {
      const message = { type: 'READY', payload: {} };
      expect(isRNToWebViewMessage(message)).toBe(false);
    });
  });

  describe('isWebViewToRNMessage', () => {
    it('should return true for READY message', () => {
      const message = { type: 'READY', payload: { version: '1.0.0', globeVersion: '2.26.0' } };
      expect(isWebViewToRNMessage(message)).toBe(true);
    });

    it('should return true for STATE_UPDATE message', () => {
      const message = { type: 'STATE_UPDATE', payload: {} };
      expect(isWebViewToRNMessage(message)).toBe(true);
    });

    it('should return true for ERROR message', () => {
      const message = { type: 'ERROR', payload: { message: 'error' } };
      expect(isWebViewToRNMessage(message)).toBe(true);
    });

    it('should return true for POINT_CLICKED message', () => {
      const message = { type: 'POINT_CLICKED', payload: { point: {}, index: 0 } };
      expect(isWebViewToRNMessage(message)).toBe(true);
    });

    it('should return false for non-object input', () => {
      expect(isWebViewToRNMessage(null)).toBe(false);
      expect(isWebViewToRNMessage(undefined)).toBe(false);
    });

    it('should return false for RN to WebView message types', () => {
      const message = { type: 'UPDATE_DATA', payload: [] };
      expect(isWebViewToRNMessage(message)).toBe(false);
    });
  });

  describe('validateDataPoint', () => {
    it('should pass validation for valid data point', () => {
      const validPoint = { lat: 40.7128, lng: -74.0060, label: 'New York' };
      expect(() => validateDataPoint(validPoint)).not.toThrow();
    });

    it('should throw for non-object input', () => {
      expect(() => validateDataPoint(null)).toThrow(TypeError);
      expect(() => validateDataPoint('string')).toThrow(TypeError);
    });

    it('should throw for lat out of range', () => {
      const invalidPoint = { lat: 100, lng: 0 };
      expect(() => validateDataPoint(invalidPoint)).toThrow(TypeError);
    });

    it('should throw for lng out of range', () => {
      const invalidPoint = { lat: 0, lng: 200 };
      expect(() => validateDataPoint(invalidPoint)).toThrow(TypeError);
    });

    it('should throw for non-numeric lat', () => {
      const invalidPoint = { lat: 'string', lng: 0 };
      expect(() => validateDataPoint(invalidPoint)).toThrow(TypeError);
    });

    it('should throw for non-numeric lng', () => {
      const invalidPoint = { lat: 0, lng: 'string' };
      expect(() => validateDataPoint(invalidPoint)).toThrow(TypeError);
    });

    it('should throw for negative size', () => {
      const invalidPoint = { lat: 0, lng: 0, size: -1 };
      expect(() => validateDataPoint(invalidPoint)).toThrow(TypeError);
    });

    it('should throw for non-string color', () => {
      const invalidPoint = { lat: 0, lng: 0, color: 123 };
      expect(() => validateDataPoint(invalidPoint)).toThrow(TypeError);
    });

    it('should pass for valid optional fields', () => {
      const validPoint = { lat: 0, lng: 0, size: 0.5, color: 'red', label: 'Test' };
      expect(() => validateDataPoint(validPoint)).not.toThrow();
    });
  });

  describe('validateDataPoints', () => {
    it('should return all valid points from array', () => {
      const points = [
        { lat: 40.7128, lng: -74.0060, label: 'New York' },
        { lat: 51.5074, lng: -0.1278, label: 'London' },
      ];
      const result = validateDataPoints(points);
      expect(result).toHaveLength(2);
    });

    it('should filter out invalid points', () => {
      const points = [
        { lat: 40.7128, lng: -74.0060, label: 'New York' }, // valid
        { lat: 100, lng: 0, label: 'Invalid' }, // invalid lat
        { lat: 51.5074, lng: -0.1278, label: 'London' }, // valid
      ];
      const result = validateDataPoints(points);
      expect(result).toHaveLength(2);
      expect(result[0].label).toBe('New York');
      expect(result[1].label).toBe('London');
    });

    it('should return empty array for all invalid points', () => {
      const points = [
        { lat: 100, lng: 0 },
        { lat: 0, lng: 200 },
      ];
      const result = validateDataPoints(points);
      expect(result).toHaveLength(0);
    });
  });

  describe('parseWebViewMessage', () => {
    it('should parse valid READY message', () => {
      const jsonStr = JSON.stringify({ type: 'READY', payload: { version: '1.0.0' } });
      const result = parseWebViewMessage(jsonStr);
      expect(result).toEqual({ type: 'READY', payload: { version: '1.0.0' } });
    });

    it('should return null for invalid JSON', () => {
      const result = parseWebViewMessage('invalid json{');
      expect(result).toBeNull();
    });

    it('should return null for unknown message type', () => {
      const jsonStr = JSON.stringify({ type: 'UNKNOWN', payload: {} });
      const result = parseWebViewMessage(jsonStr);
      expect(result).toBeNull();
    });

    it('should parse ERROR message correctly', () => {
      const jsonStr = JSON.stringify({
        type: 'ERROR',
        payload: { message: 'test error', code: 'TEST' },
      });
      const result = parseWebViewMessage(jsonStr);
      expect(result).toBeTruthy();
      expect(result?.type).toBe('ERROR');
    });
  });

  describe('createRNMessage', () => {
    it('should create JavaScript code for UPDATE_DATA message', () => {
      const message: RNToWebViewMessage = {
        type: 'UPDATE_DATA',
        payload: [{ lat: 0, lng: 0, label: 'Test' }],
      };
      const result = createRNMessage(message);
      
      expect(result).toContain('window.handleRNMessage');
      expect(result).toContain('UPDATE_DATA');
      expect(result).toContain('Test');
      expect(result).toContain('true;');
    });

    it('should create JavaScript code for SET_ROTATION message', () => {
      const message: RNToWebViewMessage = {
        type: 'SET_ROTATION',
        payload: { x: 0.5, y: 1.0, z: 0 },
      };
      const result = createRNMessage(message);
      
      expect(result).toContain('window.handleRNMessage');
      expect(result).toContain('SET_ROTATION');
      expect(result).toContain('0.5');
    });

    it('should create JavaScript code for RESET_VIEW message', () => {
      const message: RNToWebViewMessage = {
        type: 'RESET_VIEW',
      };
      const result = createRNMessage(message);
      
      expect(result).toContain('window.handleRNMessage');
      expect(result).toContain('RESET_VIEW');
    });
  });
});
