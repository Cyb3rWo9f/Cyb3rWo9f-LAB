/**
 * Authentication Service using Appwrite OAuth
 * Handles Google OAuth login/logout and session management
 */

import { Client, Account, OAuthProvider } from 'appwrite';

// Initialize Appwrite client
const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');

// Initialize Account service
const account = new Account(client);

// User type
export interface User {
  $id: string;
  name: string;
  email: string;
  avatar?: string;
  emailVerification: boolean;
  labels: string[];
  isApproved: boolean;
}

/**
 * Login with Google OAuth
 * Redirects to Google login page
 */
export async function loginWithGoogle(): Promise<void> {
  try {
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
 * Get currently logged in user
 * Returns null if not logged in
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const user = await account.get();
    const labels = user.labels || [];
    // Check if user has 'approved' label (case-insensitive)
    const isApproved = labels.some((label: string) => 
      label.toLowerCase() === 'approved' || 
      label.toLowerCase() === 'premium' ||
      label.toLowerCase() === 'verified'
    );
    
    return {
      $id: user.$id,
      name: user.name,
      email: user.email,
      emailVerification: user.emailVerification,
      avatar: user.prefs?.avatar || undefined,
      labels,
      isApproved
    };
  } catch (error) {
    // User is not logged in
    return null;
  }
}

/**
 * Logout current user
 * Deletes the current session
 */
export async function logout(): Promise<void> {
  try {
    await account.deleteSession('current');
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
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

export { account, client };
