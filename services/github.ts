/**
 * GitHub API Service
 * Fetches real language statistics from user's public repositories
 * No authentication needed for public repos
 */

// Load from environment variables (set in .env file)
const GITHUB_API_BASE = import.meta.env.VITE_GITHUB_API_BASE;
const GITHUB_USERNAME = import.meta.env.VITE_GITHUB_USERNAME;

// Language color mapping (official GitHub colors)
const LANGUAGE_COLORS: Record<string, string> = {
  'Python': 'from-blue-500 to-blue-600',
  'TypeScript': 'from-blue-600 to-blue-700',
  'JavaScript': 'from-yellow-500 to-yellow-600',
  'Go': 'from-cyan-500 to-cyan-600',
  'Rust': 'from-orange-600 to-orange-700',
  'Bash': 'from-green-600 to-green-700',
  'Shell': 'from-green-600 to-green-700',
  'SQL': 'from-purple-500 to-purple-600',
  'C++': 'from-pink-500 to-pink-600',
  'C': 'from-gray-500 to-gray-600',
  'Java': 'from-red-500 to-red-600',
  'Kotlin': 'from-purple-600 to-purple-700',
  'Swift': 'from-orange-500 to-orange-600',
  'Ruby': 'from-red-600 to-red-700',
  'PHP': 'from-indigo-500 to-indigo-600',
  'HTML': 'from-orange-500 to-orange-600',
  'CSS': 'from-blue-400 to-blue-500',
  'SCSS': 'from-pink-400 to-pink-500',
  'Vue': 'from-green-500 to-green-600',
  'Svelte': 'from-orange-500 to-red-500',
  'Dockerfile': 'from-blue-400 to-blue-500',
  'Makefile': 'from-green-700 to-green-800',
  'PowerShell': 'from-blue-700 to-blue-800',
  'Lua': 'from-blue-800 to-indigo-900',
  'Vim Script': 'from-green-500 to-green-600',
  'HCL': 'from-purple-400 to-purple-500',
  'Nix': 'from-blue-300 to-blue-400',
};

// Featured languages - always visible even if 0%
const FEATURED_LANGUAGES = [
  'Python',
  'TypeScript', 
  'JavaScript',
  'Go',
  'Rust',
  'Bash',
  'SQL',
  'C++',
  'PowerShell',
];

export interface LanguageSkill {
  name: string;
  percentage: number;
  bytes: number;
  color: string;
}

export interface GitHubStats {
  publicRepos: number;
  totalRepos: number;
  followers: number;
  following: number;
  contributions?: number;
}

