/**
 * AuthProvider — React context for Cognito authentication state.
 * Provides { isAuthenticated, isLoading, token, user, signIn, signOut } to children.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as authService from '../services/authService';
import { config } from '../services/config';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
  token: null,
  signIn: async () => {},
  signOut: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Schedule a token refresh 4 minutes before expiry
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    // Refresh every 50 minutes (tokens typically expire after 60 min)
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

  // Check for existing session on mount
  useEffect(() => {
    // Skip auth when Cognito is not configured (dev mode or local API testing)
    if (!config.isAuthEnabled) {
      setIsLoading(false);
      return;
    }

    authService.checkExistingSession().then((existingToken) => {
      if (existingToken) {
        setToken(existingToken);
        scheduleRefresh();
      }
      setIsLoading(false);
    });

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [scheduleRefresh]);

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      const newToken = await authService.signIn(email, password);
      setToken(newToken);
      scheduleRefresh();
    },
    [scheduleRefresh]
  );

  const handleSignOut = useCallback(() => {
    authService.signOut();
    setToken(null);
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
  }, []);

  const value: AuthContextValue = {
    isAuthenticated: !config.isAuthEnabled || !!token,
    isLoading,
    token,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
