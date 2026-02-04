/**
 * Production-safe logger
 * Only logs in development mode (when not on production domain)
 */

const isDev = typeof window !== 'undefined' 
  ? !window.location.hostname.includes('cyb3rwo9f.me') && !window.location.hostname.includes('vercel.app')
  : process.env.NODE_ENV !== 'production';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
};

export default logger;
