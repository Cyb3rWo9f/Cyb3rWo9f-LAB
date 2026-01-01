/**
 * Protected Content Wrapper
 * Restricts content access based on authentication status
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, LogIn, Shield, Clock } from 'lucide-react';

interface ProtectedContentProps {
  children: React.ReactNode;
  requireAuth?: boolean;      // Require any logged in user (not anonymous)
  requireApproval?: boolean;  // Require approved user
  fallback?: React.ReactNode; // Custom fallback content
  showBlur?: boolean;         // Show blurred preview of content
  title?: string;             // Title for the lock screen
  message?: string;           // Custom message
}

export function ProtectedContent({
  children,
  requireAuth = true,
  requireApproval = false,
  fallback,
  showBlur = true,
  title = 'Protected Content',
  message
}: ProtectedContentProps) {
  const { isAuthenticated, isApproved, isLoading, login } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="mono text-sm">Verifying access...</span>
        </div>
      </div>
    );
  }

  // Check authentication requirements
  const needsAuth = requireAuth && !isAuthenticated;
  const needsApproval = requireApproval && !isApproved;

  // If all requirements met, show content
  if (!needsAuth && !needsApproval) {
    return <>{children}</>;
  }

  // Custom fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default lock screen
  return (
    <div className="relative">
      {/* Blurred content preview */}
      {showBlur && (
        <div className="absolute inset-0 overflow-hidden rounded-lg">
          <div className="filter blur-md opacity-30 pointer-events-none">
            {children}
          </div>
        </div>
      )}
      
      {/* Lock overlay */}
      <div className={`relative ${showBlur ? 'min-h-[200px]' : ''} flex items-center justify-center`}>
        <div className="bg-zinc-900/95 border border-zinc-800 rounded-lg p-6 sm:p-8 max-w-md w-full mx-4 backdrop-blur-xl">
          {/* Corner brackets */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-emerald-500/40" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-emerald-500/40" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-emerald-500/40" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-emerald-500/40" />
          
          <div className="text-center">
            {/* Icon */}
            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700">
              {needsApproval ? (
                <Clock className="w-6 h-6 text-amber-500" />
              ) : (
                <Lock className="w-6 h-6 text-emerald-500" />
              )}
            </div>
            
            {/* Title */}
            <h3 className="text-lg font-bold text-white mb-2 mono">
              {title}
            </h3>
            
            {/* Message */}
            <p className="text-zinc-400 text-sm mb-6">
              {message || (needsApproval 
                ? 'Your account is pending admin approval. Check back soon!'
                : 'Sign in to access this content.'
              )}
            </p>
            
            {/* Action button */}
            {needsAuth && (
              <button
                onClick={login}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
              >
                <LogIn size={18} />
                Sign In with Google
              </button>
            )}
            
            {needsApproval && !needsAuth && (
              <div className="flex items-center justify-center gap-2 text-amber-500 text-sm">
                <Shield size={16} />
                <span>Awaiting Approval</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check if user can access protected content
 */
export function useProtectedAccess(requireApproval = false) {
  const { isAuthenticated, isApproved, isLoading, login } = useAuth();
  
  return {
    canAccess: isAuthenticated && (!requireApproval || isApproved),
    isLoading,
    needsAuth: !isAuthenticated,
    needsApproval: isAuthenticated && requireApproval && !isApproved,
    login
  };
}
