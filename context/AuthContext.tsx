/**
 * Auth Context - Manages authentication state across the app
 * Supports anonymous sessions, JWT tokens, and OAuth
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  User, 
  SessionType,
  getCurrentUser, 
  loginWithGoogle, 
  logout as authLogout, 
  getUserInitials,
  createAnonymousSession,
  getJwt,
  getAuthHeaders,
  clearJwtCache
} from '../services/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isAuthenticated: boolean; // True only for non-anonymous users
  isAnonymous: boolean;
  isApproved: boolean;
  sessionType: SessionType;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getJwtToken: () => Promise<string | null>;
  getHeaders: () => Promise<HeadersInit>;
  userInitials: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount, create anonymous if none
  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check for OAuth error in URL
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get('error');
      
      if (errorParam) {
        console.warn('OAuth error detected:', errorParam);
        // Remove error from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // Try to get existing session
      let currentUser = await getCurrentUser();
      
      // If user exists (authenticated or has active guest session), use it
      if (currentUser) {
        setUser(currentUser);
      } else {
        // No active session - user is logged out
        // Do NOT auto-create guest session here
        // Users must explicitly log in or be redirected to login
        setUser(null);
      }
    } catch (error) {
      console.error('Auth init failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async () => {
    try {
      await loginWithGoogle();
      // After redirect, initAuth will be called again
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Delete the Appwrite session
      await authLogout();
      clearJwtCache();
      
      // After logout, user is completely logged out
      // Do NOT auto-create guest session
      // Users must explicitly choose to continue as guest
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }, []);

  const getJwtToken = useCallback(async () => {
    return await getJwt();
  }, []);

  const getHeaders = useCallback(async () => {
    return await getAuthHeaders();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isLoggedIn: !!user,
    isAuthenticated: !!user && !user.isAnonymous,
    isAnonymous: user?.isAnonymous || false,
    isApproved: user?.isApproved || false,
    sessionType: user?.sessionType || 'none',
    login,
    logout,
    getJwtToken,
    getHeaders,
    userInitials: user?.name ? getUserInitials(user.name) : '',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthProvider, useAuth };
