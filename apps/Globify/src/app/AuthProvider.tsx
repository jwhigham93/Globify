import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as authService from '../services/authService';
import { config } from '../services/config';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  signInWithGoogle: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
  token: null,
  signInWithGoogle: () => { /* noop default */ },
  signOut: () => { /* noop default */ },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // Refresh every 50 minutes (tokens expire after 60 min)
    refreshTimerRef.current = setTimeout(async () => {
      const newToken = await authService.getCurrentToken();
      if (newToken) {
        setToken(newToken);
        scheduleRefresh();
      } else {
        setToken(null);
      }
    }, 50 * 60 * 1000);
  }, []);

  useEffect(() => {
    if (!config.isAuthEnabled) {
      setIsLoading(false);
      return;
    }

    // Handle OAuth callback: Cognito redirects back with ?code=
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        // Remove the code from the URL before exchanging it
        window.history.replaceState({}, document.title, window.location.pathname);
        authService.handleOAuthCallback(code)
          .then((newToken) => {
            setToken(newToken);
            scheduleRefresh();
          })
          .catch(() => { /* exchange failed — stay on sign-in screen */ })
          .finally(() => setIsLoading(false));
        return;
      }
    }

    // Check for an existing stored session
    authService.checkExistingSession().then((existingToken) => {
      if (existingToken) {
        setToken(existingToken);
        scheduleRefresh();
      }
      setIsLoading(false);
    });

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh]);

  const handleSignOut = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    authService.signOut(); // clears tokens + redirects to Cognito logout
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !config.isAuthEnabled || !!token,
      isLoading,
      token,
      signInWithGoogle: authService.signInWithGoogle,
      signOut: handleSignOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
