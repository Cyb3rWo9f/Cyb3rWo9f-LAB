import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, ExternalLink, Shield, AlertTriangle, Info, Zap, RefreshCw, Radio, FileText, Skull } from 'lucide-react';
import { fetchCybersecurityNews, refreshNews, formatDate, NewsArticle } from '../services/newsService';
import { logger } from '../services/logger';

interface NewsViewProps {
  onBack: () => void;
}

const NewsView: React.FC<NewsViewProps> = ({ onBack }) => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState<'connecting' | 'scanning' | 'analyzing' | 'loading' | 'complete'>('connecting');
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [loadingStats, setLoadingStats] = useState({
    fetched: 0,
    cves: 0,
    exploits: 0,
    breaches: 0,
    deduped: 0
  });
  const [filter, setFilter] = useState<'all' | 'exploit' | 'cve' | 'breach'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<4 | 6>(6);
  const didLoadRef = useRef(false);
  const fetchAnimRef = useRef<NodeJS.Timeout | null>(null);
  const statsAnimRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(0);

  // Inject shimmer animation CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      try { document.head.removeChild(style); } catch(e) {}
    };
  }, []);

  useEffect(() => {
    const addTerminalLine = (line: string) => {
      setTerminalLines(prev => [...prev.slice(-10), line]);
    };

    const loadNews = async () => {
      setLoading(true);
      setLoadingProgress(() => {
        progressRef.current = 0;
        return 0;
      });
      setLoadingStats({ fetched: 0, cves: 0, exploits: 0, breaches: 0, deduped: 0 });
      setLoadingPhase('connecting');
      setTerminalLines([]);
      if (fetchAnimRef.current) {
        clearInterval(fetchAnimRef.current);
        fetchAnimRef.current = null;
      }
      if (statsAnimRef.current) {
        clearInterval(statsAnimRef.current);
        statsAnimRef.current = null;
      }
      
      let progressInterval: NodeJS.Timeout | null = null;
      
      try {
        // Phase 1: Connecting
        addTerminalLine('$ init --threat-intel');
        await new Promise(r => setTimeout(r, 300));
        addTerminalLine('> Connecting to threat feeds...');
        setLoadingProgress(10);
        
        await new Promise(r => setTimeout(r, 400));
        addTerminalLine('> Authenticating API endpoints...');
        setLoadingProgress(20);
        setLoadingPhase('scanning');
        
        await new Promise(r => setTimeout(r, 300));
        addTerminalLine('$ fetch --sources all');
        setLoadingProgress(30);
        
        // Simulate progress updates while loading
        progressInterval = setInterval(() => {
          setLoadingProgress(prev => {
            // Easing progress curve - faster at start, slower as it approaches 90%
            let next = prev;
            if (prev < 50) next = prev + Math.random() * 8;
            else if (prev < 70) next = prev + Math.random() * 5;
            else if (prev < 85) next = prev + Math.random() * 2;
            progressRef.current = next;
            return next;
          });
        }, 200);

        const data = await fetchCybersecurityNews();
        
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        
        setLoadingProgress(60);
        setLoadingPhase('analyzing');
        addTerminalLine('> Analyzing threat data...');

        // Update stats safely - validate all data before using
        const validData = Array.isArray(data) ? data.filter(item => {
          // Security: Validate article structure
          return item && typeof item === 'object' && 
                 typeof item.id === 'string' && 
                 typeof item.title === 'string' &&
                 typeof item.url === 'string';
        }) : [];

        await new Promise(r => setTimeout(r, 400));
        addTerminalLine(`> Found ${validData.length} threat articles`);
        setLoadingProgress(70);

        // Sanitize stats calculation
        const targetStats = {
          fetched: validData.length,
          cves: Math.max(0, validData.filter(n => n.category === 'cve').length),
          exploits: Math.max(0, validData.filter(n => n.category === 'exploit').length),
          breaches: Math.max(0, validData.filter(n => n.category === 'breach').length),
          deduped: Math.max(0, validData.length - (new Set(validData.map(n => n.id)).size))
        };
        
        await new Promise(r => setTimeout(r, 300));
        addTerminalLine(`> CVEs: ${targetStats.cves} | Exploits: ${targetStats.exploits} | Breaches: ${targetStats.breaches}`);
        setLoadingProgress(80);
        setLoadingPhase('loading');
        
        await new Promise(r => setTimeout(r, 300));
        addTerminalLine('$ dedup --remove-duplicates');
        setLoadingProgress(85);
        
        // Start stats from zero for animation
        setLoadingStats({ fetched: 0, cves: 0, exploits: 0, breaches: 0, deduped: 0 });
        setNews(validData);

        await new Promise(r => setTimeout(r, 300));
        addTerminalLine('> Building threat index...');
        setLoadingProgress(90);

        // Animate stats and progress up to targets
        if (fetchAnimRef.current) {
          clearInterval(fetchAnimRef.current);
          fetchAnimRef.current = null;
        }
        if (statsAnimRef.current) {
          clearInterval(statsAnimRef.current);
          statsAnimRef.current = null;
        }

        const steps = 25;
        let tick = 0;
        const inc = (value: number) => Math.max(1, Math.ceil(value / steps));
        const targets = { ...targetStats, progress: 100 } as any;
        const currents = { fetched: 0, cves: 0, exploits: 0, breaches: 0, deduped: 0, progress: progressRef.current } as any;

        statsAnimRef.current = setInterval(() => {
          tick += 1;
          const nextStats = { ...currents };

          ['fetched', 'cves', 'exploits', 'breaches', 'deduped'].forEach((key) => {
            const stepVal = inc(targets[key]);
            nextStats[key] = Math.min(targets[key], currents[key] + stepVal);
          });

          // progress towards 100
          const progressStep = inc(100);
          nextStats.progress = Math.min(100, currents.progress + progressStep);

          // commit
          setLoadingStats(prev => ({
            fetched: nextStats.fetched,
            cves: nextStats.cves,
            exploits: nextStats.exploits,
            breaches: nextStats.breaches,
            deduped: nextStats.deduped
          }));
          setLoadingProgress(nextStats.progress);

          // update currents for next tick
          Object.assign(currents, nextStats);

          if (nextStats.progress >= 100 &&
              nextStats.fetched >= targets.fetched &&
              nextStats.cves >= targets.cves &&
              nextStats.exploits >= targets.exploits &&
              nextStats.breaches >= targets.breaches &&
              nextStats.deduped >= targets.deduped) {
            clearInterval(statsAnimRef.current!);
            statsAnimRef.current = null;
          }
        }, 50);
        
        await new Promise(r => setTimeout(r, 400));
        addTerminalLine('> Threat feed ready');
        setLoadingPhase('complete');
        
        logger.log(`News loaded: ${validData.length} valid articles ready for display`);
        
        if (progressInterval) clearInterval(progressInterval);
        
        // Hold the loading screen a bit after reaching 100% for a more realistic feel
        setTimeout(() => {
          setLoading(false);
        }, 1200);
      } catch (error) {
        logger.error('Failed to load news:', error);
        if (progressInterval) clearInterval(progressInterval);
        addTerminalLine('> ERROR: Connection failed');
        setLoading(false);
      }
    };
    
    if (!didLoadRef.current) {
      didLoadRef.current = true;
      loadNews();
    }

    return () => {
      if (fetchAnimRef.current) {
        clearInterval(fetchAnimRef.current);
        fetchAnimRef.current = null;
      }
      if (statsAnimRef.current) {
        clearInterval(statsAnimRef.current);
        statsAnimRef.current = null;
      }
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await refreshNews();
      setNews(data);
    } catch (error) {
      logger.error('Failed to refresh news:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const uniqueNews = useMemo(() => {
    const seen = new Set<string>();
    const unique = news.filter(article => {
      if (seen.has(article.id)) {
        logger.log(`Duplicate article removed: ${article.id}`);
        return false;
      }
      seen.add(article.id);
      return true;
    });
    logger.log(`Deduplication: ${news.length} -> ${unique.length} articles`);
    return unique;
  }, [news]);

  const filteredNews = filter === 'all' 
    ? uniqueNews 
    : uniqueNews.filter(article => article.category === filter);

  useEffect(() => {
    logger.log(`Filter: ${filter}, Articles: ${uniqueNews.length} -> ${filteredNews.length}`);
    setPage(1);
  }, [filter, pageSize, news]);

  const totalPages = Math.max(1, Math.ceil(filteredNews.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedNews = filteredNews.slice(startIndex, startIndex + pageSize);

  logger.log(`Pagination: ${filteredNews.length} total, page ${currentPage}/${totalPages}, showing ${paginatedNews.length} articles`);

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 border-red-500/30 bg-red-500/5';
      case 'high': return 'text-orange-500 border-orange-500/30 bg-orange-500/5';
      case 'medium': return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5';
      case 'low': return 'text-blue-500 border-blue-500/30 bg-blue-500/5';
      default: return 'text-zinc-500 border-zinc-500/30 bg-zinc-500/5';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'exploit': return <Zap size={14} />;
      case 'cve': return <Shield size={14} />;
      case 'breach': return <AlertTriangle size={14} />;
      default: return <Info size={14} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'exploit': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'cve': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'breach': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
    }
  };

  if (loading) {
    const progressPercent = Math.min(Math.round(loadingProgress), 100);

    return (
      <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 px-2 sm:px-0">
        <div className="flex flex-col items-center justify-center min-h-[60vh] sm:min-h-[80vh] space-y-3 sm:space-y-8">
          
          {/* Main Loading Container */}
          <div className="relative w-full max-w-2xl">
            {/* Animated background scan effect */}
            <div className="absolute inset-0 overflow-hidden rounded-sm pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-emerald-500/5 animate-pulse" />
              <div 
                className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"
                style={{ 
                  top: `${(progressPercent % 100)}%`,
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
                  transition: 'top 0.3s ease-out'
                }}
              />
            </div>

            {/* Main content box */}
            <div className="relative border border-zinc-800 bg-zinc-950/90 backdrop-blur-sm rounded-sm overflow-hidden">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-2 h-2 sm:w-4 sm:h-4 border-t border-l sm:border-t-2 sm:border-l-2 border-emerald-500/50" />
              <div className="absolute top-0 right-0 w-2 h-2 sm:w-4 sm:h-4 border-t border-r sm:border-t-2 sm:border-r-2 border-emerald-500/50" />
              <div className="absolute bottom-0 left-0 w-2 h-2 sm:w-4 sm:h-4 border-b border-l sm:border-b-2 sm:border-l-2 border-emerald-500/50" />
              <div className="absolute bottom-0 right-0 w-2 h-2 sm:w-4 sm:h-4 border-b border-r sm:border-b-2 sm:border-r-2 border-emerald-500/50" />

              {/* Header bar */}
              <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-3 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="relative">
                    <Radio size={12} className="sm:hidden text-emerald-500" />
                    <Radio size={14} className="hidden sm:block text-emerald-500" />
                    <div className="absolute inset-0 animate-ping opacity-30">
                      <Radio size={12} className="sm:hidden text-emerald-500" />
                      <Radio size={14} className="hidden sm:block text-emerald-500" />
                    </div>
                  </div>
                  <span className="mono text-[8px] sm:text-[10px] text-emerald-400 uppercase tracking-[0.15em] sm:tracking-[0.2em] font-bold">
                    Threat Intel
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                  <span className="mono text-[8px] sm:text-[9px] text-zinc-500 uppercase tracking-wider">Live</span>
                </div>
              </div>

              {/* Main loading content */}
              <div className="p-2.5 sm:p-6 space-y-2.5 sm:space-y-6">
                {/* Title Section */}
                <div className="text-center space-y-1 sm:space-y-3">
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <span className="text-emerald-500/30 text-base sm:text-2xl font-light">[</span>
                    <h1 className="text-lg sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-violet-400 tracking-tight">
                      THREAT FEED
                    </h1>
                    <span className="text-violet-500/30 text-base sm:text-2xl font-light">]</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <Zap size={8} className="sm:hidden text-emerald-500 animate-pulse" />
                    <Zap size={12} className="hidden sm:block text-emerald-500 animate-pulse" />
                    <span className="mono text-[8px] sm:text-[11px] text-emerald-500 font-bold tracking-[0.08em] sm:tracking-[0.15em] animate-pulse">
                      {loadingPhase === 'connecting' && 'CONNECTING...'}
                      {loadingPhase === 'scanning' && 'FETCHING...'}
                      {loadingPhase === 'analyzing' && 'ANALYZING...'}
                      {loadingPhase === 'loading' && 'INDEXING...'}
                      {loadingPhase === 'complete' && 'READY'}
                    </span>
                    <Zap size={8} className="sm:hidden text-emerald-500 animate-pulse" />
                    <Zap size={12} className="hidden sm:block text-emerald-500 animate-pulse" />
                  </div>
                </div>

                {/* Progress Section */}
                <div className="space-y-1.5 sm:space-y-3">
                  {/* Progress bar container */}
                  <div className="relative">
                    <div className="w-full h-1.5 sm:h-2 bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 transition-all duration-300 relative"
                        style={{ width: `${progressPercent}%` }}
                      >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                      </div>
                    </div>
                    {/* Progress glow */}
                    <div 
                      className="absolute top-0 h-1.5 sm:h-2 bg-emerald-500/30 blur-sm transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  
                  {/* Progress info */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                      <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
                      <span className="mono text-[8px] sm:text-[10px] text-zinc-500 uppercase tracking-wider truncate">
                        {loadingPhase === 'connecting' && 'Initializing threat feeds...'}
                        {loadingPhase === 'scanning' && 'Fetching threat data...'}
                        {loadingPhase === 'analyzing' && 'Analyzing threat intel...'}
                        {loadingPhase === 'loading' && 'Building threat index...'}
                        {loadingPhase === 'complete' && 'All threats indexed.'}
                      </span>
                    </div>
                    <span className="mono text-[10px] sm:text-[11px] text-emerald-400 font-bold ml-2">{progressPercent}%</span>
                  </div>
                </div>

                {/* Stats Grid - 2x2 on mobile, 4 on desktop */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                  {/* Articles Fetched */}
                  <div className="group relative border border-zinc-800 bg-zinc-900/30 p-1.5 sm:p-3 rounded-sm overflow-hidden hover:border-emerald-500/30 transition-all duration-300">
                    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                      <FileText size={8} className="sm:hidden text-emerald-500" />
                      <FileText size={10} className="hidden sm:block text-emerald-500" />
                      <span className="mono text-[6px] sm:text-[8px] text-zinc-600 uppercase">Articles</span>
                    </div>
                    <div className="text-sm sm:text-xl font-black text-emerald-400 font-mono">{loadingStats.fetched}</div>
                  </div>

                  {/* CVEs */}
                  <div className="group relative border border-zinc-800 bg-zinc-900/30 p-1.5 sm:p-3 rounded-sm overflow-hidden hover:border-blue-500/30 transition-all duration-300">
                    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                      <Shield size={8} className="sm:hidden text-blue-500" />
                      <Shield size={10} className="hidden sm:block text-blue-500" />
                      <span className="mono text-[6px] sm:text-[8px] text-zinc-600 uppercase">CVEs</span>
                    </div>
                    <div className="text-sm sm:text-xl font-black text-blue-400 font-mono">{loadingStats.cves}</div>
                  </div>

                  {/* Exploits */}
                  <div className="group relative border border-zinc-800 bg-zinc-900/30 p-1.5 sm:p-3 rounded-sm overflow-hidden hover:border-purple-500/30 transition-all duration-300">
                    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                      <Zap size={8} className="sm:hidden text-purple-500" />
                      <Zap size={10} className="hidden sm:block text-purple-500" />
                      <span className="mono text-[6px] sm:text-[8px] text-zinc-600 uppercase">Exploits</span>
                    </div>
                    <div className="text-sm sm:text-xl font-black text-purple-400 font-mono">{loadingStats.exploits}</div>
                  </div>

                  {/* Breaches */}
                  <div className="group relative border border-zinc-800 bg-zinc-900/30 p-1.5 sm:p-3 rounded-sm overflow-hidden hover:border-red-500/30 transition-all duration-300">
                    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                      <Skull size={8} className="sm:hidden text-red-500" />
                      <Skull size={10} className="hidden sm:block text-red-500" />
                      <span className="mono text-[6px] sm:text-[8px] text-zinc-600 uppercase">Breaches</span>
                    </div>
                    <div className="text-sm sm:text-xl font-black text-red-400 font-mono">{loadingStats.breaches}</div>
                  </div>
                </div>

                {/* Phase Indicators */}
                <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                  {['connecting', 'scanning', 'analyzing', 'loading', 'complete'].map((phase, i) => {
                    const isActive = loadingPhase === phase;
                    const isPast = ['connecting', 'scanning', 'analyzing', 'loading', 'complete'].indexOf(loadingPhase) > i;
                    return (
                      <React.Fragment key={phase}>
                        <div 
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-300 ${
                            isActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]' : 
                            isPast ? 'bg-emerald-500' : 'bg-zinc-700'
                          }`}
                        />
                        {i < 4 && (
                          <div className={`w-4 sm:w-6 h-[1px] transition-colors duration-300 ${isPast ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Terminal Section */}
              <div className="border-t border-zinc-800">
                <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-zinc-900/80 border-b border-zinc-800/50">
                  <span className="w-1 h-1 sm:w-2 sm:h-2 rounded-full bg-red-500/80" />
                  <span className="w-1 h-1 sm:w-2 sm:h-2 rounded-full bg-yellow-500/80" />
                  <span className="w-1 h-1 sm:w-2 sm:h-2 rounded-full bg-green-500/80" />
                  <span className="mono text-[7px] sm:text-[9px] text-zinc-600 ml-1 sm:ml-2">threat-feed@Cyb3rWo9f</span>
                </div>
                <div className="p-1.5 sm:p-4 h-14 sm:h-28 overflow-hidden bg-black/30">
                  <div className="space-y-0.5 sm:space-y-1">
                    {terminalLines.slice(-4).map((line, i) => (
                      <div 
                        key={i} 
                        className={`mono text-[7px] sm:text-[10px] ${
                          line.startsWith('$') ? 'text-emerald-400' : 
                          line.startsWith('>') ? 'text-zinc-500' : 'text-zinc-400'
                        } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                      >
                        {line}
                      </div>
                    ))}
                    {loadingPhase !== 'complete' && (
                      <div className="mono text-[7px] sm:text-[10px] text-emerald-400 flex items-center">
                        <span className="animate-pulse">█</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (!loading && uniqueNews.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center">
          <div className="mono text-emerald-500 text-xs tracking-[0.3em] uppercase">No articles yet</div>
          <p className="text-zinc-400 max-w-md">The feed is empty right now. Try refreshing or wait for the next background sync.</p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`group flex items-center gap-2 mono text-xs px-4 py-2 border transition-all ${
              refreshing
                ? 'bg-zinc-950/50 border-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'bg-zinc-950/50 border-zinc-900 text-zinc-500 hover:border-emerald-500 hover:text-emerald-400'
            }`}
            title="Refresh news feed"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
            {refreshing ? 'UPDATING...' : 'REFRESH'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 px-3 sm:px-4 lg:px-0">
      {/* Header */}
      <div className="mb-6 sm:mb-10 border-b border-zinc-900 pb-6 sm:pb-8">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-zinc-500 hover:text-emerald-400 transition-colors mb-5 sm:mb-8 mono text-[9px] sm:text-xs uppercase tracking-wider"
        >
          <ArrowLeft size={14} className="sm:hidden group-hover:-translate-x-1 transition-transform" />
          <ArrowLeft size={16} className="hidden sm:block group-hover:-translate-x-1 transition-transform" />
          Back to Lab
        </button>

        {/* Title Section - Stacked on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-5 sm:mb-6">
          <div className="flex-1">
            <div className="mono text-[8px] sm:text-[10px] text-emerald-500 tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-1.5 sm:mb-2">SECURITY INTELLIGENCE</div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-2 sm:mb-3">Cyber Threat Feed</h1>
            <p className="text-zinc-500 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Real-time cybersecurity news, CVE alerts, and exploit intelligence from trusted sources.
            </p>
          </div>
          
          {/* Controls - Row on mobile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`group flex items-center gap-1.5 sm:gap-2 mono text-[9px] sm:text-xs px-3 sm:px-4 py-1.5 sm:py-2 border transition-all ${
                refreshing
                  ? 'bg-zinc-950/50 border-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-950/50 border-zinc-900 text-zinc-500 hover:border-emerald-500 hover:text-emerald-400'
              }`}
              title="Refresh news feed"
            >
              <RefreshCw size={12} className={`sm:hidden ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <RefreshCw size={14} className={`hidden sm:block ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span className="hidden xs:inline">{refreshing ? 'UPDATING...' : 'REFRESH'}</span>
            </button>
            <div className="mono text-[8px] sm:text-[10px] text-zinc-600 border border-zinc-900 px-2 sm:px-3 py-1.5 sm:py-2 rounded bg-zinc-950/50">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                LIVE
              </div>
            </div>
          </div>
        </div>

        {/* Filters - Scrollable on mobile */}
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-hide">
          {['all', 'exploit', 'cve', 'breach'].map((category) => (
            <button
              key={category}
              onClick={() => setFilter(category as any)}
              className={`mono text-[9px] sm:text-xs uppercase px-3 sm:px-4 py-1.5 sm:py-2 border transition-all whitespace-nowrap flex-shrink-0 ${
                filter === category
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                  : 'bg-zinc-950/50 border-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Pagination controls - Stack on mobile */}
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="mono text-[8px] sm:text-[10px] uppercase text-zinc-500">Page size</span>
            {[4, 6].map((size) => (
              <button
                key={size}
                onClick={() => setPageSize(size as 4 | 6)}
                className={`mono text-[9px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 border transition-all ${
                  pageSize === size
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : 'bg-zinc-950/50 border-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`mono text-[9px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 border transition-all ${
                currentPage === 1
                  ? 'bg-zinc-950/50 border-zinc-900 text-zinc-700 cursor-not-allowed'
                  : 'bg-zinc-950/50 border-zinc-900 text-zinc-500 hover:border-emerald-500 hover:text-emerald-400'
              }`}
            >
              Prev
            </button>

            <span className="mono text-[8px] sm:text-[10px] uppercase text-zinc-500">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className={`mono text-[9px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 border transition-all ${
                currentPage >= totalPages
                  ? 'bg-zinc-950/50 border-zinc-900 text-zinc-700 cursor-not-allowed'
                  : 'bg-zinc-950/50 border-zinc-900 text-zinc-500 hover:border-emerald-500 hover:text-emerald-400'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* News Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {filteredNews.length === 0 ? (
          <div className="col-span-full text-center py-12 sm:py-20 text-zinc-600 mono text-xs sm:text-sm">
            No news items found for this filter.
          </div>
        ) : (
          paginatedNews.map((article) => (
            <article
              key={article.id}
              className="group relative border border-zinc-900 bg-zinc-950/30 hover:bg-zinc-950/60 hover:border-zinc-800 transition-all duration-300 p-4 sm:p-5 lg:p-6 overflow-hidden"
            >
              {/* Corner decorations */}
              <div className="absolute top-0 left-0 w-2 h-2 sm:w-3 sm:h-3 border-t border-l border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors" />
              <div className="absolute top-0 right-0 w-2 h-2 sm:w-3 sm:h-3 border-t border-r border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors" />
              <div className="absolute bottom-0 left-0 w-2 h-2 sm:w-3 sm:h-3 border-b border-l border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors" />
              <div className="absolute bottom-0 right-0 w-2 h-2 sm:w-3 sm:h-3 border-b border-r border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors" />
              
              {/* Header */}
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className={`p-1 sm:p-1.5 border rounded ${getCategoryColor(article.category)}`}>
                    <span className="sm:hidden">{React.cloneElement(getCategoryIcon(article.category), { size: 12 })}</span>
                    <span className="hidden sm:block">{getCategoryIcon(article.category)}</span>
                  </div>
                  <span className={`mono text-[8px] sm:text-[10px] uppercase tracking-wider ${getCategoryColor(article.category).split(' ')[0]}`}>
                    {article.category}
                  </span>
                </div>
                {article.severity && (
                  <div className={`mono text-[7px] sm:text-[9px] px-1.5 sm:px-2 py-0.5 sm:py-1 border rounded uppercase tracking-wider ${getSeverityColor(article.severity)}`}>
                    {article.severity}
                  </div>
                )}
              </div>

              {/* Title */}
              <h3 className="text-white font-bold text-sm sm:text-base lg:text-lg mb-2 sm:mb-3 group-hover:text-emerald-400 transition-colors leading-tight line-clamp-2">
                {article.title}
              </h3>

              {/* Description */}
              <p className="text-zinc-400 text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed line-clamp-3">
                {article.description}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-zinc-900">
                <div className="flex items-center gap-2 sm:gap-4 text-zinc-600 mono text-[8px] sm:text-[10px]">
                  <span className="uppercase tracking-wider truncate max-w-[80px] sm:max-w-none">{article.source}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{formatDate(article.publishedAt)}</span>
                </div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 sm:gap-2 text-emerald-500 hover:text-emerald-400 transition-colors mono text-[8px] sm:text-[10px] uppercase tracking-wider group/link"
                >
                  Read
                  <ExternalLink size={10} className="sm:hidden group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                  <ExternalLink size={12} className="hidden sm:block group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Stats Footer */}
      <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-zinc-900 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
        <div className="relative border border-zinc-900 bg-zinc-950/30 p-3 sm:p-4 overflow-hidden group hover:border-zinc-800 transition-colors">
          <div className="absolute top-0 left-0 w-1.5 h-1.5 sm:w-2 sm:h-2 border-t border-l border-white/10" />
          <div className="absolute bottom-0 right-0 w-1.5 h-1.5 sm:w-2 sm:h-2 border-b border-r border-white/10" />
          <div className="mono text-[7px] sm:text-[9px] text-zinc-600 uppercase mb-1 sm:mb-2 tracking-wider">Total Articles</div>
          <div className="text-lg sm:text-2xl font-black text-white font-mono">{uniqueNews.length}</div>
        </div>
        <div className="relative border border-zinc-900 bg-zinc-950/30 p-3 sm:p-4 overflow-hidden group hover:border-emerald-500/30 transition-colors">
          <div className="absolute top-0 left-0 w-1.5 h-1.5 sm:w-2 sm:h-2 border-t border-l border-emerald-500/20" />
          <div className="absolute bottom-0 right-0 w-1.5 h-1.5 sm:w-2 sm:h-2 border-b border-r border-emerald-500/20" />
          <div className="mono text-[7px] sm:text-[9px] text-zinc-600 uppercase mb-1 sm:mb-2 tracking-wider">CVEs</div>
          <div className="text-lg sm:text-2xl font-black text-emerald-400 font-mono">{uniqueNews.filter(n => n.category === 'cve').length}</div>
        </div>
        <div className="relative border border-zinc-900 bg-zinc-950/30 p-3 sm:p-4 overflow-hidden group hover:border-purple-500/30 transition-colors">
          <div className="absolute top-0 left-0 w-1.5 h-1.5 sm:w-2 sm:h-2 border-t border-l border-purple-500/20" />
          <div className="absolute bottom-0 right-0 w-1.5 h-1.5 sm:w-2 sm:h-2 border-b border-r border-purple-500/20" />
          <div className="mono text-[7px] sm:text-[9px] text-zinc-600 uppercase mb-1 sm:mb-2 tracking-wider">Exploits</div>
          <div className="text-lg sm:text-2xl font-black text-purple-400 font-mono">{uniqueNews.filter(n => n.category === 'exploit').length}</div>
        </div>
        <div className="relative border border-zinc-900 bg-zinc-950/30 p-3 sm:p-4 overflow-hidden group hover:border-red-500/30 transition-colors">
          <div className="absolute top-0 left-0 w-1.5 h-1.5 sm:w-2 sm:h-2 border-t border-l border-red-500/20" />
          <div className="absolute bottom-0 right-0 w-1.5 h-1.5 sm:w-2 sm:h-2 border-b border-r border-red-500/20" />
          <div className="mono text-[7px] sm:text-[9px] text-zinc-600 uppercase mb-1 sm:mb-2 tracking-wider">Critical</div>
          <div className="text-lg sm:text-2xl font-black text-red-400 font-mono">{uniqueNews.filter(n => n.severity === 'critical').length}</div>
        </div>
      </div>

      <style>{`
        .delay-200 { animation-delay: 200ms; }
        .delay-400 { animation-delay: 400ms; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
};

export default NewsView;
