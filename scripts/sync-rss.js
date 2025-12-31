/**
 * RSS Sync Script for GitHub Actions
 * Fetches news from The Hacker News RSS feed and stores in Appwrite
 * Runs every 15 minutes via GitHub Actions cron
 */

import { Client, Databases, ID, Query } from 'node-appwrite';
import xml2js from 'xml2js';

// Environment variables (set in GitHub Secrets)
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const APPWRITE_COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID;
const RSS_FEED_URL = process.env.RSS_FEED_URL || 'https://feeds.feedburner.com/TheHackersNews?format=xml';

// Validate environment
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_DATABASE_ID || !APPWRITE_COLLECTION_ID) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

// Generate deterministic document ID from article URL
function makeDocId(input) {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;
  h2 = (h2 ^ (h2 >>> 13)) >>> 0;
  return `art_${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

// Categorize article based on content
function categorizeArticle(title, description) {
  const combined = `${title} ${description}`.toLowerCase();
  
  let category = 'general';
  let severity = 'medium';

  // Category detection
  if (combined.includes('cve-') || combined.includes('vulnerability') || combined.includes('exploit')) {
    category = 'cve';
  } else if (combined.includes('breach') || combined.includes('leak') || combined.includes('hack')) {
    category = 'breach';
  } else if (combined.includes('malware') || combined.includes('ransomware') || combined.includes('trojan')) {
    category = 'exploit';
  }

  // Severity scoring
  if (combined.includes('critical') || combined.includes('zero-day') || combined.includes('actively exploited')) {
    severity = 'critical';
  } else if (combined.includes('high') || combined.includes('remote code execution') || combined.includes('rce')) {
    severity = 'high';
  } else if (combined.includes('medium') || combined.includes('vulnerability')) {
    severity = 'medium';
  } else if (combined.includes('low') || combined.includes('minor')) {
    severity = 'low';
  }

  return { category, severity };
}

// Strip HTML tags
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}

// Fetch and parse RSS feed
async function fetchRSS() {
  console.log(`Fetching RSS from: ${RSS_FEED_URL}`);
  
  const response = await fetch(RSS_FEED_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch RSS: ${response.status}`);
  }
  
  const xmlText = await response.text();
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xmlText);
  
  const items = result.rss?.channel?.item || [];
  const articles = [];
  
  for (const item of (Array.isArray(items) ? items : [items])) {
    const title = item.title || 'Untitled';
    const description = stripHtml(item.description || '');
    const link = item.link || '';
    const pubDate = item.pubDate || new Date().toISOString();
    const guid = item.guid?._ || item.guid || link;
    
    const { category, severity } = categorizeArticle(title, description);
    
    articles.push({
      id: guid || link,
      title: title.substring(0, 255),
      description: description.substring(0, 255),
      url: link.substring(0, 255),
      source: 'The Hacker News',
      publishedAt: new Date(pubDate).toISOString(),
      category,
      severity,
      type: 'article'
    });
  }
  
  console.log(`Parsed ${articles.length} articles from RSS`);
  return articles;
}

// Get existing article IDs from Appwrite
async function getExistingIds() {
  const existingIds = new Set();
  let offset = 0;
  const limit = 100;
  
  while (true) {
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_ID,
      [
        Query.equal('type', 'article'),
        Query.limit(limit),
        Query.offset(offset)
      ]
    );
    
    for (const doc of response.documents) {
      existingIds.add(doc.$id);
    }
    
    if (response.documents.length < limit) break;
    offset += limit;
  }
  
  console.log(`Found ${existingIds.size} existing articles in database`);
  return existingIds;
}

// Store new articles in Appwrite
async function storeArticles(articles, existingIds) {
  let created = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const article of articles) {
    const docId = makeDocId(article.id);
    
    if (existingIds.has(docId)) {
      skipped++;
      continue;
    }
    
    try {
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID,
        docId,
        {
          title: article.title,
          description: article.description,
          url: article.url,
          source: article.source,
          publishedAt: article.publishedAt,
          category: article.category,
          severity: article.severity,
          type: article.type
        }
      );
      created++;
      console.log(`Created: ${article.title.substring(0, 50)}...`);
    } catch (err) {
      if (err.code === 409) {
        // Document already exists (race condition)
        skipped++;
      } else {
        failed++;
        console.error(`Failed to create article: ${err.message}`);
      }
    }
  }
  
  return { created, skipped, failed };
}

// Main execution
async function main() {
  console.log('Starting RSS sync...');
  console.log(`Time: ${new Date().toISOString()}`);
  
  try {
    // 1. Fetch RSS feed
    const articles = await fetchRSS();
    
    if (articles.length === 0) {
      console.log('No articles found in RSS feed');
      return;
    }
    
    // 2. Get existing article IDs
    const existingIds = await getExistingIds();
    
    // 3. Store new articles
    const result = await storeArticles(articles, existingIds);
    
    console.log('\nSync Summary:');
    console.log(`   Created: ${result.created}`);
    console.log(`   Skipped: ${result.skipped}`);
    console.log(`   Failed: ${result.failed}`);
    console.log('\nRSS sync complete!');
    
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

main();
