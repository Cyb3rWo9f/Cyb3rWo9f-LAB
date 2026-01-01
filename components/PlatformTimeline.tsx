
import React, { useState, useEffect } from 'react';
import { formatRank } from '../services/platformStats';
import { fetchPlatformStats, type PlatformStats } from '../services/platformStatsClient';

interface PlatformData {
  id: string; // Document ID in Appwrite (tryhackme, hackthebox, offsec)
  name: string;
  description: string;
  pwned: number;
  rank: string;
  percentile: string;
  color: string;
  link: string;
  syncFromDb: boolean; // Whether to sync from Appwrite DB
}

// Default values (used if DB not available yet)
const PLATFORMS: PlatformData[] = [
  { 
    id: 'tryhackme',
    name: 'TRYHACKME', 
    description: 'Gamified learning paths & CTF challenges',
    pwned: 142,
    rank: '#1,204',
    percentile: 'TOP 1%',
    color: '#10b981',
    link: 'https://tryhackme.com/p/Cyb3rWo9f',
    syncFromDb: true,
  },
  { 
    id: 'hackthebox',
    name: 'HACKTHEBOX', 
    description: 'Advanced penetration testing labs',
    pwned: 64,
    rank: '#3,450',
    percentile: 'PRO HACKER',
    color: '#9fef00',
    link: 'https://app.hackthebox.com/profile/Cyb3rWo9f',
    syncFromDb: true,
  },
  { 
    id: 'vulnhub',
    name: 'VULNHUB', 
    description: 'Local VM security labs & boot2root',
    pwned: 28,
    rank: 'LOCAL',
    percentile: 'MASTER',
    color: '#8b5cf6',
    link: 'https://vulnhub.com',
    syncFromDb: false, // No API for VulnHub
  },
  { 
    id: 'offsec',
    name: 'OFFSEC PG', 
    description: 'Professional proving grounds',
    pwned: 19,
    rank: '#892',
    percentile: 'ELITE',
    color: '#f59e0b',
    link: 'https://portal.offsec.com',
    syncFromDb: true,
  },
];

