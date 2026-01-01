import { useEffect } from 'react';
import { injectSpeedInsights } from '@vercel/speed-insights';

/**
 * Hook to inject Vercel Speed Insights tracking script
 * Should be called once in your app, on the client side
 */
export function useSpeedInsights() {
  useEffect(() => {
    // Only run this on the client side
    if (typeof window !== 'undefined') {
      injectSpeedInsights();
    }
  }, []);
}
