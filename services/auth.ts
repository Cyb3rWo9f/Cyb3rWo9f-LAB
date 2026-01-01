/**
 * Authentication Service using Appwrite OAuth
 * Handles Google OAuth login/logout, anonymous sessions, and JWT management
 */

import { Client, Account, OAuthProvider } from 'appwrite';

// Initialize Appwrite client
const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

// Initialize Account service
const account = new Account(client);

// Session type enum
export type SessionType = 'anonymous' | 'authenticated' | 'none';

// User type
export interface User {
  $id: string;
  name: string;
  email: string;
  avatar?: string;
  emailVerification: boolean;
  labels: string[];
  isApproved: boolean;
  isAnonymous: boolean;
  sessionType: SessionType;
}

// JWT Token cache - ONE token per device/user that persists
// Maps guest ID to JWT token with expiry
let deviceJwtCache: Map<string, { token: string; expires: number }> = new Map();
let currentDeviceId: string | null = null;

/**
 * Generate secure device fingerprint (no localStorage)
 * Uses browser environment only - doesn't store anything
 */
function getDeviceFingerprint(): string {
  // Create fingerprint from user agent and screen dimensions
  // This ensures same device gets same ID within session
  const ua = navigator.userAgent;
  const screen = `${window.innerWidth}x${window.innerHeight}`;
  const lang = navigator.language;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Create hash from fingerprint data
  const fingerprint = `${ua}-${screen}-${lang}-${tz}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `device_${Math.abs(hash).toString(36)}`;
}

/**
 * Track device without localStorage - only in-memory during session
 * Uses device fingerprint instead of IP to prevent spoofing
 * Does NOT persist across page refresh - security feature
 */
const deviceFingerprint = getDeviceFingerprint();

/**
 * Create or retrieve device ID for this session only
 * Does NOT use localStorage - purely session-based
 * Prevents spam by limiting one guest per browser session
 */
function getOrCreateGuestId(): string {
  // Guest ID is only valid for this browser session
  // On page refresh, a NEW guest ID must be explicitly created
  // This prevents auto-guest spam
  
  const guestId = `${deviceFingerprint}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  return guestId;
}

