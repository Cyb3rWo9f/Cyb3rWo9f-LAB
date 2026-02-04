#!/usr/bin/env node
/**
 * Unified Sync Script for GitHub Actions
 * 
 * Syncs all data sources to Appwrite in one run:
 * 1. RSS News Feed (The Hacker News)
 * 2. TryHackMe Stats
 * 3. HackTheBox Stats (if API token provided)
 * 4. OffSec PG Stats (manual/static for now)
 * 
 * Runs every 15 minutes via GitHub Actions
 */

import { Client, Databases, ID, Query } from 'node-appwrite';
import xml2js from 'xml2js';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const config = {
  appwrite: {
    endpoint: process.env.APPWRITE_ENDPOINT,
    projectId: process.env.APPWRITE_PROJECT_ID,
    apiKey: process.env.APPWRITE_API_KEY,
    databaseId: process.env.APPWRITE_DATABASE_ID,
    newsCollectionId: process.env.APPWRITE_COLLECTION_ID || 'articles',
    platformCollectionId: process.env.APPWRITE_PLATFORM_COLLECTION_ID || 'platform_stats',
  },
  rss: {
    feedUrl: process.env.RSS_FEED_URL || 'https://feeds.feedburner.com/TheHackersNews?format=xml',
  },
  platforms: {
    tryhackme: {
      username: process.env.THM_USERNAME || '',
      totalUsers: Number(process.env.THM_TOTAL_USERS || '3000000'),
    },
    hackthebox: {
      username: process.env.HTB_USERNAME || '',
      userId: process.env.HTB_USER_ID || '', // Numeric user ID (e.g., 2238318)
      apiToken: process.env.HTB_API_TOKEN || '',
    },
    offsec: {
      username: process.env.OFFSEC_USERNAME || '',
      rank: Number(process.env.OFFSEC_RANK || '0'),
      pwned: Number(process.env.OFFSEC_PWNED || '0'),
      percentile: process.env.OFFSEC_PERCENTILE || 'ELITE',
    },
  },
};

// Validate required env vars
const required = ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT_ID', 'APPWRITE_API_KEY', 'APPWRITE_DATABASE_ID'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

// Initialize Appwrite
const client = new Client()
  .setEndpoint(config.appwrite.endpoint)
  .setProject(config.appwrite.projectId)
  .setKey(config.appwrite.apiKey);

