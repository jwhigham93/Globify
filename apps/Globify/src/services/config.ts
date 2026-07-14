/**
 * App configuration from expo.extra in app.json.
 * Values can be overridden per EAS build profile in eas.json.
 */
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const config = {
  /** Base URL for the Go supply chain API (e.g. "https://api.example.com"). Empty = dev mode. */
  apiBaseUrl: (extra.API_BASE_URL as string) || '',

  /** WebSocket URL for real-time GPS streaming. Derived from apiBaseUrl if not set. */
  wsUrl: (extra.WS_URL as string) || '',

  /** CDN base URL for progressive NASA tile imagery. Falls back to localhost:3001 in dev mode. */
  tileCdnUrl: (extra.TILE_CDN_URL as string) || '',

  /** AWS Cognito User Pool ID */
  cognitoUserPoolId: (extra.COGNITO_USER_POOL_ID as string) || '',

  /** AWS Cognito App Client ID */
  cognitoClientId: (extra.COGNITO_CLIENT_ID as string) || '',

  /** AWS Cognito region */
  cognitoRegion: (extra.COGNITO_REGION as string) || 'us-east-1',

  /** Whether Cognito auth is enabled (requires both pool ID and client ID) */
  get isAuthEnabled(): boolean {
    return !!this.cognitoUserPoolId && !!this.cognitoClientId;
  },

  /** Resolved WebSocket URL — derives ws(s):// from apiBaseUrl if wsUrl not set */
  get resolvedWsUrl(): string {
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
