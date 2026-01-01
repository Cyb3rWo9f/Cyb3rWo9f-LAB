/**
 * Platform Stats Utilities
 * 
 * NOTE: All platform API fetching is now done server-side via GitHub Actions workflow.
 * The client only reads from Appwrite DB (see platformStatsClient.ts).
 * This file contains utility functions for formatting/display only.
 */

// Format rank for display (e.g., 1204 -> "#1,204")
export function formatRank(rank: number | string): string {
  if (typeof rank === 'string') return rank;
  if (rank === 0) return 'N/A';
  return `#${rank.toLocaleString()}`;
}

// Calculate percentile based on rank and total users
export function calculatePercentile(rank: number, totalUsers: number = 3000000): string {
  if (rank === 0) return 'N/A';
  const percentile = (rank / totalUsers) * 100;
  if (percentile <= 1) return 'TOP 1%';
  if (percentile <= 5) return 'TOP 5%';
  if (percentile <= 10) return 'TOP 10%';
  if (percentile <= 25) return 'TOP 25%';
  return `TOP ${Math.round(percentile)}%`;
}

// Get rank tier label
export function getRankTier(rank: number): string {
  if (rank === 0) return 'ROOKIE';
  if (rank <= 100) return 'ELITE';
  if (rank <= 1000) return 'PRO';
  if (rank <= 5000) return 'HACKER';
  if (rank <= 10000) return 'SCRIPT KIDDIE';
  return 'NOOB';
}