const PlatformTimeline: React.FC = () => {
  const [spineHeight, setSpineHeight] = useState(0);
  const [visibleCards, setVisibleCards] = useState<number[]>([]);
  const [platforms, setPlatforms] = useState<PlatformData[]>(PLATFORMS);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    // Start spine animation
    const spineTimer = setTimeout(() => {
      setSpineHeight(100);
    }, 200);

    // Reveal cards sequentially
    PLATFORMS.forEach((_, index) => {
      setTimeout(() => {
        setVisibleCards(prev => [...prev, index]);
      }, 400 + (index * 400));
    });

    return () => clearTimeout(spineTimer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const applyDbStats = (platformId: string, stats: PlatformStats) => {
      setPlatforms(prev => prev.map((p) => {
        if (p.id === platformId) {
          return {
            ...p,
            pwned: stats.pwned ?? p.pwned,
            rank: stats.rank ? formatRank(stats.rank) : p.rank,
            percentile: stats.percentile ?? p.percentile,
            link: stats.profileUrl ?? p.link,
          };
        }
        return p;
      }));
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      let latestUpdate: Date | null = null;

      // Fetch stats ONLY from Appwrite DB (GitHub workflow handles API sync)
      const platformsToSync = PLATFORMS.filter(p => p.syncFromDb);
      const results = await Promise.allSettled(
        platformsToSync.map(async (p) => {
          const stats = await fetchPlatformStats(p.id);
          if (stats && isMounted) {
            applyDbStats(p.id, stats);
            if (stats.updatedAt) {
              const d = new Date(stats.updatedAt);
              if (!latestUpdate || d > latestUpdate) latestUpdate = d;
            }
          }
          return stats;
        })
      );

      // Check if any succeeded
      const anySuccess = results.some(r => r.status === 'fulfilled' && r.value);
      
      if (!anySuccess && isMounted) {
        // No DB data available yet - show message (workflow will populate it)
        setError('Stats syncing... (using default values)');
      }

      if (isMounted) {
        setLastUpdated(latestUpdate);
        setLoading(false);
      }
    };

    load();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="relative w-full py-8">
      {/* Section Header */}
      <div className="flex items-center gap-4 mb-10 px-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rotate-45" />
          <span className="text-[10px] mono uppercase tracking-[0.3em] text-zinc-500 font-bold">
            Platform Progress
          </span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-zinc-800 to-transparent" />
      </div>

      {/* Status Row */}
      <div className="px-4 -mt-6 mb-8 flex items-center gap-3 text-[11px] mono text-zinc-500">
        {loading && <span className="text-emerald-400">Syncing platforms…</span>}
        {error && <span className="text-red-400">{error}</span>}
        {!loading && !error && lastUpdated && (
          <span className="text-zinc-600">Updated {lastUpdated.toLocaleString()}</span>
        )}
      </div>

      {/* Timeline Container */}
      <div className="relative max-w-2xl mx-auto">
        {/* Central Spine - Animated Growth */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 hidden md:block overflow-hidden">
          <div 
            className="absolute top-0 left-0 w-full bg-gradient-to-b from-emerald-500/50 via-emerald-500/20 to-zinc-800 transition-all duration-[1600ms] ease-out"
            style={{ height: `${spineHeight}%` }}
          />
          {/* Animated pulse traveling down the spine */}
          {spineHeight === 100 && (
            <div className="absolute w-1 h-16 bg-gradient-to-b from-transparent via-emerald-500/60 to-transparent -left-[1px] animate-[pulse-down_3s_ease-in-out_infinite]" />
          )}
        </div>

        {/* Timeline Items */}
        <div className="flex flex-col gap-4 md:gap-6">
          {platforms.map((platform, index) => {
            const isLeft = index % 2 === 0;
            const isVisible = visibleCards.includes(index);
            
            return (
              <div 
                key={platform.name} 
                className={`relative flex items-center ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}
                           transition-all duration-500 ease-out
                           ${isVisible ? 'opacity-100' : 'opacity-0'}
                           ${isVisible ? 'translate-y-0' : 'translate-y-4'}
                           ${isVisible && isLeft ? 'md:translate-x-0' : ''}
                           ${isVisible && !isLeft ? 'md:translate-x-0' : ''}
                           ${!isVisible && isLeft ? 'md:-translate-x-8' : ''}
                           ${!isVisible && !isLeft ? 'md:translate-x-8' : ''}`}
              >
                {/* Timeline Node */}
                <div className={`absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center z-20
                                transition-all duration-300 ${isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                  <div className="w-4 h-4 bg-zinc-950 border-2 border-zinc-700 rounded-full flex items-center justify-center">
                    <div 
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: platform.color, boxShadow: `0 0 10px ${platform.color}` }}
                    />
                  </div>
                </div>

                {/* Card Side */}
                <div className={`w-full md:w-1/2 ${isLeft ? 'md:pr-8' : 'md:pl-8'} px-4`}>
                  <a
                    href={platform.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block"
                  >
                    <div 
                      className="relative bg-zinc-950/80 border border-zinc-800 p-3 transition-all duration-300 
                                 hover:border-opacity-60 hover:bg-zinc-900/60 cursor-pointer overflow-hidden"
                      style={{ 
                        borderColor: `${platform.color}20`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = `${platform.color}50`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = `${platform.color}20`;
                      }}
                    >
                      {/* Top Accent Line */}
                      <div 
                        className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity"
                        style={{ background: `linear-gradient(90deg, transparent, ${platform.color}, transparent)` }}
                      />

                      {/* Corner Brackets */}
                      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-zinc-700 group-hover:border-emerald-500/50 transition-colors" />
                      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-zinc-700 group-hover:border-emerald-500/50 transition-colors" />
                      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-zinc-700 group-hover:border-emerald-500/50 transition-colors" />
                      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-zinc-700 group-hover:border-emerald-500/50 transition-colors" />

                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] mono text-zinc-600 tracking-widest">
                            0{index + 1}
                          </span>
                          <h3 
                            className="font-bold mono text-sm tracking-wide"
                            style={{ color: platform.color }}
                          >
                            {platform.name}
                          </h3>
                        </div>
                        <div 
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] mono font-bold border"
                          style={{ 
                            color: platform.color, 
                            borderColor: `${platform.color}30`,
                            backgroundColor: `${platform.color}10`
                          }}
                        >
                          {platform.percentile}
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center gap-3">
                        {/* Pwned Count */}
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-6 h-6 rounded flex items-center justify-center font-bold mono text-xs"
                            style={{ 
                              backgroundColor: `${platform.color}15`,
                              color: platform.color
                            }}
                          >
                            {platform.pwned}
                          </div>
                          <span className="text-[9px] mono text-zinc-600 uppercase">Pwned</span>
                        </div>

                        {/* Separator */}
                        <div className="w-px h-3 bg-zinc-800" />

                        {/* Rank */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs mono font-bold text-white">{platform.rank}</span>
                          <span className="text-[9px] mono text-zinc-600 uppercase">Rank</span>
                        </div>
                      </div>

                      {/* Hover Arrow */}
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg 
                          className="w-3 h-3" 
                          style={{ color: platform.color }}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </div>
                  </a>
                </div>

                {/* Empty Space for other side */}
                <div className="hidden md:block md:w-1/2" />
              </div>
            );
          })}
        </div>

      </div>

      {/* Bottom Label */}
      <div className="flex items-center justify-center gap-2 mt-10">
        <div className="w-1 h-1 bg-emerald-500/40 rotate-45" />
        <span className="text-[9px] mono text-zinc-600 uppercase tracking-widest">
          Security Training Progress
        </span>
        <div className="w-1 h-1 bg-emerald-500/40 rotate-45" />
      </div>

      {/* Animation Keyframes */}
      <style>{`
        @keyframes pulse-down {
          0% { top: -64px; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default PlatformTimeline;
