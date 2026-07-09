/**
 * OAuth 2.0 authentication service via Cognito Hosted UI.
 * Supports Google (and future Apple) sign-in using authorization_code flow.
 * No third-party auth library required — all token exchange is plain fetch().
 */
import { config } from './config';

const STORAGE_KEYS = {
  accessToken: 'auth.access_token',
  idToken: 'auth.id_token',
  refreshToken: 'auth.refresh_token',
  expiresAt: 'auth.expires_at',
} as const;

// ── Storage helpers (localStorage on web, no-op on native) ───────────────────

function store(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

function load(key: string): string | null {
  if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
  return null;
}

function remove(key: string): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
}

function clearTokens(): void {
  Object.values(STORAGE_KEYS).forEach(remove);
}

// ── OAuth URL helpers ─────────────────────────────────────────────────────────

function callbackUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:8081';
}

function hostedUiBase(): string {
  return config.cognitoDomain;
}

/** Redirect the browser to Cognito Hosted UI to sign in with Google. */
export function signInWithGoogle(): void {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.cognitoClientId,
    redirect_uri: callbackUrl(),
    identity_provider: 'Google',
    scope: 'openid email profile',
  });
  window.location.href = `${hostedUiBase()}/oauth2/authorize?${params}`;
}

/** Exchange an authorization code for tokens and persist them. Returns access token. */
export async function handleOAuthCallback(code: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: callbackUrl(),
    client_id: config.cognitoClientId,
  });

  const res = await fetch(`${hostedUiBase()}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  const data = await res.json();
  persistTokens(data);
  return data.access_token as string;
}

function persistTokens(data: {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in: number;
}): void {
  store(STORAGE_KEYS.accessToken, data.access_token);
  if (data.id_token) store(STORAGE_KEYS.idToken, data.id_token);
  if (data.refresh_token) store(STORAGE_KEYS.refreshToken, data.refresh_token);
  store(
    STORAGE_KEYS.expiresAt,
    String(Date.now() + data.expires_in * 1000)
  );
}

/** Refresh using the stored refresh token. Returns new access token or null. */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = load(STORAGE_KEYS.refreshToken);
  if (!refreshToken) return null;

  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.cognitoClientId,
    });

    const res = await fetch(`${hostedUiBase()}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await res.json();
    persistTokens(data);
    return data.access_token as string;
  } catch {
    return null;
  }
}

/**
 * Returns the current access token, refreshing proactively if it expires
 * within 5 minutes. Returns null if no valid session exists.
 */
export async function getCurrentToken(): Promise<string | null> {
  const token = load(STORAGE_KEYS.accessToken);
  const expiresAt = Number(load(STORAGE_KEYS.expiresAt) ?? '0');

  if (!token) return null;

  const fiveMinutes = 5 * 60 * 1000;
  if (Date.now() > expiresAt - fiveMinutes) {
    return refreshAccessToken();
  }

  return token;
}

/** Returns the current token if a valid session exists, null otherwise. */
export function checkExistingSession(): Promise<string | null> {
  return getCurrentToken();
}

/** Sign out: clear local tokens and redirect to Cognito logout endpoint. */
export function signOut(): void {
  clearTokens();
  const params = new URLSearchParams({
    client_id: config.cognitoClientId,
    logout_uri: callbackUrl(),
  });
  if (typeof window !== 'undefined') {
    window.location.href = `${hostedUiBase()}/logout?${params}`;
  }
}
