/**
 * Cognito authentication service using amazon-cognito-identity-js.
 * Handles sign-in, sign-out, token retrieval, and automatic session refresh.
 */
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { config } from './config';

let userPool: CognitoUserPool | null = null;
// Held across signIn → completeNewPassword calls
let pendingUser: CognitoUser | null = null;

function getUserPool(): CognitoUserPool {
  if (!userPool) {
    userPool = new CognitoUserPool({
      UserPoolId: config.cognitoUserPoolId,
      ClientId: config.cognitoClientId,
    });
  }
  return userPool;
}

/**
 * Sign in with email and password. Returns the JWT access token on success.
 * The access token (not the ID token) is the correct credential for API
 * authorization — the Go API validates token_use=access + client_id.
 */
export function signIn(email: string, password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    const user = new CognitoUser({ Username: email, Pool: pool });
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    user.authenticateUser(authDetails, {
      onSuccess: (session: CognitoUserSession) => {
        pendingUser = null;
        resolve(session.getAccessToken().getJwtToken());
      },
      onFailure: (err: Error) => {
        reject(err);
      },
      newPasswordRequired: (_userAttributes: object, _requiredAttributes: object) => {
        pendingUser = user;
        const err = new Error('New password required');
        (err as any).code = 'NEW_PASSWORD_REQUIRED';
        reject(err);
      },
    });
  });
}

/**
 * Complete the NEW_PASSWORD_REQUIRED challenge after admin-created sign-in.
 * Must be called after signIn rejects with code === 'NEW_PASSWORD_REQUIRED'.
 */
export function completeNewPassword(newPassword: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!pendingUser) {
      reject(new Error('No pending password challenge'));
      return;
    }
    pendingUser.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess: (session: CognitoUserSession) => {
        pendingUser = null;
        resolve(session.getAccessToken().getJwtToken());
      },
      onFailure: (err: Error) => {
        reject(err);
      },
    });
  });
}

/**
 * Sign out the current user and clear stored tokens.
 */
export function signOut(): void {
  const pool = getUserPool();
  const user = pool.getCurrentUser();
  if (user) {
    user.signOut();
  }
}

/**
 * Get the current access token, refreshing the session if needed.
 * Returns null if no valid session exists.
 */
export function getCurrentToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const pool = getUserPool();
    const user = pool.getCurrentUser();
    if (!user) {
      resolve(null);
      return;
    }

    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }

      // Check if token is within 5 minutes of expiry — refresh proactively
      const accessToken = session.getAccessToken();
      const expiresAt = accessToken.getExpiration() * 1000; // ms
      const fiveMinutes = 5 * 60 * 1000;

      if (Date.now() > expiresAt - fiveMinutes) {
        const refreshToken = session.getRefreshToken();
        user.refreshSession(refreshToken, (refreshErr: Error | null, newSession: CognitoUserSession | null) => {
          if (refreshErr || !newSession) {
            resolve(null);
            return;
          }
          resolve(newSession.getAccessToken().getJwtToken());
        });
        return;
      }

      resolve(accessToken.getJwtToken());
    });
  });
}

/**
 * Check if there is a stored valid session.
 */
export function checkExistingSession(): Promise<string | null> {
  return getCurrentToken();
}
