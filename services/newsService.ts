import { getDocuments } from './appwrite';

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

// Using free The Hacker News RSS feed - no authentication required
const HACKERNEWS_RSS_FEED = import.meta.env.VITE_RSS_FEED_URL || 'https://feeds.feedburner.com/TheHackersNews?format=xml';
// Better CORS proxies - ordered by reliability
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

// Minimal fallback data only when API is completely unavailable
const FALLBACK_NEWS: NewsArticle[] = [
  {
    id: 'fallback-1',
    title: 'Feed Unavailable - Please check connection',
    description: 'Unable to fetch live news from The Hacker News RSS feed. This may be due to network issues.',
    url: 'https://thehackernews.com/',
    source: 'System',
    publishedAt: new Date().toISOString(),
    category: 'general',
    severity: 'low'
  }
];

// In-memory cache to avoid hitting Appwrite on every refresh within a short window
let memoryCache: { articles: NewsArticle[]; timestamp: number } | null = null;
const MEMORY_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

function makeDocId(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;
  h2 = (h2 ^ (h2 >>> 13)) >>> 0;
  const hex = h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
  return hex.slice(0, 24);
}

// Categorize news articles based on keywords
function categorizeNews(title: string, description: string): { category: 'exploit' | 'cve' | 'breach' | 'general'; severity: 'critical' | 'high' | 'medium' | 'low' } {
  const combined = (title + ' ' + description).toLowerCase();
  let category: 'exploit' | 'cve' | 'breach' | 'general' = 'general';
  let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';

  // Categorize
  if (combined.includes('exploit') || combined.includes('pwn') || combined.includes('rce')) {
    category = 'exploit';
  } else if (combined.includes('cve-') || combined.includes('vulnerability')) {
    category = 'cve';
  } else if (combined.includes('breach') || combined.includes('data leak') || combined.includes('ransomware')) {
    category = 'breach';
  }

  // Severity scoring
  if (combined.includes('critical') || combined.includes('cvss 9') || combined.includes('zero-day') ||
      combined.includes('actively exploited') || combined.includes('zero day')) {
    severity = 'critical';
  } else if (combined.includes('high') || combined.includes('cvss 7') || combined.includes('cvss 8')) {
    severity = 'high';
  } else if (combined.includes('medium') || combined.includes('vulnerability') ||
             combined.includes('cvss 4') || combined.includes('cvss 5') ||
             combined.includes('cvss 6')) {
    severity = 'medium';
  } else if (combined.includes('low')) {
    severity = 'low';
  }

  return { category, severity };
}

// NOTE: storeNewsInAppwrite function removed for security
// Write operations should be done via Appwrite Console or a secure backend

// Fetch news from The Hacker News RSS feed (kept for reference, but not used for storage)
async function fetchHackerNewsRSS(): Promise<NewsArticle[]> {
  try {
    console.log('Fetching The Hacker News RSS feed...');
    let lastError: unknown = null;
    let xmlText = '';

    // Try proxies sequentially with per-proxy timeout
    for (const makeUrl of CORS_PROXIES) {
      const proxyUrl = makeUrl(HACKERNEWS_RSS_FEED);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) {
          lastError = new Error(`Failed to fetch RSS feed: ${response.status}`);
          continue;
        }
        xmlText = await response.text();
        lastError = null;
        break;
      } catch (err) {
        clearTimeout(timeout);
        lastError = err;
      }
    }

    if (lastError) {
      throw lastError;
    }
    
    console.log('Fetched RSS feed successfully');
    
    // Parse XML manually (simple parser for RSS)
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const items = xmlDoc.querySelectorAll('item');
    console.log(`Found ${items.length} news items`);
    
    const articles: NewsArticle[] = [];
    
    items.forEach((item) => {
      const title = item.querySelector('title')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const guid = item.querySelector('guid')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      
      // Extract description from CDATA
      let description = '';
      const descElement = item.querySelector('description');
      if (descElement) {
        description = descElement.textContent || '';
        // Clean up CDATA wrapper if present
        description = description.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '').trim();
        // Remove HTML tags and limit length
        description = description.replace(/<[^>]*>/g, '').substring(0, 300);
      }
      
      if (!title || !link) return;
      
      const { category, severity } = categorizeNews(title, description);
      
      articles.push({
        id: guid || link,
        title,
        description: description || title,
        url: link,
        source: 'The Hacker News',
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        category,
        severity
      });
    });
    
    console.log(`Processed ${articles.length} articles`);
    return articles.slice(0, 50); // Return top 50
  } catch (error) {
    console.error('Failed to fetch The Hacker News RSS:', error);
    throw error;
  }
}

// Main export function - fetches news with Appwrite caching
export async function fetchCybersecurityNews(): Promise<NewsArticle[]> {
  try {
    console.log('Starting cybersecurity news fetch from Appwrite (no RSS fallback)...');

    // Fast path: serve from in-memory cache if still fresh
    if (memoryCache && Date.now() - memoryCache.timestamp < MEMORY_CACHE_DURATION && memoryCache.articles.length > 0) {
      console.log(`⚡ Served from memory cache (${memoryCache.articles.length} articles)`);
      return memoryCache.articles;
    }
    
    // Clear old cache before fetching fresh data
    memoryCache = null;
    
    // Fetch articles from Appwrite only
    const cachedDocs = await getDocuments();
    console.log(`Retrieved ${cachedDocs.length} total documents from Appwrite`);
    
    const articles = cachedDocs
      .filter((doc: any) => {
        const hasType = doc.type === 'article';
        if (!hasType) console.log(`Filtered out non-article doc: type=${doc.type}, id=${doc.$id || doc.id}`);
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

    console.log(`After filtering: ${articles.length} articles (from ${cachedDocs.length} total docs)`);

    if (articles.length > 0) {
      console.log(`✓ Using Appwrite articles (${articles.length})`);
      memoryCache = { articles, timestamp: Date.now() };
      return articles;
    }

    console.warn('No articles found in Appwrite; returning fallback content only');
    return FALLBACK_NEWS;
  } catch (error) {
    console.error('Error fetching cybersecurity news:', error);
    return FALLBACK_NEWS;
  }
}

// Manual refresh function for UI button
export async function refreshNews(): Promise<NewsArticle[]> {
  try {
    console.log('🔄 Manual refresh triggered - reloading from database...');
    
    // Clear memory cache to ensure we get fresh data from Appwrite
    memoryCache = null;
    
    // Reuse the main fetch logic which prioritizes Appwrite
    // This ensures we display what is in the database rather than fetching new RSS data
    return await fetchCybersecurityNews();
  } catch (error) {
    console.error('Error refreshing news:', error);
    
    // Return cached articles if available
    if (memoryCache && memoryCache.articles.length > 0) {
      return memoryCache.articles;
    }
    
    return FALLBACK_NEWS;
  }
}

// Background sync - DISABLED for security (no write operations in frontend)
// To add new articles, use Appwrite Console or a separate admin script
export async function syncBackgroundNews(): Promise<NewsArticle[] | null> {
  console.log('⚠️ Background sync is disabled for security. Articles should be added via Appwrite Console.');
  return null;
}

// 
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
