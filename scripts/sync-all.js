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
        description: description.slice(0, 500),
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
        try {
          await databases.updateDocument(dbId, collId, docId, data);
          updated++;
        } catch (err) {
          if (err.code === 404) {
            await databases.createDocument(dbId, collId, docId, data);
            created++;
          } else throw err;
        }
      } catch (err) {
        errors++;
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
      tier: null,
      points: null,
      badges,
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
  const { username, apiToken } = config.platforms.hackthebox;
  if (!username) {
    log('HTB', 'No HTB username provided - skipping (set HTB_USERNAME secret)', 'warn');
    return { success: false, skipped: true };
  }
  if (!apiToken) {
    log('HTB', 'No API token provided - skipping (set HTB_API_TOKEN secret)', 'warn');
    return { success: false, skipped: true };
  }

  log('HTB', `Fetching stats for ${username}...`);
  
  try {
    // HTB API v4 - use labs API endpoint
    const profileRes = await fetchJson('https://labs.hackthebox.com/api/v4/profile', {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: 'application/json',
      },
    });

    const info = profileRes.profile || profileRes.info || profileRes;
    const rank = info.ranking || info.rank || 0;
    const pwned = (info.user_owns || 0) + (info.system_owns || 0) + (info.user_bloods || 0) + (info.system_bloods || 0);
    const points = info.points || 0;
    const tier = info.rank_name || info.rank || 'Noob';

    const payload = {
      platform: 'hackthebox',
      username: info.name || username,
      rank,
      pwned,
      percentile: tier, // HTB uses tier names instead of percentile
      tier,
      points,
      badges: [],
      badgeCount: 0,
      profileUrl: `https://app.hackthebox.com/profile/${info.id || username}`,
      updatedAt: new Date().toISOString(),
    };

    const status = await upsertPlatformDoc('hackthebox', payload);
    log('HTB', `${status}: rank=#${rank}, pwned=${pwned}, tier=${tier}`, 'success');
    return { success: true, rank, pwned };
    
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
      points: null,
      badges: [],
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