// Cache to avoid rate limiting
let languageCache: { data: LanguageSkill[]; timestamp: number } | null = null;
let statsCache: { data: GitHubStats; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Fetch user's GitHub profile stats
 */
export async function fetchGitHubStats(): Promise<GitHubStats> {
  // Check cache
  if (statsCache && Date.now() - statsCache.timestamp < CACHE_DURATION) {
    console.log('Using cached GitHub stats');
    return statsCache.data;
  }

  try {
    const response = await fetch(`${GITHUB_API_BASE}/users/${GITHUB_USERNAME}`);
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const userData = await response.json();
    
    const stats: GitHubStats = {
      publicRepos: userData.public_repos || 0,
      totalRepos: userData.public_repos || 0, // Can only see public without auth
      followers: userData.followers || 0,
      following: userData.following || 0,
    };

    // Cache the result
    statsCache = { data: stats, timestamp: Date.now() };
    
    return stats;
  } catch (error) {
    console.error('Failed to fetch GitHub stats:', error);
    // Return default values on error
    return {
      publicRepos: 0,
      totalRepos: 0,
      followers: 0,
      following: 0,
    };
  }
}

/**
 * Fetch language statistics from all user's public repositories
 */
export async function fetchLanguageStats(): Promise<LanguageSkill[]> {
  // Check cache first
  if (languageCache && Date.now() - languageCache.timestamp < CACHE_DURATION) {
    console.log('Using cached language stats');
    return languageCache.data;
  }

  try {
    console.log(`Fetching repositories for ${GITHUB_USERNAME}...`);
    
    // Fetch all public repos (paginated, max 100 per page)
    const repos: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 5) { // Limit to 5 pages (500 repos max)
      const response = await fetch(
        `${GITHUB_API_BASE}/users/${GITHUB_USERNAME}/repos?per_page=100&page=${page}&sort=updated`
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const pageRepos = await response.json();
      repos.push(...pageRepos);
      
      hasMore = pageRepos.length === 100;
      page++;
    }

    console.log(`Found ${repos.length} repositories`);

    // Aggregate language bytes across all repos
    const languageTotals: Record<string, number> = {};

    // Fetch language breakdown for each repo (in parallel, batched)
    const BATCH_SIZE = 10;
    for (let i = 0; i < repos.length; i += BATCH_SIZE) {
      const batch = repos.slice(i, i + BATCH_SIZE);
      
      const languagePromises = batch.map(async (repo) => {
        if (repo.fork) return {}; // Skip forked repos
        
        try {
          const langResponse = await fetch(repo.languages_url);
          if (langResponse.ok) {
            return await langResponse.json();
          }
        } catch (err) {
          console.warn(`Failed to fetch languages for ${repo.name}`);
        }
        return {};
      });

      const batchResults = await Promise.all(languagePromises);
      
      // Aggregate
      for (const langData of batchResults) {
        for (const [lang, bytes] of Object.entries(langData as Record<string, number>)) {
          languageTotals[lang] = (languageTotals[lang] || 0) + bytes;
        }
      }

      // Small delay to avoid rate limiting
      if (i + BATCH_SIZE < repos.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Calculate total bytes
    const totalBytes = Object.values(languageTotals).reduce((sum, b) => sum + b, 0);

    // Start with featured languages (always visible)
    const skillsMap: Map<string, LanguageSkill> = new Map();
    
    // Initialize featured languages with 0
    for (const lang of FEATURED_LANGUAGES) {
      skillsMap.set(lang, {
        name: lang,
        bytes: 0,
        percentage: 0,
        color: LANGUAGE_COLORS[lang] || 'from-emerald-500 to-emerald-600',
      });
    }

    // Add actual GitHub data
    for (const [name, bytes] of Object.entries(languageTotals)) {
      // Map "Shell" to "Bash" for display
      const displayName = name === 'Shell' ? 'Bash' : name;
      const existing = skillsMap.get(displayName);
      
      if (existing) {
        existing.bytes += bytes;
      } else {
        skillsMap.set(displayName, {
          name: displayName,
          bytes,
          percentage: 0,
          color: LANGUAGE_COLORS[displayName] || 'from-emerald-500 to-emerald-600',
        });
      }
    }

    // Calculate percentages
    const skills = Array.from(skillsMap.values());
    
    if (totalBytes > 0) {
      const maxBytes = Math.max(...skills.map(s => s.bytes));
      
      for (const skill of skills) {
        if (skill.bytes > 0) {
          // Scale so the top language is ~95%
          skill.percentage = Math.round((skill.bytes / maxBytes) * 95);
        }
      }
    }

    // Sort: languages with bytes first (descending), then featured with 0
    skills.sort((a, b) => {
      if (a.bytes > 0 && b.bytes === 0) return -1;
      if (a.bytes === 0 && b.bytes > 0) return 1;
      if (a.bytes === 0 && b.bytes === 0) {
        // Both 0 - sort by featured order
        const aIdx = FEATURED_LANGUAGES.indexOf(a.name);
        const bIdx = FEATURED_LANGUAGES.indexOf(b.name);
        return aIdx - bIdx;
      }
      return b.bytes - a.bytes;
    });

    console.log('Language stats:', skills);

    // Cache the result
    languageCache = { data: skills, timestamp: Date.now() };

    return skills;
  } catch (error) {
    console.error('Failed to fetch language stats:', error);
    // Return featured languages with 0% on error
    return FEATURED_LANGUAGES.map(name => ({
      name,
      bytes: 0,
      percentage: 0,
      color: LANGUAGE_COLORS[name] || 'from-emerald-500 to-emerald-600',
    }));
  }
}

/**
 * Format bytes to human readable (always shows KB for consistency)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0.0 KB';
  if (bytes < 1024) return `${(bytes / 1024).toFixed(1)} KB`; // Small values as KB
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get last sync time for display
 */
export function getLastSyncTime(): string {
  if (languageCache) {
    const diff = Date.now() - languageCache.timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
  return 'not synced';
}
