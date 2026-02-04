import { getDocuments } from './appwrite';
import { logger } from './logger';

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  category: 'exploit' | 'cve' | 'breach' | 'general';
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

// Fallback data when Appwrite is unavailable
const FALLBACK_NEWS: NewsArticle[] = [
  {
    id: 'fallback-1',
    title: 'Feed Unavailable - Please check connection',
    description: 'Unable to fetch news from database. This may be due to network issues.',
    url: 'https://thehackernews.com/',
    source: 'System',
    publishedAt: new Date().toISOString(),
    category: 'general',
    severity: 'low'
  }
];

// In-memory cache to avoid hitting Appwrite on every refresh
let memoryCache: { articles: NewsArticle[]; timestamp: number } | null = null;
const MEMORY_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Main export function - fetches news from Appwrite
export async function fetchCybersecurityNews(): Promise<NewsArticle[]> {
  try {
    logger.log('Fetching news from Appwrite...');

    // Fast path: serve from in-memory cache if still fresh
    if (memoryCache && Date.now() - memoryCache.timestamp < MEMORY_CACHE_DURATION && memoryCache.articles.length > 0) {
      logger.log(`⚡ Served from memory cache (${memoryCache.articles.length} articles)`);
      return memoryCache.articles;
    }
    
    // Clear old cache before fetching fresh data
    memoryCache = null;
    
    // Fetch articles from Appwrite only
    const cachedDocs = await getDocuments();
    logger.log(`Retrieved ${cachedDocs.length} total documents from Appwrite`);
    
    const articles = cachedDocs
      .filter((doc: any) => {
        const hasType = doc.type === 'article';
        if (!hasType) logger.log(`Filtered out non-article doc: type=${doc.type}, id=${doc.$id || doc.id}`);
        return hasType;
      })
      .map((doc: any) => ({
        id: doc.$id || doc.id,
        title: doc.title,
        description: doc.description,
        url: doc.url,
        source: doc.source,
        publishedAt: doc.publishedAt,
        category: doc.category,
        severity: doc.severity
      }))
      // Sort by publishedAt descending (newest first)
      .sort((a: any, b: any) => {
        const dateA = new Date(a.publishedAt).getTime();
        const dateB = new Date(b.publishedAt).getTime();
        return dateB - dateA;
      }) as NewsArticle[];

    logger.log(`After filtering: ${articles.length} articles (from ${cachedDocs.length} total docs)`);

    if (articles.length > 0) {
      logger.log(`Using Appwrite articles (${articles.length})`);
      memoryCache = { articles, timestamp: Date.now() };
      return articles;
    }

    logger.warn('No articles found in Appwrite; returning fallback content only');
    return FALLBACK_NEWS;
  } catch (error) {
    logger.error('Error fetching cybersecurity news:', error);
    return FALLBACK_NEWS;
  }
}

// Manual refresh function for UI button
export async function refreshNews(): Promise<NewsArticle[]> {
  try {
    logger.log('Manual refresh triggered - reloading from database...');
    
    // Clear memory cache to ensure we get fresh data from Appwrite
    memoryCache = null;
    
    // Reuse the main fetch logic which prioritizes Appwrite
    // This ensures we display what is in the database rather than fetching new RSS data
    return await fetchCybersecurityNews();
  } catch (error) {
    logger.error('Error refreshing news:', error);
    
    // Return cached articles if available
    if (memoryCache && memoryCache.articles.length > 0) {
      return memoryCache.articles;
    }
    
    return FALLBACK_NEWS;
  }
}

// Format date for display (e.g., "2h ago", "3d ago")
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
