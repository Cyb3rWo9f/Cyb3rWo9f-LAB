import { Client, Databases, Query } from 'appwrite';

/**
 * Generic platform stats structure (same columns for all platforms)
 */
export interface PlatformStats {
  platform: string; // tryhackme | hackthebox | offsec
  username?: string;
  rank?: number;
  pwned?: number; // rooms/machines owned
  percentile?: string; // TOP 1%, PRO HACKER, etc.
  tier?: string; // tier/level (optional)
  points?: number;
  badges?: string[];
  badgeCount?: number;
  profileUrl?: string;
  updatedAt?: string;
}

const endpoint = (import.meta as any)?.env?.VITE_APPWRITE_ENDPOINT;
const projectId = (import.meta as any)?.env?.VITE_APPWRITE_PROJECT_ID;
const databaseId = (import.meta as any)?.env?.VITE_APPWRITE_DATABASE_ID;
const collectionId = (import.meta as any)?.env?.VITE_APPWRITE_PLATFORM_COLLECTION_ID;

const client = new Client();
if (endpoint && projectId) {
  client.setEndpoint(endpoint).setProject(projectId);
}

const databases = new Databases(client);

/**
 * Fetch stats for a specific platform by document ID
 */
export async function fetchPlatformStats(platformId: string): Promise<PlatformStats | null> {
  if (!endpoint || !projectId || !databaseId || !collectionId) {
    return null;
  }

  try {
    const doc = await databases.getDocument(databaseId, collectionId, platformId);
    return {
      platform: doc.platform ?? platformId,
      username: doc.username,
      rank: doc.rank,
      pwned: doc.pwned,
      percentile: doc.percentile,
      tier: doc.tier,
      points: doc.points,
      badges: doc.badges,
      badgeCount: doc.badgeCount,
      profileUrl: doc.profileUrl,
      updatedAt: doc.updatedAt ?? doc.$updatedAt,
    };
  } catch (error) {
    console.warn(`[PlatformStatsClient] Failed to fetch ${platformId}`, error);
    return null;
  }
}

/**
 * Fetch all platform stats from collection
 */
export async function fetchAllPlatformStats(): Promise<PlatformStats[]> {
  if (!endpoint || !projectId || !databaseId || !collectionId) {
    return [];
  }

  try {
    const res = await databases.listDocuments(databaseId, collectionId, [Query.limit(10)]);
    return res.documents.map((doc) => ({
      platform: doc.platform ?? doc.$id,
      username: doc.username,
      rank: doc.rank,
      pwned: doc.pwned,
      percentile: doc.percentile,
      tier: doc.tier,
      points: doc.points,
      badges: doc.badges,
      badgeCount: doc.badgeCount,
      profileUrl: doc.profileUrl,
      updatedAt: doc.updatedAt ?? doc.$updatedAt,
    }));
  } catch (error) {
    console.warn('[PlatformStatsClient] Failed to fetch all stats', error);
    return [];
  }
}
