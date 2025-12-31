import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Tag, ChevronLeft, ChevronRight, Loader2, Database, AlertTriangle, Server, Cpu, Flag, Box, Shield, BookOpen, Search } from 'lucide-react';
import { PLATFORMS_METRICS } from '../constants';
import { Writeup } from '../types';
import { loadAllWriteups } from '../services/writeupLoader';
import { marked } from 'marked';
import hljs from 'highlight.js';

interface WriteupViewProps {
  onBack: () => void;
  isLoggedIn?: boolean;
  onLogin?: () => void;
}

const WriteupView: React.FC<WriteupViewProps> = ({ onBack, isLoggedIn, onLogin }) => {
  const [writeups, setWriteups] = useState<Writeup[]>([]);
  const [selectedWriteup, setSelectedWriteup] = useState<Writeup | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [imageMeta, setImageMeta] = useState<{ src: string; alt: string; name: string; width?: number; height?: number; status: 'loading' | 'ok' | 'error' }[]>([]);

  // Inject ultra-thin scrollbar styles for code blocks
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      pre, code {
        scrollbar-width: thin !important;
        scrollbar-color: #10b981 transparent !important;
      }
      pre::-webkit-scrollbar,
      code::-webkit-scrollbar {
        width: 4px !important;
        height: 4px !important;
      }
      pre::-webkit-scrollbar-track,
      code::-webkit-scrollbar-track {
        background: transparent !important;
      }
      pre::-webkit-scrollbar-thumb,
      code::-webkit-scrollbar-thumb {
        background: #10b981 !important;
        border-radius: 2px !important;
      }
      pre::-webkit-scrollbar-thumb:hover,
      code::-webkit-scrollbar-thumb:hover {
        background: #059669 !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      try { document.head.removeChild(style); } catch(e) {}
    };
  }, []);

  // Configure marked with KaTeX support and defensive rendering
  useMemo(() => {
    const mathExtension = {
      name: 'math',
      level: 'inline',
      start(src: string) { return src.indexOf('$'); },
      tokenizer(src: string) {
        const displayRule = /^\$\$([\s\S]+?)\$\$/;
        const inlineRule = /^\$([^\$\n]+?)\$/;
        
        let match;
        if (match = displayRule.exec(src)) {
          return { type: 'math', raw: match[0], text: match[1], display: true };
        } else if (match = inlineRule.exec(src)) {
          return { type: 'math', raw: match[0], text: match[1], display: false };
        }
      },
      renderer(token: any) {
        const katex = (window as any).katex;
        if (!katex) return token.raw;
        try {
          return katex.renderToString(token.text || '', { displayMode: token.display, throwOnError: false });
        } catch (e) {
          return `<span class="text-red-500 mono">[Math Error]</span>`;
        }
      }
    };

    // Admonition / callout extension similar to Chirpy callouts: > [!NOTE] Title
    const calloutExtension = {
      name: 'callout',
      level: 'block' as const,
      start(src: string) {
        return src.match(/^>\s+\[!/)?.index ?? -1;
      },
      tokenizer(src: string) {
        const rule = /^>\s+\[!(NOTE|TIP|WARNING|DANGER)\]\s*(.*)(?:\n((?:>.*\n?)*))?/;
        const match = rule.exec(src);
        if (match) {
          const [, kind, firstLine, rest] = match;
          const rawLines = [match[0].split('\n')[0]];
          if (rest) {
            rest.split('\n').forEach(l => { if (l.startsWith('>')) rawLines.push(l); });
          }
          const content = [firstLine, ...(rest ? rest.split('\n').map(l => l.replace(/^>\s?/, '')) : [])].join('\n').trim();
          return {
            type: 'callout',
            raw: rawLines.join('\n'),
            kind,
            text: content
          } as any;
        }
      },
      renderer(token: any) {
        const colorMap: Record<string, string> = {
          NOTE: '#22c55e',
          TIP: '#0ea5e9',
          WARNING: '#f59e0b',
          DANGER: '#ef4444'
        };
        const tone = colorMap[token.kind] || '#22c55e';
        const label = token.kind || 'NOTE';
        const body = marked.parse(token.text || '') as string;
        return `<div class="callout" style="border:1px solid ${tone}33;padding:12px 14px;border-radius:4px;background:rgba(24,24,27,0.6);margin:12px 0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="width:8px;height:8px;background:${tone};display:inline-block;border-radius:2px;box-shadow:0 0 8px ${tone}66;"></span>
            <span style="font-size:10px;font-family:monospace;letter-spacing:0.2em;color:${tone};font-weight:800;">${label}</span>
          </div>
          <div style="color:#d4d4d8;font-size:12px;line-height:1.5;">${body}</div>
        </div>`;
      }
    };

    marked.use({
      extensions: [mathExtension as any, calloutExtension as any],
      renderer: {
        code(code: string, infostring: string) {
          const parts = (infostring || '').split(/\s+/).filter(Boolean);
          const lang = parts[0] || '';
          const titlePart = parts.find(p => p.startsWith('title='));
          const title = titlePart ? titlePart.replace(/^title=\"/, '').replace(/\"$/, '') : '';
          const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
          try {
            const highlighted = hljs.highlight(code || '', { language }).value;
            const titleBar = title ? `<div style="background:rgba(39,39,42,0.9);color:#e4e4e7;font-size:11px;padding:6px 10px;border-bottom:1px solid #27272a;font-family:monospace;">${title}</div>` : '';
            return `<div class="code-block" style="border:1px solid #27272a;background:rgba(12,12,12,0.85);border-radius:4px;overflow:hidden;">${titleBar}<pre style="margin:0;scrollbar-width:thin;">`+
              `<code class="hljs ${language}">${highlighted}</code></pre></div>`;
          } catch (e) {
            return `<pre><code>${code || ''}</code></pre>`;
          }
        }
      },
      breaks: true,
      gfm: true
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setLoadingProgress(0);
        
        // Simulate progress over 5 seconds
        const progressInterval = setInterval(() => {
          setLoadingProgress(prev => {
            if (prev >= 95) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + Math.random() * 25;
          });
        }, 300);

        const data = await loadAllWriteups();
        
        // Complete remaining progress
        setLoadingProgress(100);
        
        // Minimum 5 second loading time
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        setWriteups(data || []);
      } catch (error) {
        console.error("Failed to load writeups", error);
        setWriteups([]);
      } finally {
        setLoading(false);
        setLoadingProgress(0);
      }
    };
    init();
  }, []);

  const filteredWriteups = useMemo(() => {
    const base = platformFilter
      ? writeups.filter(w => (w.platform || '').toUpperCase() === platformFilter?.toUpperCase())
      : writeups;

    if (platformFilter && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return base.filter(w => 
        w.title.toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q) ||
        (w.tags || []).some(tag => tag.toLowerCase().includes(q))
      );
    }

    return base;
  }, [writeups, platformFilter, searchQuery]);

  // Compute counts per platform for section cards using a fixed node list
  const sectionNodes = useMemo(() => {
    const parseMinutes = (rt?: string): number => {
      if (!rt) return 0;
      const m = rt.match(/(\d+)\s*MIN/i);
      return m ? parseInt(m[1], 10) : 0;
    };

    const FIXED_NODE_LABELS = [
      'HACKTHEBOX',
      'TRYHACKME',
      'VULNHUB',
      'OFFSEC PG',
      'PORTSWIGGER',
      'OTHERS'
    ];

    const getDescriptionFor = (label: string): string => {
      const match = PLATFORMS_METRICS.find(m => m.name.toUpperCase() === label);
      if (match) return match.description;
      if (label === 'PORTSWIGGER') return 'Web Security Academy labs and web research.';
      if (label === 'OTHERS') return 'Miscellaneous research, notes, and assorted writeups.';
      return 'Training and platform node.';
    };

    return FIXED_NODE_LABELS.map((label) => {
      const inSection = writeups.filter(w => (w.platform || '').toUpperCase() === label);
      const categories = Array.from(new Set(inSection.map(w => (w.category || '').toUpperCase()).filter(Boolean)));
      const minutes = inSection.reduce((sum, w) => sum + parseMinutes(w.readingTime), 0);
      const tags = Array.from(new Set(inSection.flatMap(w => (w.tags || []).map(t => t.toLowerCase()))));

      return {
        key: label,
        label,
        description: getDescriptionFor(label),
        count: inSection.length,
        categories,
        minutes,
        tags
      };
    });
  }, [writeups]);

  const currentNode = useMemo(() => {
    if (!platformFilter) return null;
    const key = platformFilter.toUpperCase();
    return sectionNodes.find((n) => n.label === key) || null;
  }, [platformFilter, sectionNodes]);

  const nodeTags = useMemo(() => {
    if (!platformFilter) return [] as { tag: string; count: number }[];
    const inNode = writeups.filter(w => (w.platform || '').toUpperCase() === platformFilter.toUpperCase());
    const freq: Record<string, number> = {};
    inNode.forEach(w => {
      (w.tags || []).forEach(t => {
        const key = t.toLowerCase();
        freq[key] = (freq[key] || 0) + 1;
      });
    });
    const arr = Object.entries(freq).map(([tag, count]) => ({ tag, count }));
    arr.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    return arr.slice(0, 12);
  }, [platformFilter, writeups]);

  const preview = useMemo(() => {
    if (!selectedWriteup?.content) return { html: '', truncated: false };
    const raw = selectedWriteup.content;
    // Strip images so the preview stays compact and avoids oversized media
    const withoutImages = raw.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
    const limit = 1400;
    const snippet = withoutImages.slice(0, limit);
    try {
      return {
        html: marked.parse(snippet) as string,
        truncated: withoutImages.length > limit
      };
    } catch (e) {
      return {
        html: snippet,
        truncated: withoutImages.length > limit
      };
    }
  }, [selectedWriteup]);

  // FIXED: Defensive check to prevent 'replace' of undefined error
  const toc = useMemo(() => {
    if (!selectedWriteup || !selectedWriteup.content) return [];
    try {
      const tokens = marked.lexer(selectedWriteup.content);
      return tokens
        .filter((t): t is any => t.type === 'heading' && t.depth <= 3)
        .map(h => {
          const text = h.text || '';
          return {
            text: text,
            id: text.toLowerCase().replace(/[^\w]+/g, '-'),
            depth: h.depth
          };
        });
    } catch (e) {
      console.error("TOC generation failed", e);
      return [];
    }
  }, [selectedWriteup]);

  useEffect(() => {
    if (!selectedWriteup?.content) {
      setImageMeta([]);
      return;
    }

    const regex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    const matches: { alt: string; src: string }[] = [];
    let m;
    while ((m = regex.exec(selectedWriteup.content)) !== null) {
      matches.push({ alt: m[1] || 'Image', src: m[2] });
    }

    if (!matches.length) {
      setImageMeta([]);
      return;
    }

    const getName = (src: string) => {
      try {
        const url = new URL(src, window.location.href);
        const parts = url.pathname.split('/').filter(Boolean);
        return decodeURIComponent(parts[parts.length - 1] || src);
      } catch {
        const parts = src.split('/').filter(Boolean);
        return decodeURIComponent(parts[parts.length - 1] || src);
      }
    };

    setImageMeta(matches.map(m => ({ ...m, name: getName(m.src), status: 'loading' as const })));

    let cancelled = false;
    matches.forEach((item, idx) => {
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        setImageMeta(prev => prev.map((p, i) => i === idx ? { ...p, width: img.naturalWidth, height: img.naturalHeight, status: 'ok' } : p));
      };
      img.onerror = () => {
        if (cancelled) return;
        setImageMeta(prev => prev.map((p, i) => i === idx ? { ...p, status: 'error' } : p));
      };
      img.src = item.src;
    });

    return () => {
      cancelled = true;
    };
  }, [selectedWriteup]);

  useEffect(() => {
    if (selectedWriteup) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedWriteup]);

  if (loading) {
    const progressPercent = Math.min(Math.round(loadingProgress), 100);
    const statusIndex = Math.floor((progressPercent / 100) * 3);
    const isConnecting = progressPercent < 40;
    const isDecrypting = progressPercent >= 40 && progressPercent < 70;
    const isLoading = progressPercent >= 70;

    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-16 text-center px-6 max-w-2xl mx-auto">
          {/* Title with subtle glow */}
          <div className="space-y-4">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 tracking-tighter drop-shadow-lg">
              ACCESSING ARCHIVE
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto rounded-full" />
          </div>

          {/* Status section */}
          <div className="space-y-4 w-full">
            <div className="text-xs mono text-emerald-500/60 tracking-widest uppercase mb-4">INITIALIZATION STATUS</div>
            
            <div className="space-y-3">
              <div className={`flex items-center justify-center gap-4 transition-all duration-300 ${isConnecting ? 'opacity-100' : 'opacity-50'}`}>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse delay-200" />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse delay-400" />
                </div>
                <span className="text-sm mono text-emerald-300 transition-colors">{isConnecting ? 'Connecting to vault' : 'Connected'}</span>
              </div>
              
              <div className={`flex items-center justify-center gap-4 transition-all duration-300 ${isDecrypting ? 'opacity-100' : 'opacity-50'}`}>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse delay-200" />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse delay-400" />
                </div>
                <span className="text-sm mono text-emerald-400 transition-colors">{isDecrypting ? 'Decrypting modules' : 'Decrypted'}</span>
              </div>
              
              <div className={`flex items-center justify-center gap-4 transition-all duration-300 ${isLoading ? 'opacity-100' : 'opacity-50'}`}>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse delay-200" />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse delay-400" />
                </div>
                <span className="text-sm mono text-emerald-400 transition-colors">{isLoading ? 'Loading writeups' : 'Complete'}</span>
              </div>
            </div>
          </div>

          {/* Progress section */}
          <div className="w-full max-w-xs space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-xs mono text-emerald-500/60 tracking-wide">
                <span>SYNC PROGRESS</span>
                <span className="text-emerald-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-emerald-500/20">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 rounded-full shadow-lg shadow-emerald-500/30 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div className="text-xs mono text-emerald-500/50">
              {progressPercent < 100 ? `ETA: ${Math.max(0, Math.ceil((5000 - (progressPercent / 100) * 5000) / 1000))}s` : 'Ready'}
            </div>
          </div>

          {/* Command line */}
          <div className="space-y-2">
            <div className="text-xs mono text-emerald-500/40">
              $ vault --secure --load
            </div>
            <div className="flex items-center gap-2 justify-center text-xs mono">
              <span className="text-emerald-500">&gt;</span>
              <span className="text-emerald-400 animate-pulse">
                {progressPercent < 40 ? 'Establishing connection' : progressPercent < 70 ? 'Processing modules' : 'Mounting filesystem'}
              </span>
            </div>
          </div>
        </div>

        <style>{`
          .delay-200 { animation-delay: 200ms; }
          .delay-300 { animation-delay: 300ms; }
          .delay-400 { animation-delay: 400ms; }
          .delay-600 { animation-delay: 600ms; }
        `}</style>
      </div>
    );
  }

  if (selectedWriteup) {
    if (selectedWriteup.locked && !isLoggedIn) {
      return (
        <div className="w-full max-w-5xl animate-in fade-in slide-in-from-right-8 duration-700">
          <button 
            onClick={() => setSelectedWriteup(null)}
            className="flex items-center gap-2 text-zinc-500 hover:text-emerald-400 mono text-[9px] mb-8 group transition-colors uppercase font-bold tracking-widest"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            /RETURN_TO_INTEL
          </button>
          <div className="bg-zinc-950/60 border border-zinc-900/80 p-8 rounded-sm relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(16,185,129,0.07), transparent 40%), radial-gradient(circle at 80% 0%, rgba(59,130,246,0.05), transparent 35%)' }} />
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-[9px] mono font-bold border border-emerald-500/20">ID::{selectedWriteup.id}</span>
                  {selectedWriteup.platform && (
                    <span className="text-[9px] mono text-zinc-500 uppercase tracking-[0.2em]">NODE::{(selectedWriteup.platform || '').toUpperCase()}</span>
                  )}
                  <span className="text-[9px] mono text-red-400 uppercase tracking-[0.2em] border border-red-500/30 px-2 py-0.5 rounded">Locked</span>
                </div>
                <div className="flex items-center gap-3 text-[9px] mono text-zinc-500 uppercase">
                  <span className="flex items-center gap-1 border border-zinc-800 px-2 py-1 rounded">{selectedWriteup.date}</span>
                  <span className="flex items-center gap-1 border border-zinc-800 px-2 py-1 rounded">{selectedWriteup.readingTime}</span>
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="text-white text-2xl font-extrabold tracking-tight uppercase">{selectedWriteup.title}</h1>
                {selectedWriteup.excerpt && (
                  <p className="text-zinc-500 text-[12px] leading-relaxed max-w-3xl">{selectedWriteup.excerpt}</p>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800 p-5 rounded-sm shadow-inner">
                  <div className="flex items-center justify-between mb-3">
                    <div className="mono text-[9px] text-emerald-400 uppercase tracking-[0.25em]">Preview</div>
                    {preview.truncated && (
                      <div className="text-[9px] mono text-zinc-500 uppercase tracking-[0.2em]">Partial View</div>
                    )}
                  </div>
                  <div className="prose-industrial text-[13px] text-zinc-100 leading-relaxed space-y-3 preview-body" dangerouslySetInnerHTML={{ __html: preview.html }} />
                  {preview.truncated && (
                    <div className="mt-3 text-[11px] text-zinc-500 mono uppercase tracking-[0.2em]">Preview truncated — login for full content.</div>
                  )}
                </div>

                <div className="space-y-3">
                  {(selectedWriteup.hints || []).slice(0,3).map((hint, i) => (
                    <div key={i} className="border border-emerald-500/30 bg-emerald-500/5 p-4 rounded-sm shadow-sm">
                      <div className="mono text-[9px] text-emerald-400 uppercase mb-1 tracking-[0.2em]">Hint {i+1}</div>
                      <div className="text-[12px] text-zinc-200 leading-relaxed">{hint}</div>
                    </div>
                  ))}
                  {(!selectedWriteup.hints || selectedWriteup.hints.length === 0) && (
                    <div className="border border-zinc-800 bg-zinc-900/40 p-4 rounded-sm text-[12px] text-zinc-500">No hints provided for this entry.</div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-[11px] text-zinc-500 mono uppercase tracking-[0.2em]">Authenticate to unlock full walkthrough and artifacts.</div>
                <button onClick={onLogin} className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2 rounded-sm font-bold mono text-[10px] uppercase shadow-lg shadow-emerald-500/20">Login to Access</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    let htmlContent = '';
    try {
      htmlContent = marked.parse(selectedWriteup.content || '') as string;
    } catch (e) {
      console.error("Markdown parsing failed", e);
      return (
        <div className="w-full max-w-lg mx-auto text-center py-20">
           <AlertTriangle className="text-red-500 mx-auto mb-6" size={48} />
           <h2 className="text-white text-2xl font-black mb-4 uppercase">DATA_CORRUPTION</h2>
           <button onClick={() => setSelectedWriteup(null)} className="px-6 py-2 border border-zinc-800 text-zinc-400 hover:text-white transition-colors mono text-[10px] uppercase font-bold">Return to Index</button>
        </div>
      );
    }

    return (
      <div className="w-full max-w-6xl animate-in fade-in slide-in-from-right-8 duration-700" style={{ willChange: 'transform, opacity' }}>
        <button 
          onClick={() => setSelectedWriteup(null)}
          className="flex items-center gap-2 text-zinc-500 hover:text-emerald-400 mono text-[9px] mb-8 group transition-colors uppercase font-bold tracking-widest"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          /RETURN_TO_INTEL
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <article className="lg:col-span-8 space-y-8" style={{ willChange: 'opacity' }}>
            <header className="border-b border-zinc-900 pb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[9px] mono font-bold border border-emerald-500/20">
                  ID::{selectedWriteup.id}
                </span>
                <span className="text-zinc-600 mono text-[9px] tracking-widest uppercase">{selectedWriteup.category}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-6 leading-tight tracking-tight uppercase">
                {selectedWriteup.title}
              </h1>
              <div className="flex flex-wrap gap-6 text-zinc-500 mono text-[9px] font-bold tracking-wider">
                <div className="flex items-center gap-2 uppercase"><Calendar size={12}/> {selectedWriteup.date}</div>
                <div className="flex items-center gap-2 uppercase"><Clock size={12}/> {selectedWriteup.readingTime}</div>
                <div className="flex items-center gap-2">
                  <Tag size={12}/> 
                  <div className="flex gap-2 uppercase">
                    {selectedWriteup.tags.map(t => <span key={t} className="hover:text-emerald-400 cursor-pointer">#{t}</span>)}
                  </div>
                </div>
              </div>
            </header>

            <div 
              className="prose-industrial"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </article>

          <aside className="lg:col-span-4 hidden lg:block">
            <div className="sticky top-32 space-y-8">
              <div className="bg-zinc-950/40 border border-zinc-900/60 p-6 rounded-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20" />
                <h3 className="text-[9px] mono font-black text-white tracking-[0.3em] uppercase mb-6 flex items-center gap-2">
                  <Database size={12} className="text-emerald-500" />
                  Structure
                </h3>
                <nav className="space-y-4">
                  {toc.length > 0 ? toc.map((item, i) => (
                    <a 
                      key={i} 
                      href={`#${item.id}`}
                      className={`block text-[10px] mono text-zinc-500 hover:text-emerald-400 transition-all group flex items-start gap-3 ${item.depth === 3 ? 'pl-4' : ''}`}
                    >
                      <span className="text-emerald-500/20 group-hover:text-emerald-500 font-black">0{i+1}</span>
                      <span className="uppercase tracking-tight">{item.text}</span>
                    </a>
                  )) : (
                    <span className="text-[9px] mono text-zinc-700 font-bold uppercase">No data units found</span>
                  )}
                </nav>
              </div>

              {imageMeta.length > 0 && (
                <div className="bg-zinc-950/40 border border-zinc-900/60 p-6 rounded-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20" />
                  <h3 className="text-[9px] mono font-black text-white tracking-[0.3em] uppercase mb-6 flex items-center gap-2">
                    <Database size={12} className="text-emerald-500" />
                    Assets
                  </h3>
                  <div className="space-y-3">
                    {imageMeta.map((img, idx) => (
                      <div key={`${img.src}-${idx}`} className="text-[10px] mono text-zinc-500 bg-zinc-900/40 border border-zinc-900 rounded-sm p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-white font-bold truncate" title={img.alt || img.name}>{img.alt || `Image_${idx+1}`}</span>
                          <span className="text-emerald-500 text-[9px] uppercase">{img.status === 'ok' ? 'OK' : img.status === 'error' ? 'ERR' : 'LOAD'}</span>
                        </div>
                        <div className="text-[9px] text-zinc-600 truncate" title={img.name}>{img.name}</div>
                        <div className="text-[9px] text-zinc-500 mt-1">
                          {img.status === 'ok' && img.width && img.height ? `${img.width} x ${img.height}` : 'Resolving...'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4 border-b border-zinc-900 pb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter mb-2 uppercase">
            {platformFilter ? (currentNode?.label || platformFilter) : 'Intel Repository'}
          </h1>
          <p className="text-zinc-500 mono text-[10px] uppercase tracking-[0.4em] flex items-center gap-2 font-bold">
            <span className="w-1.5 h-1.5 bg-emerald-500/40 rounded-full" />
            {platformFilter ? 'Node Archives' : 'Vulnerability & Research Modules'}
          </p>
        </div>
        {platformFilter && (
          <div className="hidden md:flex md:items-end md:justify-end">
            {nodeTags.length > 0 && (
              <div className="flex flex-wrap gap-2 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-sm shadow-xl max-w-xl">
                {nodeTags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="px-2 py-1 text-[9px] mono uppercase border border-zinc-800 rounded-sm text-zinc-400 hover:text-white hover:border-emerald-500/40 transition-colors"
                    title={`Tag: ${tag} (${count})`}
                  >
                    #{tag} <span className="text-zinc-600">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {!platformFilter && (
          <div className="grid grid-cols-3 gap-3 bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-sm shadow-xl w-full md:w-auto">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-emerald-500" />
              <div className="flex flex-col leading-tight">
                <span className="text-[8px] mono text-zinc-500 uppercase tracking-[0.3em]">Total Nodes</span>
                <span className="text-[11px] mono text-white font-black">{sectionNodes.length.toString().padStart(2, '0')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-emerald-300" />
              <div className="flex flex-col leading-tight">
                <span className="text-[8px] mono text-zinc-500 uppercase tracking-[0.3em]">Total Writeups</span>
                <span className="text-[11px] mono text-white font-black">{writeups.length.toString().padStart(2, '0')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-emerald-200" />
              <div className="flex flex-col leading-tight">
                <span className="text-[8px] mono text-zinc-500 uppercase tracking-[0.3em]">Read Time</span>
                <span className="text-[11px] mono text-white font-black">{sectionNodes.reduce((sum, n) => sum + (n.minutes || 0), 0)} min</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sections view: show only platform cards until a section is selected */}
      {!platformFilter && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
          {sectionNodes.map((sec, idx) => {
            const nodeId = `NODE ID.${String(idx + 1).padStart(2, '0')}`;
            const iconColor = idx % 3 === 0 ? 'text-emerald-500' : idx % 3 === 1 ? 'text-violet-500' : 'text-sky-500';
            const iconFor = (label: string) => {
              const L = label.toUpperCase();
              if (L.includes('HACKTHEBOX')) return <Server size={18} className={iconColor} />;
              if (L.includes('TRYHACKME')) return <Cpu size={18} className={iconColor} />;
              if (L.includes('PORTSWIGGER')) return <BookOpen size={18} className={iconColor} />;
              if (L.includes('OFFSEC')) return <Shield size={18} className={iconColor} />;
              if (L.includes('VULNHUB')) return <Box size={18} className={iconColor} />;
              return <Flag size={18} className={iconColor} />;
            };
            return (
              <button
                key={sec.key}
                onClick={() => setPlatformFilter(sec.key)}
                className="group relative bg-zinc-950/40 border border-zinc-900 p-6 rounded-sm transition-all hover:border-emerald-500/40 hover:bg-zinc-900/40 overflow-hidden text-left"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-black border border-zinc-800 rounded flex items-center justify-center">
                      {iconFor(sec.label)}
                    </div>
                    <div className="flex flex-col">
                      <span className="mono text-[9px] text-zinc-600 tracking-widest uppercase">{nodeId}</span>
                      <span className="mono text-[11px] font-black text-white uppercase tracking-[0.2em]">{sec.label}</span>
                    </div>
                  </div>
                  <div className="mono text-[9px] text-zinc-500 uppercase">Status: <span className="text-emerald-400">ONLINE</span></div>
                </div>

                {/* Title */}
                <h3 className="text-white text-xl font-extrabold tracking-tight mb-2">{sec.label.replace('OFFSEC PG', 'Offsec Proving Grounds').replace('PORTSWIGGER', 'Web Security Academy')}</h3>
                <p className="text-zinc-500 text-[12px] leading-relaxed mb-5">{sec.description}</p>

                {/* Stats panel */}
                <div className="grid grid-cols-3 gap-4 border border-zinc-900 rounded-sm p-4 bg-zinc-950/30">
                  <div>
                    <div className="mono text-[9px] text-zinc-600 uppercase">WRITEUPS</div>
                    <div className="mono text-[12px] font-black text-emerald-400">{String(sec.count).padStart(2, '0')}</div>
                  </div>
                  <div>
                    <div className="mono text-[9px] text-zinc-600 uppercase">DIFFICULTY</div>
                    <div className="mono text-[12px] font-black text-white">Mixed</div>
                  </div>
                  <div>
                    <div className="mono text-[9px] text-zinc-600 uppercase">READ TIME</div>
                    <div className="mono text-[12px] font-black text-white">{sec.minutes} min</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="mono text-[9px] text-zinc-600 uppercase">ACCESS &gt;&gt;</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* If a section is chosen, show its writeups list; otherwise no list */}
      {platformFilter && (
      <>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setPlatformFilter(null); setSearchQuery(''); }}
            className="flex items-center gap-2 text-zinc-500 hover:text-emerald-400 mono text-[9px] group transition-colors uppercase font-bold tracking-widest"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            /RETURN_TO_NODES
          </button>
          <div className="mono text-[9px] text-zinc-600 uppercase">NODE::{platformFilter}</div>
        </div>
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-900 px-3 py-2 rounded-sm shadow-inner w-full lg:w-auto">
          <Search size={14} className="text-zinc-700" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="FILTER_IN_NODE"
            className="bg-transparent border-none outline-none text-[9px] mono text-emerald-400 placeholder:text-zinc-800 w-full lg:w-56 font-bold uppercase tracking-widest"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {filteredWriteups.length > 0 ? filteredWriteups.map((w) => (
          <div 
            key={w.id}
            onClick={() => {
              setSelectedWriteup(w);
            }}
            className="group relative bg-zinc-950/20 border border-zinc-900/50 p-8 rounded-sm hover:border-emerald-500/30 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-[8px] mono text-emerald-500/30 font-black group-hover:text-emerald-500 transition-colors uppercase tracking-[0.2em]">PATH::{w.id}</span>
                  <div className="w-1 h-px bg-zinc-800" />
                  <span className="text-[8px] mono text-zinc-700 font-black uppercase tracking-widest">{w.category}</span>
                  {w.platform && (
                    <>
                      <div className="w-1 h-px bg-zinc-800" />
                      <span className="text-[8px] mono text-zinc-700 font-black uppercase tracking-widest">{(w.platform || '').toUpperCase()}</span>
                    </>
                  )}
                  {w.locked && (
                    <>
                      <div className="w-1 h-px bg-zinc-800" />
                      <span className="text-[8px] mono text-red-500 font-black uppercase tracking-widest">LOCKED</span>
                    </>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors mb-2 tracking-tight uppercase">
                    {w.title}
                  </h3>
                  <p className="text-xs text-zinc-500 line-clamp-2 max-w-2xl leading-relaxed group-hover:text-zinc-400 transition-colors">
                    {w.excerpt}
                  </p>
                  {w.locked && !isLoggedIn && w.hints && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {w.hints.slice(0,2).map((hint, i) => (
                        <div key={i} className="border border-emerald-500/30 bg-emerald-500/5 p-3 rounded-sm">
                          <div className="mono text-[8px] text-emerald-400 uppercase mb-1">HINT {i+1}</div>
                          <div className="text-[11px] text-zinc-300 leading-relaxed">{hint}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="text-right">
                   <div className="text-[7px] mono text-zinc-800 font-black uppercase tracking-tighter">Complexity</div>
                   <div className="text-[10px] text-zinc-500 mono font-bold group-hover:text-emerald-400 uppercase">{w.readingTime}</div>
                </div>
                <div className="p-2 border border-zinc-900 group-hover:border-emerald-500/50 transition-all rounded-sm">
                  <ChevronRight size={14} className="text-zinc-800 group-hover:text-emerald-400" />
                </div>
              </div>
            </div>
            
            {/* Removed heavy blur effect for smoother hover performance */}
          </div>
        )) : (
          <div className="text-center py-20 border border-dashed border-zinc-900 rounded-sm">
            <span className="mono text-[9px] text-zinc-800 uppercase font-black tracking-[0.5em]">No matching records found.</span>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};

export default WriteupView;