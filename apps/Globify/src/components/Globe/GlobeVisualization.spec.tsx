/**
 * Unit tests for GlobeVisualization component
 * Written following TDD principles - these tests should FAIL initially
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { GlobeVisualization } from './GlobeVisualization';
import type { DataPoint } from './types';

describe('GlobeVisualization Component', () => {
  describe('Rendering', () => {
    it('should render WebView with correct source URI', () => {
      const { UNSAFE_getByProps } = render(<GlobeVisualization testID="test-globe" />);
      
      const webview = UNSAFE_getByProps({ testID: 'test-globe' });
      expect(webview).toBeTruthy();
      expect(webview.props.source).toBeDefined();
    });

    it('should apply default background color when not provided', () => {
      const { UNSAFE_getByProps } = render(<GlobeVisualization testID="test-globe" />);
      
      const webview = UNSAFE_getByProps({ testID: 'test-globe' });
      expect(webview.props.style).toMatchObject({
        backgroundColor: '#000000',
      });
    });

    it('should apply custom background color when provided', () => {
      const { UNSAFE_getByProps } = render(
        <GlobeVisualization testID="test-globe" backgroundColor="#FF0000" />
      );
      
      const webview = UNSAFE_getByProps({ testID: 'test-globe' });
      expect(webview.props.style).toMatchObject({
        backgroundColor: '#FF0000',
      });
    });
  });

  describe('WebView Message Handling', () => {
    it('should parse READY message and invoke onReady callback', () => {
      const onReady = jest.fn();
      const { UNSAFE_getByProps } = render(
        <GlobeVisualization testID="test-globe" onReady={onReady} />
      );
      
      const webview = UNSAFE_getByProps({ testID: 'test-globe' });
      const readyMessage = JSON.stringify({
        type: 'READY',
        payload: { version: '1.0.0', globeVersion: '2.26.0' },
      });
      
      // Simulate WebView message
      webview.props.onMessage({ nativeEvent: { data: readyMessage } });
      
      expect(onReady).toHaveBeenCalledTimes(1);
    });

    it('should parse ERROR message and invoke onError callback', () => {
      const onError = jest.fn();
      const { UNSAFE_getByProps } = render(
        <GlobeVisualization testID="test-globe" onError={onError} />
      );
      
      const webview = UNSAFE_getByProps({ testID: 'test-globe' });
      const errorMessage = JSON.stringify({
        type: 'ERROR',
        payload: { message: 'WebGL init failed', code: 'WEBGL_ERROR' },
      });
      
      // Simulate WebView error message
      webview.props.onMessage({ nativeEvent: { data: errorMessage } });
      
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        message: 'WebGL init failed',
      }));
    });

    it('should parse POINT_CLICKED message and invoke onPointClick callback', () => {
      const onPointClick = jest.fn();
      const testPoint: DataPoint = { lat: 40.7128, lng: -74.0060, label: 'New York' };
      
      const { UNSAFE_getByProps } = render(
        <GlobeVisualization testID="test-globe" onPointClick={onPointClick} />
      );
      
      const webview = UNSAFE_getByProps({ testID: 'test-globe' });
      const clickMessage = JSON.stringify({
        type: 'POINT_CLICKED',
        payload: { point: testPoint, index: 0 },
      });
      
      // Simulate point click
      webview.props.onMessage({ nativeEvent: { data: clickMessage } });
      
      expect(onPointClick).toHaveBeenCalledTimes(1);
      expect(onPointClick).toHaveBeenCalledWith(testPoint, 0);
    });

    it('should handle invalid JSON gracefully without crashing', () => {
      const { UNSAFE_getByProps } = render(<GlobeVisualization testID="test-globe" />);
      
      const webview = UNSAFE_getByProps({ testID: 'test-globe' });
      
      // Simulate invalid JSON
      expect(() => {
        webview.props.onMessage({ nativeEvent: { data: 'invalid json{' } });
      }).not.toThrow();
    });

    it('should ignore unknown message types', () => {
      const { UNSAFE_getByProps } = render(<GlobeVisualization testID="test-globe" />);
      
      const webview = UNSAFE_getByProps({ testID: 'test-globe' });
      const unknownMessage = JSON.stringify({
        type: 'UNKNOWN_TYPE',
        payload: {},
      });
      
      // Simulate unknown message type
      expect(() => {
        webview.props.onMessage({ nativeEvent: { data: unknownMessage } });
      }).not.toThrow();
    });
  });

  describe('Data Point Updates', () => {
    it('should inject UPDATE_DATA message when dataPoints prop is provided', () => {
      const mockInjectJavaScript = jest.fn();
      const testPoints: DataPoint[] = [
        { lat: 40.7128, lng: -74.0060, label: 'New York' },
      ];
      
      const { UNSAFE_getByProps } = render(
        <GlobeVisualization testID="test-globe" dataPoints={testPoints} />
      );
      
      const webview = UNSAFE_getByProps({ testID: 'test-globe' });
      
      // Mock injectJavaScript method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (webview as any).injectJavaScript = mockInjectJavaScript;
      
      // Component should inject data on mount
      expect(mockInjectJavaScript).toHaveBeenCalled();
      
      const callArg = mockInjectJavaScript.mock.calls[0][0];
      expect(callArg).toContain('UPDATE_DATA');
      expect(callArg).toContain('New York');
    });
  });
});
