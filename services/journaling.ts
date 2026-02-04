/**
 * Journaling.tech API Service
 * Fetches journaling stats from the public profile API
 * 
 * NOTE: The API doesn't support CORS for browser requests.
 * Attempting direct fetch - falls back to hardcoded values on CORS error.
 */

import { logger } from './logger';

export interface JournalingStats {
  totalEntries: number;
  currentStreak: number;
  bestStreak: number;
}

const JOURNALING_API_URL = import.meta.env.VITE_JOURNALING_API_URL || 'https://journaling.tech/api/profile/R1yZy43hBqYvmroEgH0tHpIsqGU2';
const JOURNALING_PROFILE_URL = import.meta.env.VITE_JOURNALING_PROFILE_URL || 'https://app.journaling.tech/u/Cyb3rWo9f';

/**
 * Fetch journaling stats from the public profile API
 */
export async function fetchJournalingStats(): Promise<JournalingStats> {
  try {
    logger.log('Fetching journaling stats from API:', JOURNALING_API_URL);
    
    const response = await fetch(JOURNALING_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    logger.log('Response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      logger.log('Journaling API response:', data);
      
      const stats = {
        totalEntries: data.totalEntries || 0,
        currentStreak: data.currentStreak || 0,
        bestStreak: data.longestStreak || 0,
      };
      
      logger.log('Final journaling stats:', stats);
      return stats;
    }
  } catch (error) {
    logger.log('Direct API fetch failed (CORS):', error);
  }
  
  // Fallback: return hardcoded cached values
  logger.log('Using cached journaling stats');
  return {
    totalEntries: 1,
    currentStreak: 1,
    bestStreak: 1,
  };
}
