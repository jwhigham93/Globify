/**
 * App configuration from expo.extra in app.json.
 * Values can be overridden per EAS build profile in eas.json.
 */
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const config = {
  /** Base URL for the Go supply chain API (e.g. "https://api.example.com"). Empty = dev mode. */
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || (extra.API_BASE_URL as string) || '',

  /** WebSocket URL for real-time GPS streaming. Derived from apiBaseUrl if not set. Empty string explicitly disables streaming. */
  wsUrl: process.env.EXPO_PUBLIC_WS_URL ?? (extra.WS_URL as string) ?? '',

  /** CDN base URL for progressive NASA tile imagery. Falls back to localhost:3001 in dev mode. */
  tileCdnUrl: (extra.TILE_CDN_URL as string) || '',

  /** AWS Cognito User Pool ID */
  cognitoUserPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID || (extra.COGNITO_USER_POOL_ID as string) || '',

  /** AWS Cognito App Client ID */
  cognitoClientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID || (extra.COGNITO_CLIENT_ID as string) || '',

  /** AWS Cognito region */
  cognitoRegion: process.env.EXPO_PUBLIC_COGNITO_REGION || (extra.COGNITO_REGION as string) || 'us-east-1',

  /** Whether the app is running in dev mode (no API, mock data) */
  get isDevMode(): boolean {
    return !this.apiBaseUrl;
  },

  /** Whether Cognito auth is enabled (requires both pool ID and client ID) */
  get isAuthEnabled(): boolean {
    return !!this.cognitoUserPoolId && !!this.cognitoClientId;
  },

  /** Resolved WebSocket URL — derives ws(s):// from apiBaseUrl if wsUrl not set. Returns empty string (disabled) when EXPO_PUBLIC_WS_URL is explicitly empty. */
  get resolvedWsUrl(): string {
    // If EXPO_PUBLIC_WS_URL was explicitly set (even to ''), respect it — don't derive.
    if (process.env.EXPO_PUBLIC_WS_URL !== undefined) return this.wsUrl;
    if (this.wsUrl) return this.wsUrl;
    if (!this.apiBaseUrl) return '';
    return this.apiBaseUrl
      .replace(/^https:/, 'wss:')
      .replace(/^http:/, 'ws:') + '/api/v1/vehicles/stream';
  },

  /** Resolved tile URL — disabled pending visual quality improvements */
  get resolvedTileCdnUrl(): string {
    return '';
  },
} as const;
