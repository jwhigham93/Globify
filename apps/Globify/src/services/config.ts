/**
 * App configuration from expo.extra in app.json.
 * Values can be overridden per EAS build profile in eas.json.
 */
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const config = {
  /** Base URL for the Go supply chain API (e.g. "https://api.example.com"). Empty = dev mode. */
  apiBaseUrl: (extra.API_BASE_URL as string) || '',

  /** AWS Cognito User Pool ID */
  cognitoUserPoolId: (extra.COGNITO_USER_POOL_ID as string) || '',

  /** AWS Cognito App Client ID */
  cognitoClientId: (extra.COGNITO_CLIENT_ID as string) || '',

  /** AWS Cognito region */
  cognitoRegion: (extra.COGNITO_REGION as string) || 'us-east-1',

  /** Whether the app is running in dev mode (no API, mock data) */
  get isDevMode(): boolean {
    return !this.apiBaseUrl;
  },

  /** Whether Cognito auth is enabled (requires both pool ID and client ID) */
  get isAuthEnabled(): boolean {
    return !!this.cognitoUserPoolId && !!this.cognitoClientId;
  },
} as const;
