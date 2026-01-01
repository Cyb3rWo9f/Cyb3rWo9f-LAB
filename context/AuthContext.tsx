/**
 * Auth Context - Manages authentication state across the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, getCurrentUser, loginWithGoogle, logout as authLogout, getUserInitials } from '../services/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isApproved: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  userInitials: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authLogout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isLoggedIn: !!user,
    isApproved: user?.isApproved || false,
    login,
    logout,
    userInitials: user?.name ? getUserInitials(user.name) : '',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