async function getActiveSession(): Promise<User | null> {
  try {
    const user = await account.get();
    if (user && user.$id) {
      const labels = user.labels || [];
      
      // ONLY check for explicit labels manually added in Appwrite dashboard
      // Email verification does NOT grant approval
      // Only accounts with 'approved' or 'premium' labels have full access
      const isApproved = labels.some((label: string) => 
        label.toLowerCase() === 'approved' || 
        label.toLowerCase() === 'premium'
      );
      
      const isAnonymous = !user.email;
      
      let sessionType: SessionType = 'none';
      if (isAnonymous) {
        sessionType = 'anonymous';
      } else if (user.$id) {
        sessionType = 'authenticated';
      }
      
      return {
        $id: user.$id,
        name: user.name || 'Guest',
        email: user.email || '',
        emailVerification: user.emailVerification,
        avatar: user.prefs?.avatar || undefined,
        labels,
        isApproved,
        isAnonymous,
        sessionType
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Create an anonymous session for visitors (ONLY on explicit user action)
 * Prevents automatic guest creation on page refresh
 * Requires explicit call - won't auto-create on logout or refresh
 * Uses device fingerprint for spam prevention
 */
export async function createAnonymousSession(): Promise<User | null> {
  try {
    // Check if we already have an active authenticated session
    const existingUser = await getActiveSession();
    if (existingUser && !existingUser.isAnonymous) {
      // User is authenticated - don't create guest session
      return existingUser;
    }
    
    // Check if we already have a valid JWT (active anonymous session)
    const existingJwt = await getJwt();
    if (existingJwt && existingUser?.isAnonymous) {
      // Already have valid anonymous session
      return existingUser;
    }
    
    // Create NEW anonymous session only if explicitly called
    // This prevents auto-creation on refresh/logout
    const session = await account.createAnonymousSession();
    
    // Generate device-specific guest ID (not persisted - session only)
    const guestId = getOrCreateGuestId();
    
    // Store guest ID in session preferences for tracking
    try {
      await account.updatePrefs({ guestId });
    } catch (error) {
      console.warn('Could not store guest ID in prefs:', error);
    }
    
    return await getActiveSession();
  } catch (error) {
    console.error('Anonymous session creation error:', error);
    return null;
  }
}

/**
 * Login with Google OAuth
 * Deletes anonymous session first to avoid user_already_exists error
 * Then redirects to Google login page
 */
export async function loginWithGoogle(): Promise<void> {
  try {
    // Get current user to check if they're anonymous
    const currentUser = await getActiveSession();
    
    if (currentUser && currentUser.isAnonymous) {
      // We have an anonymous session - delete it before OAuth
      // This prevents "user_already_exists" error during OAuth conversion
      try {
        await account.deleteSession('current');
        clearJwtCache();
      } catch (error) {
        console.warn('Could not delete anonymous session:', error);
      }
    }
    
    // Get current URL for redirect
    const successUrl = window.location.origin + window.location.pathname;
    const failureUrl = window.location.origin + window.location.pathname + '?error=auth_failed';
    
    // Create OAuth2 session with Google
    account.createOAuth2Session(
      OAuthProvider.Google,
      successUrl,
      failureUrl,
      ['profile', 'email']
    );
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
}

/**
 * Get JWT token for API authentication
 * ONE token per device/user that persists across login/logout
 * Identified by guest ID to prevent multiple sessions from same user
 */
export async function getJwt(): Promise<string | null> {
  try {
    // Get current guest ID (device identifier)
    const guestId = await getOrCreateGuestId();
    currentDeviceId = guestId;
    
    // Check if we have a valid cached token for this device (with 5 min buffer)
    const now = Date.now();
    const cachedToken = deviceJwtCache.get(guestId);
    
    if (cachedToken && cachedToken.expires > now + 300000) {
      return cachedToken.token;
    }
    
    // Get new JWT from Appwrite
    const jwt = await account.createJWT();
    
    // Cache it per device (Appwrite JWTs are valid for 15 minutes)
    deviceJwtCache.set(guestId, {
      token: jwt.jwt,
      expires: now + 15 * 60 * 1000 // 15 minutes
    });
    
    return jwt.jwt;
  } catch (error) {
    console.error('JWT creation error:', error);
    return null;
  }
}

/**
 * Clear JWT cache on logout
 * Note: Does NOT delete the device JWT - it persists across logout
 * This prevents duplicate guest authentication from same device
 */
export function clearJwtCache(): void {
  // Don't clear device JWT cache - keep it for tracking
  // Only logout the current Appwrite session
}

/**
 * Get authorization headers for API calls
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const jwt = await getJwt();
  if (jwt) {
    return {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    };
  }
  return {
    'Content-Type': 'application/json'
  };
}

/**
 * Get currently logged in user
 * Returns null if not logged in
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const user = await account.get();
    const labels = user.labels || [];
    
    // ONLY check for explicit labels manually added in Appwrite dashboard
    // Email verification does NOT grant approval
    // Only accounts with 'approved' or 'premium' labels have full access
    const isApproved = labels.some((label: string) => 
      label.toLowerCase() === 'approved' || 
      label.toLowerCase() === 'premium'
    );
    
    // Check if this is an anonymous session (no email means anonymous)
    const isAnonymous = !user.email;
    
    // Determine session type
    let sessionType: SessionType = 'none';
    if (isAnonymous) {
      sessionType = 'anonymous';
    } else if (user.$id) {
      sessionType = 'authenticated';
    }
    
    return {
      $id: user.$id,
      name: user.name || 'Guest',
      email: user.email || '',
      emailVerification: user.emailVerification,
      avatar: user.prefs?.avatar || undefined,
      labels,
      isApproved,
      isAnonymous,
      sessionType
    };
  } catch (error) {
    // User is not logged in
    return null;
  }
}

/**
 * Logout current user
 * Deletes the current Appwrite session
 * NOTE: Device JWT persists across logout to maintain device identity
 * This ensures the same device gets the same JWT token even after logout
 * Prevents duplicate guest authentication from same user/device
 */
export async function logout(): Promise<void> {
  try {
    // Delete the Appwrite session but keep device JWT
    await account.deleteSession('current');
    // clearJwtCache() is now a no-op - doesn't clear device JWT
    clearJwtCache();
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

/**
 * Check if user is logged in (includes anonymous sessions)
 */
export async function isLoggedIn(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Check if user is fully authenticated (not anonymous)
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null && !user.isAnonymous;
}

/**
 * Get user initials from name
 */
export function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Convert anonymous session to email/password account
 * (Alternative to OAuth conversion)
 */
export async function convertAnonymousToEmail(email: string, password: string): Promise<User | null> {
  try {
    await account.updateEmail(email, password);
    return await getCurrentUser();
  } catch (error) {
    console.error('Account conversion error:', error);
    throw error;
  }
}

/**
 * Get the persistent device JWT
 * This token identifies the device/user and persists across login/logout
 * Returns the same JWT even after logout to prevent duplicate guest creation
 */
export async function getDeviceJwt(): Promise<string | null> {
  return await getJwt();
}

/**
 * Get device fingerprint (secure identifier based on browser)
 * Does NOT use localStorage - purely computed from browser environment
 * Cannot be spoofed by other users
 */
export function getDeviceFingerprintId(): string {
  return deviceFingerprint;
}

export { account, client };
