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
 * Sign in with email and password. Returns the JWT ID token on success.
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
        resolve(session.getIdToken().getJwtToken());
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
 * Get the current ID token, refreshing the session if needed.
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
      const idToken = session.getIdToken();
      const expiresAt = idToken.getExpiration() * 1000; // ms
      const fiveMinutes = 5 * 60 * 1000;

      if (Date.now() > expiresAt - fiveMinutes) {
        const refreshToken = session.getRefreshToken();
        user.refreshSession(refreshToken, (refreshErr: Error | null, newSession: CognitoUserSession | null) => {
          if (refreshErr || !newSession) {
            resolve(null);
            return;
          }
          resolve(newSession.getIdToken().getJwtToken());
        });
        return;
      }

      resolve(idToken.getJwtToken());
    });
  });
}

/**
 * Check if there is a stored valid session.
 */
export function checkExistingSession(): Promise<string | null> {
  return getCurrentToken();
}
