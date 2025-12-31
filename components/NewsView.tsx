import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, ExternalLink, Shield, AlertTriangle, Info, Zap, RefreshCw } from 'lucide-react';
import { fetchCybersecurityNews, refreshNews, formatDate, NewsArticle } from '../services/newsService';

interface NewsViewProps {
  onBack: () => void;
}

const NewsView: React.FC<NewsViewProps> = ({ onBack }) => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
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

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      setLoadingProgress(() => {
        progressRef.current = 0;
        return 0;
      });
      setLoadingStats({ fetched: 0, cves: 0, exploits: 0, breaches: 0, deduped: 0 });
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
        // Simulate progress updates while loading
        progressInterval = setInterval(() => {
          setLoadingProgress(prev => {
            // Easing progress curve - faster at start, slower as it approaches 90%
            let next = prev;
            if (prev < 30) next = prev + Math.random() * 15;
            else if (prev < 60) next = prev + Math.random() * 10;
            else if (prev < 90) next = prev + Math.random() * 3;
            progressRef.current = next;
            return next;
          });
        }, 200);

        const data = await fetchCybersecurityNews();
        
        // Update stats safely - validate all data before using
        const validData = Array.isArray(data) ? data.filter(item => {
          // Security: Validate article structure
          return item && typeof item === 'object' && 
                 typeof item.id === 'string' && 
                 typeof item.title === 'string' &&
                 typeof item.url === 'string';
        }) : [];

        // Sanitize stats calculation
        const targetStats = {
          fetched: validData.length,
          cves: Math.max(0, validData.filter(n => n.category === 'cve').length),
          exploits: Math.max(0, validData.filter(n => n.category === 'exploit').length),
          breaches: Math.max(0, validData.filter(n => n.category === 'breach').length),
          deduped: Math.max(0, validData.length - (new Set(validData.map(n => n.id)).size))
        };
        
        // Start stats from zero for animation
        setLoadingStats({ fetched: 0, cves: 0, exploits: 0, breaches: 0, deduped: 0 });
        setNews(validData);

        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }

        setLoadingProgress(prev => {
          const next = Math.min(prev, 90);
          progressRef.current = next;
          return next;
        });

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
        
        console.log(`📡 News loaded: ${validData.length} valid articles ready for display`);
        
        if (progressInterval) clearInterval(progressInterval);
        
        // Hold the loading screen a bit after reaching 100% for a more realistic feel
        setTimeout(() => {
          setLoading(false);
        }, 2000);
      } catch (error) {
        console.error('Failed to load news:', error);
        if (progressInterval) clearInterval(progressInterval);
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
      console.error('Failed to refresh news:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const uniqueNews = useMemo(() => {
    const seen = new Set<string>();
    const unique = news.filter(article => {
      if (seen.has(article.id)) {
        console.log(`Duplicate article removed: ${article.id}`);
        return false;
      }
      seen.add(article.id);
      return true;
    });
    console.log(`✓ Deduplication: ${news.length} → ${unique.length} articles`);
    return unique;
  }, [news]);

  const filteredNews = filter === 'all' 
    ? uniqueNews 
    : uniqueNews.filter(article => article.category === filter);

  useEffect(() => {
    console.log(`🔍 Filter: ${filter}, Articles: ${uniqueNews.length} → ${filteredNews.length}`);
    setPage(1);
  }, [filter, pageSize, news]);

  const totalPages = Math.max(1, Math.ceil(filteredNews.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedNews = filteredNews.slice(startIndex, startIndex + pageSize);

  console.log(`📊 Pagination: ${filteredNews.length} total, page ${currentPage}/${totalPages}, showing ${paginatedNews.length} articles`);

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
    return (
      <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700">
        <div className="flex flex-col items-center justify-center h-[70vh] space-y-8">
          {/* Main Loading Display */}
          <div className="text-center space-y-6 w-full max-w-2xl">
            {/* Status Text */}
            <div>
              <div className="mono text-emerald-500 text-sm animate-pulse font-bold tracking-widest mb-2">
                INITIALIZING THREAT INTELLIGENCE
              </div>
              <div className="text-zinc-600 mono text-xs">
                Accessing real-time threat intelligence database.
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-zinc-900 border border-zinc-800 rounded h-1 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.min(loadingProgress, 100)}%` }}
                />
              </div>
              <div className="mono text-[10px] text-zinc-600">
                {Math.round(Math.min(loadingProgress, 100))}%
              </div>
            </div>

            {/* Loading Dots */}
            <div className="flex gap-2 justify-center pt-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse delay-200" />
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse delay-400" />
            </div>
          </div>

          {/* Real-time Stats Grid */}
          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {/* Articles Fetched */}
            <div className="border border-zinc-800 bg-zinc-950/50 p-4 rounded">
              <div className="mono text-[9px] text-zinc-600 uppercase mb-2 tracking-wider">
                Articles
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {loadingStats.fetched}
              </div>
              <div className="mono text-[8px] text-zinc-700 mt-1">fetched</div>
            </div>

            {/* CVEs */}
            <div className="border border-zinc-800 bg-zinc-950/50 p-4 rounded">
              <div className="mono text-[9px] text-zinc-600 uppercase mb-2 tracking-wider">
                CVEs
              </div>
              <div className="text-2xl font-black text-blue-400 font-mono">
                {loadingStats.cves}
              </div>
              <div className="mono text-[8px] text-zinc-700 mt-1">vulnerabilities</div>
            </div>

            {/* Exploits */}
            <div className="border border-zinc-800 bg-zinc-950/50 p-4 rounded">
              <div className="mono text-[9px] text-zinc-600 uppercase mb-2 tracking-wider">
                Exploits
              </div>
              <div className="text-2xl font-black text-purple-400 font-mono">
                {loadingStats.exploits}
              </div>
              <div className="mono text-[8px] text-zinc-700 mt-1">active</div>
            </div>

            {/* Breaches */}
            <div className="border border-zinc-800 bg-zinc-950/50 p-4 rounded">
              <div className="mono text-[9px] text-zinc-600 uppercase mb-2 tracking-wider">
                Breaches
              </div>
              <div className="text-2xl font-black text-red-400 font-mono">
                {loadingStats.breaches}
              </div>
              <div className="mono text-[8px] text-zinc-700 mt-1">reported</div>
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
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="mb-12 border-b border-zinc-900 pb-8">
        <button
          onClick={onBack}
          className="group flex items-center gap-3 text-zinc-500 hover:text-emerald-400 transition-colors mb-8 mono text-xs uppercase tracking-wider"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Lab
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="mono text-[10px] text-emerald-500 tracking-[0.3em] uppercase mb-2">SECURITY INTELLIGENCE</div>
            <h1 className="text-5xl font-black text-white tracking-tight mb-3">Cyber Threat Feed</h1>
            <p className="text-zinc-500 text-sm max-w-2xl">
              Real-time cybersecurity news, CVE alerts, and exploit intelligence from trusted sources.
            </p>
          </div>
          <div className="flex items-center gap-3">
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
            <div className="mono text-[10px] text-zinc-600 border border-zinc-900 px-3 py-2 rounded bg-zinc-950/50">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                LIVE
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          {['all', 'exploit', 'cve', 'breach'].map((category) => (
            <button
              key={category}
              onClick={() => setFilter(category as any)}
              className={`mono text-xs uppercase px-4 py-2 border transition-all ${
                filter === category
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                  : 'bg-zinc-950/50 border-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Pagination controls */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="mono text-[10px] uppercase text-zinc-500">Page size</span>
            {[4, 6].map((size) => (
              <button
                key={size}
                onClick={() => setPageSize(size as 4 | 6)}
                className={`mono text-xs px-3 py-1.5 border transition-all ${
                  pageSize === size
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : 'bg-zinc-950/50 border-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`mono text-xs px-3 py-1.5 border transition-all ${
                currentPage === 1
                  ? 'bg-zinc-950/50 border-zinc-900 text-zinc-700 cursor-not-allowed'
                  : 'bg-zinc-950/50 border-zinc-900 text-zinc-500 hover:border-emerald-500 hover:text-emerald-400'
              }`}
            >
              Previous
            </button>

            <span className="mono text-[10px] uppercase text-zinc-500">
              Page {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className={`mono text-xs px-3 py-1.5 border transition-all ${
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredNews.length === 0 ? (
          <div className="col-span-full text-center py-20 text-zinc-600 mono text-sm">
            No news items found for this filter.
          </div>
        ) : (
          paginatedNews.map((article) => (
            <article
              key={article.id}
              className="group border border-zinc-900 bg-zinc-950/30 hover:bg-zinc-950/60 hover:border-zinc-800 transition-all duration-300 p-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 border rounded ${getCategoryColor(article.category)}`}>
                    {getCategoryIcon(article.category)}
                  </div>
                  <span className={`mono text-[10px] uppercase tracking-wider ${getCategoryColor(article.category).split(' ')[0]}`}>
                    {article.category}
                  </span>
                </div>
                {article.severity && (
                  <div className={`mono text-[9px] px-2 py-1 border rounded uppercase tracking-wider ${getSeverityColor(article.severity)}`}>
                    {article.severity}
                  </div>
                )}
              </div>

              {/* Title */}
              <h3 className="text-white font-bold text-lg mb-3 group-hover:text-emerald-400 transition-colors leading-tight">
                {article.title}
              </h3>

              {/* Description */}
              <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
                {article.description}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
                <div className="flex items-center gap-4 text-zinc-600 mono text-[10px]">
                  <span className="uppercase tracking-wider">{article.source}</span>
                  <span>•</span>
                  <span>{formatDate(article.publishedAt)}</span>
                </div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors mono text-[10px] uppercase tracking-wider"
                >
                  Read
                  <ExternalLink size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Stats Footer */}
      <div className="mt-12 pt-8 border-t border-zinc-900 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="border border-zinc-900 bg-zinc-950/30 p-4">
          <div className="mono text-[9px] text-zinc-600 uppercase mb-2">Total Articles</div>
          <div className="text-2xl font-black text-white">{uniqueNews.length}</div>
        </div>
        <div className="border border-zinc-900 bg-zinc-950/30 p-4">
          <div className="mono text-[9px] text-zinc-600 uppercase mb-2">CVEs</div>
          <div className="text-2xl font-black text-emerald-400">{uniqueNews.filter(n => n.category === 'cve').length}</div>
        </div>
        <div className="border border-zinc-900 bg-zinc-950/30 p-4">
          <div className="mono text-[9px] text-zinc-600 uppercase mb-2">Exploits</div>
          <div className="text-2xl font-black text-purple-400">{uniqueNews.filter(n => n.category === 'exploit').length}</div>
        </div>
        <div className="border border-zinc-900 bg-zinc-950/30 p-4">
          <div className="mono text-[9px] text-zinc-600 uppercase mb-2">Critical</div>
          <div className="text-2xl font-black text-red-400">{uniqueNews.filter(n => n.severity === 'critical').length}</div>
        </div>
      </div>

      <style>{`
        .delay-200 { animation-delay: 200ms; }
        .delay-400 { animation-delay: 400ms; }
      `}</style>
    </div>
  );
};

export default NewsView;