const databases = new Databases(client);

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function log(section, message, type = 'info') {
  const icons = { info: '→', success: '✓', error: '✗', warn: '⚠' };
  console.log(`[${section}] ${icons[type] || '→'} ${message}`);
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, ...options });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

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
  return `art_${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, '').trim();
}

function calculatePercentile(rank, total) {
  if (!rank || rank <= 0) return 'N/A';
  const pct = (rank / total) * 100;
  if (pct <= 1) return 'TOP 1%';
  if (pct <= 5) return 'TOP 5%';
  if (pct <= 10) return 'TOP 10%';
  if (pct <= 25) return 'TOP 25%';
  return `TOP ${Math.round(pct)}%`;
}

async function upsertPlatformDoc(docId, data) {
  const collId = config.appwrite.platformCollectionId;
  const dbId = config.appwrite.databaseId;
  
  try {
    await databases.updateDocument(dbId, collId, docId, data);
    return 'updated';
  } catch (err) {
    if (err.code === 404) {
      await databases.createDocument(dbId, collId, docId, data);
      return 'created';
    }
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
// RSS NEWS SYNC
// ═══════════════════════════════════════════════════════════════

function categorizeArticle(title, description) {
  const combined = `${title} ${description}`.toLowerCase();
  
  let category = 'general';
  let severity = 'medium';

  if (combined.includes('cve-') || combined.includes('vulnerability') || combined.includes('exploit')) {
    category = 'cve';
  } else if (combined.includes('breach') || combined.includes('leak') || combined.includes('hack')) {
    category = 'breach';
  } else if (combined.includes('malware') || combined.includes('ransomware') || combined.includes('trojan')) {
    category = 'exploit';
  }

  if (combined.includes('critical') || combined.includes('zero-day') || combined.includes('actively exploited')) {
    severity = 'critical';
  } else if (combined.includes('high') || combined.includes('remote code execution') || combined.includes('rce')) {
    severity = 'high';
  } else if (combined.includes('low') || combined.includes('minor')) {
    severity = 'low';
  }

  return { category, severity };
}

async function syncRSS() {
  log('RSS', 'Fetching news feed...');
  
  try {
    const response = await fetch(config.rss.feedUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xmlText = await response.text();
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlText);
    
    const items = result.rss?.channel?.item || [];
    const articles = [];
    
    for (const item of (Array.isArray(items) ? items : [items])) {
      const title = item.title || 'Untitled';
      const description = stripHtml(item.description || '');
      const link = item.link || '';
      const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
      
      if (!link) continue;
      
      const { category, severity } = categorizeArticle(title, description);
      
      articles.push({
        docId: makeDocId(link),
        title: title.slice(0, 255),
        description: description.slice(0, 255),
        url: link.slice(0, 255),
        source: 'The Hacker News',
        publishedAt: pubDate,
        category,
        severity,
        type: 'article',
      });
    }

    log('RSS', `Parsed ${articles.length} articles`);

    // Upsert articles
    let created = 0, updated = 0, errors = 0;
    const dbId = config.appwrite.databaseId;
    const collId = config.appwrite.newsCollectionId;

    for (const article of articles) {
      try {
        const { docId, ...data } = article;
        
        // Try update first (most common case for existing articles)
        try {
          await databases.updateDocument(dbId, collId, docId, data);
          updated++;
        } catch (updateErr) {
          // If document doesn't exist (404), create it
          if (updateErr.code === 404) {
            try {
              await databases.createDocument(dbId, collId, docId, data);
              created++;
            } catch (createErr) {
              // If already exists (409/race condition), count as updated
              if (createErr.code === 409 || createErr.message?.includes('already exists')) {
                updated++;
              } else {
                throw createErr;
              }
            }
          } else {
            throw updateErr;
          }
        }
      } catch (err) {
        errors++;
        // Log first few errors for debugging
        if (errors <= 3) {
          log('RSS', `Error on "${article.title.slice(0, 30)}...": ${err.message}`, 'error');
        }
      }
    }

    log('RSS', `Done: ${created} created, ${updated} updated, ${errors} errors`, 'success');
    return { success: true, created, updated, errors };
    
  } catch (err) {
    log('RSS', `Failed: ${err.message}`, 'error');
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// TRYHACKME SYNC
// ═══════════════════════════════════════════════════════════════

async function syncTryHackMe() {
  const { username, totalUsers } = config.platforms.tryhackme;
  if (!username) {
    log('THM', 'No THM username provided - skipping (set THM_USERNAME secret)', 'warn');
    return { success: false, skipped: true };
  }
  log('THM', `Fetching stats for ${username}...`);
  
  try {
    const [rankData, roomsData, badgesData] = await Promise.all([
      fetchJson(`https://tryhackme.com/api/user/rank/${username}`),
      fetchJson(`https://tryhackme.com/api/no-completed-rooms-public/${username}`),
      fetchJson(`https://tryhackme.com/api/badges/get/${username}`).catch(() => []),
    ]);

    const rank = Number(rankData.userRank || 0);
    const pwned = typeof roomsData === 'number' ? roomsData : Number(roomsData) || 0;
    const badges = Array.isArray(badgesData) ? badgesData.map((b) => b?.name || 'badge') : [];

    const payload = {
      platform: 'tryhackme',
      username,
      rank,
      pwned,
      percentile: calculatePercentile(rank, totalUsers),
      tier: '',
      points: 0,
      badges: JSON.stringify(badges),
      badgeCount: badges.length,
      profileUrl: `https://tryhackme.com/p/${username}`,
      updatedAt: new Date().toISOString(),
    };

    const status = await upsertPlatformDoc('tryhackme', payload);
    log('THM', `${status}: rank=#${rank}, rooms=${pwned}, badges=${badges.length}`, 'success');
    return { success: true, rank, pwned };
    
  } catch (err) {
    log('THM', `Failed: ${err.message}`, 'error');
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// HACKTHEBOX SYNC
// ═══════════════════════════════════════════════════════════════

async function syncHackTheBox() {
  const { username, userId, apiToken } = config.platforms.hackthebox;
  
  // HTB requires either username or userId
  if (!username && !userId) {
    log('HTB', 'No HTB username/userId provided - skipping (set HTB_USERNAME or HTB_USER_ID)', 'warn');
    return { success: false, skipped: true };
  }
  if (!apiToken) {
    log('HTB', 'No API token provided - skipping (set HTB_API_TOKEN secret)', 'warn');
    return { success: false, skipped: true };
  }

  const identifier = userId || username;
  log('HTB', `Fetching stats for ${identifier}...`);
  
  try {
    // HTB API v4 - primary endpoint for user profile
    // If we have a userId, use the profile endpoint directly
    const profileUrl = userId 
      ? `https://labs.hackthebox.com/api/v4/profile/${userId}`
      : `https://labs.hackthebox.com/api/v4/user/info`;
    
    const headers = {
      Authorization: `Bearer ${apiToken}`,
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; CyberLab/1.0)',
    };

    let info = null;
    let usedEndpoint = '';

    // Try primary endpoint first
    try {
      const res = await fetch(profileUrl, { headers });
      if (res.ok) {
        const data = await res.json();
        // HTB API returns { profile: {...} } or { info: {...} } or direct object
        info = data.profile || data.info || data.data || data;
        usedEndpoint = profileUrl;
        log('HTB', `API response keys: ${Object.keys(info).join(', ')}`, 'info');
      } else {
        log('HTB', `Primary endpoint failed: HTTP ${res.status}`, 'warn');
      }
    } catch (e) {
      log('HTB', `Primary endpoint error: ${e.message}`, 'warn');
    }

    // Fallback endpoints if primary failed
    if (!info) {
      const fallbackEndpoints = [
        'https://www.hackthebox.com/api/v4/profile/info',
        'https://app.hackthebox.com/api/v4/profile',
        'https://labs.hackthebox.com/api/v4/user/info',
      ];

      for (const endpoint of fallbackEndpoints) {
        try {
          const res = await fetch(endpoint, { headers });
          if (res.ok) {
            const data = await res.json();
            info = data.profile || data.info || data.data || data;
            usedEndpoint = endpoint;
            log('HTB', `Fallback endpoint worked: ${endpoint}`, 'info');
            break;
          }
        } catch (e) {
          // Try next endpoint
        }
      }
    }

    if (!info) {
      throw new Error('All HTB API endpoints failed - check your API token');
    }

    log('HTB', `Using endpoint: ${usedEndpoint}`, 'info');

    // Parse HTB response - handle different API response structures
    // Common fields across different HTB API versions
    const rank = Number(info.ranking || info.rank || info.global_ranking || info.current_rank_position || 0);
    
    // Pwned machines count - try multiple possible field names
    const userOwns = Number(info.user_owns || info.user_owns_count || 0);
    const systemOwns = Number(info.system_owns || info.system_owns_count || 0);
    const challengeOwns = Number(info.challenge_owns || info.challenges_owned || 0);
    const pwned = userOwns + systemOwns + challengeOwns;
    
    const points = Number(info.points || info.score || 0);
    
    // Rank tier name - HTB uses names like "Hacker", "Pro Hacker", "Elite Hacker", etc.
    const tier = info.rank || info.rank_name || info.current_rank || info.rankName || 'Noob';
    
    // Username from response or fallback
    const htbUsername = info.name || info.username || info.user_name || username || 'Unknown';
    
    // User ID for profile URL
    const htbUserId = info.id || info.user_id || userId || '';

    const payload = {
      platform: 'hackthebox',
      username: htbUsername,
      rank,
      pwned,
      percentile: tier, // HTB uses tier names instead of percentile
      tier,
      points,
      badges: '[]',
      badgeCount: 0,
      profileUrl: htbUserId ? `https://app.hackthebox.com/profile/${htbUserId}` : `https://app.hackthebox.com/users/${htbUsername}`,
      updatedAt: new Date().toISOString(),
    };

    const status = await upsertPlatformDoc('hackthebox', payload);
    log('HTB', `${status}: rank=#${rank}, pwned=${pwned}, points=${points}, tier=${tier}`, 'success');
    return { success: true, rank, pwned, points };
    
  } catch (err) {
    log('HTB', `Failed: ${err.message}`, 'error');
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// OFFSEC PROVING GROUNDS SYNC
// ═══════════════════════════════════════════════════════════════

async function syncOffSec() {
  const { username, rank, pwned, percentile } = config.platforms.offsec;
  
  if (!username) {
    log('OFFSEC', 'No OffSec username provided - skipping (set OFFSEC_USERNAME)', 'warn');
    return { success: false, skipped: true };
  }
  // OffSec doesn't have a public API - use env vars for manual updates
  if (rank === 0 && pwned === 0) {
    log('OFFSEC', 'No stats configured - skipping (set OFFSEC_RANK, OFFSEC_PWNED)', 'warn');
    return { success: false, skipped: true };
  }

  log('OFFSEC', `Syncing configured stats for ${username}...`);
  
  try {
    const payload = {
      platform: 'offsec',
      username,
      rank,
      pwned,
      percentile,
      tier: percentile,
      points: 0,
      badges: '[]',
      badgeCount: 0,
      profileUrl: 'https://portal.offsec.com',
      updatedAt: new Date().toISOString(),
    };

    const status = await upsertPlatformDoc('offsec', payload);
    log('OFFSEC', `${status}: rank=#${rank}, pwned=${pwned}`, 'success');
    return { success: true, rank, pwned };
    
  } catch (err) {
    log('OFFSEC', `Failed: ${err.message}`, 'error');
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║           CYBERLAB CONTENT & PLATFORM SYNC                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`⏱  Started at ${new Date().toISOString()}\n`);

  const results = {};

  // 1. Sync RSS News
  console.log('─────────────────────────────────────────────────────────────');
  console.log('📰 RSS NEWS SYNC');
  console.log('─────────────────────────────────────────────────────────────');
  results.rss = await syncRSS();

  // 2. Sync TryHackMe
  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('🔴 TRYHACKME SYNC');
  console.log('─────────────────────────────────────────────────────────────');
  results.tryhackme = await syncTryHackMe();

  // 3. Sync HackTheBox
  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('🟢 HACKTHEBOX SYNC');
  console.log('─────────────────────────────────────────────────────────────');
  results.hackthebox = await syncHackTheBox();

  // 4. Sync OffSec
  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('🟠 OFFSEC PG SYNC');
  console.log('─────────────────────────────────────────────────────────────');
  results.offsec = await syncOffSec();

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 SYNC SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  
  const summary = Object.entries(results).map(([key, val]) => {
    const status = val.success ? '✓' : val.skipped ? '⊘' : '✗';
    return `  ${status} ${key.toUpperCase()}`;
  });
  console.log(summary.join('\n'));
  console.log(`\n⏱  Completed at ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Exit with error if all syncs failed
  const anySuccess = Object.values(results).some((r) => r.success);
  if (!anySuccess) {
    console.error('All syncs failed!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
