import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Tag, ChevronLeft, ChevronRight, Loader2, Database, AlertTriangle, Server, Cpu, Flag, Box, Shield, BookOpen, Search, Zap, Lock, FileText, Layers, LogIn } from 'lucide-react';
import { PLATFORMS_METRICS } from '../constants';
import { Writeup } from '../types';
import { loadAllWriteups } from '../services/writeupLoader';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { useAuth } from '../context/AuthContext';

interface WriteupViewProps {
  onBack: () => void;
  isLoggedIn?: boolean;
  isApproved?: boolean;
  onLogin?: () => void;
}

const WriteupView: React.FC<WriteupViewProps> = ({ onBack }) => {
  // Use auth context directly
  const { isAuthenticated, isApproved, login, isLoading: authLoading } = useAuth();
  
  const [writeups, setWriteups] = useState<Writeup[]>([]);
  const [selectedWriteup, setSelectedWriteup] = useState<Writeup | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStats, setLoadingStats] = useState({
    writeups: 0,
    platforms: 0,
    tags: 0,
    minutes: 0
  });
  const [loadingPhase, setLoadingPhase] = useState<'connecting' | 'scanning' | 'decrypting' | 'loading' | 'complete'>('connecting');
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [imageMeta, setImageMeta] = useState<{ src: string; alt: string; name: string; width?: number; height?: number; status: 'loading' | 'ok' | 'error' }[]>([]);

  // Inject ultra-thin scrollbar styles for code blocks
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'writeup-styles';
    style.innerHTML = `
      /* Class to disable body scroll when viewing writeup */
      body.writeup-open,
      html.writeup-open {
        overflow: hidden !important;
        height: 100vh !important;
        max-height: 100vh !important;
      }
      
      body.writeup-open > div,
      html.writeup-open body > div {
        overflow: hidden !important;
        height: 100vh !important;
        max-height: 100vh !important;
      }
      
      body.writeup-open main,
      html.writeup-open main {
        overflow: hidden !important;
        max-height: calc(100vh - 80px) !important;
        padding-bottom: 0 !important;
      }
      
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
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      /* Writeup article scrollbar */
      article::-webkit-scrollbar {
        width: 6px !important;
      }
      article::-webkit-scrollbar-track {
        background: #18181b !important;
        border-radius: 3px !important;
      }
      article::-webkit-scrollbar-thumb {
        background: #10b981 !important;
        border-radius: 3px !important;
      }
      article::-webkit-scrollbar-thumb:hover {
        background: #059669 !important;
      }
      
      /* Sidebar scrollbar */
      aside > div::-webkit-scrollbar {
        width: 4px !important;
      }
      aside > div::-webkit-scrollbar-track {
        background: transparent !important;
      }
      aside > div::-webkit-scrollbar-thumb {
        background: #10b981 !important;
        border-radius: 2px !important;
      }
      
      /* Smooth scroll behavior */
      html {
        scroll-behavior: smooth;
      }
      
      /* Scroll margin for anchor links */
      .scroll-mt-8 {
        scroll-margin-top: 2rem;
      }
      
      /* Highlight animation when scrolled to */
      h1:target, h2:target, h3:target, h4:target {
        animation: highlight-flash 1.5s ease-out;
      }
      @keyframes highlight-flash {
        0% { background: rgba(16, 185, 129, 0.3); }
        100% { background: transparent; }
      }

      /* Enhanced prose styling for writeups - compact for mobile */
      .prose-industrial,
      .preview-body {
        color: #e4e4e7;
        line-height: 1.6;
        font-size: 13px;
        word-break: break-word;
      }
      @media (max-width: 640px) {
        .prose-industrial,
        .preview-body {
          font-size: 12px;
          line-height: 1.55;
        }
      }
      .prose-industrial h1, .preview-body h1 {
        font-size: 20px;
        font-weight: 800;
        margin: 20px 0 10px;
        color: #fff;
        letter-spacing: -0.02em;
        border-bottom: 1px solid #27272a;
        padding-bottom: 8px;
      }
      @media (max-width: 640px) {
        .prose-industrial h1, .preview-body h1 {
          font-size: 17px;
          margin: 16px 0 8px;
        }
      }
      .prose-industrial h2, .preview-body h2 {
        font-size: 17px;
        font-weight: 700;
        margin: 18px 0 8px;
        color: #fff;
        letter-spacing: -0.01em;
      }
      @media (max-width: 640px) {
        .prose-industrial h2, .preview-body h2 {
          font-size: 15px;
          margin: 14px 0 6px;
        }
      }
      .prose-industrial h3, .preview-body h3 {
        font-size: 15px;
        font-weight: 700;
        margin: 16px 0 6px;
        color: #f4f4f5;
      }
      @media (max-width: 640px) {
        .prose-industrial h3, .preview-body h3 {
          font-size: 13px;
          margin: 12px 0 5px;
        }
      }
      .prose-industrial h4, .preview-body h4 {
        font-size: 14px;
        font-weight: 600;
        margin: 14px 0 6px;
        color: #e4e4e7;
      }
      @media (max-width: 640px) {
        .prose-industrial h4, .preview-body h4 {
          font-size: 12px;
          margin: 10px 0 4px;
        }
      }
      .prose-industrial p, .preview-body p {
        margin: 10px 0;
        color: #d4d4d8;
      }
      @media (max-width: 640px) {
        .prose-industrial p, .preview-body p {
          margin: 8px 0;
        }
      }
      .prose-industrial strong, .preview-body strong {
        color: #fff;
        font-weight: 600;
      }
      .prose-industrial em, .preview-body em {
        color: #a1a1aa;
        font-style: italic;
      }
      .prose-industrial code, .preview-body code {
        background: rgba(52, 211, 153, 0.1);
        color: #a5f3fc;
        padding: 1px 4px;
        border-radius: 3px;
        font-size: 0.75em;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        border: 1px solid rgba(52, 211, 153, 0.15);
      }
      @media (max-width: 640px) {
        .prose-industrial code, .preview-body code {
          font-size: 0.7em;
          padding: 1px 3px;
        }
      }
      .prose-industrial pre, .preview-body pre {
        margin: 10px 0;
        border-radius: 4px;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: thin;
        scrollbar-color: #10b981 #18181b;
      }
      .prose-industrial pre::-webkit-scrollbar, .preview-body pre::-webkit-scrollbar {
        height: 6px;
      }
      .prose-industrial pre::-webkit-scrollbar-track, .preview-body pre::-webkit-scrollbar-track {
        background: #18181b;
        border-radius: 3px;
      }
      .prose-industrial pre::-webkit-scrollbar-thumb, .preview-body pre::-webkit-scrollbar-thumb {
        background: #10b981;
        border-radius: 3px;
      }
      @media (max-width: 640px) {
        .prose-industrial pre, .preview-body pre {
          margin: 6px 0;
        }
        .prose-industrial pre::-webkit-scrollbar, .preview-body pre::-webkit-scrollbar {
          height: 4px;
        }
      }
      .prose-industrial pre code, .preview-body pre code {
        display: block;
        padding: 10px;
        background: rgba(12, 12, 12, 0.95);
        border: 1px solid #27272a;
        border-radius: 4px;
        font-size: 9px;
        line-height: 1.4;
        white-space: pre;
        overflow-x: visible;
        -webkit-overflow-scrolling: touch;
      }
      @media (max-width: 640px) {
        .prose-industrial pre code, .preview-body pre code {
          font-size: 8px;
          padding: 6px;
          line-height: 1.35;
          letter-spacing: -0.02em;
        }
      }
      /* Enhanced resource links */
      .prose-industrial a, .preview-body a {
        color: #34d399;
        text-decoration: none;
        transition: all 0.2s;
        padding: 2px 6px;
        border-radius: 3px;
        background: rgba(52, 211, 153, 0.08);
        border: 1px solid rgba(52, 211, 153, 0.2);
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.9em;
        word-break: break-word;
      }
      .prose-industrial a::before, .preview-body a::before {
        content: '↗';
        font-size: 0.8em;
        opacity: 0.7;
      }
      .prose-industrial a:hover, .preview-body a:hover {
        color: #6ee7b7;
        background: rgba(52, 211, 153, 0.15);
        border-color: rgba(52, 211, 153, 0.4);
        box-shadow: 0 0 12px rgba(52, 211, 153, 0.15);
      }
      @media (max-width: 640px) {
        .prose-industrial a, .preview-body a {
          font-size: 0.8em;
          padding: 1px 4px;
          gap: 3px;
        }
        .prose-industrial a::before, .preview-body a::before {
          font-size: 0.7em;
        }
      }
      .prose-industrial blockquote, .preview-body blockquote {
        border-left: 2px solid #10b981;
        padding: 8px 12px;
        margin: 10px 0;
        background: rgba(16, 185, 129, 0.05);
        border-radius: 0 3px 3px 0;
        color: #a1a1aa;
        font-style: italic;
        font-size: 12px;
      }
      @media (max-width: 640px) {
        .prose-industrial blockquote, .preview-body blockquote {
          padding: 6px 10px;
          margin: 8px 0;
          font-size: 11px;
        }
      }
      .prose-industrial blockquote p, .preview-body blockquote p {
        margin: 0;
      }
      .prose-industrial ul, .preview-body ul {
        padding-left: 18px;
        margin: 10px 0;
        list-style-type: disc;
      }
      .prose-industrial ol, .preview-body ol {
        padding-left: 18px;
        margin: 10px 0;
        list-style-type: decimal;
      }
      @media (max-width: 640px) {
        .prose-industrial ul, .preview-body ul,
        .prose-industrial ol, .preview-body ol {
          padding-left: 16px;
          margin: 8px 0;
        }
      }
      .prose-industrial li, .preview-body li {
        margin: 5px 0;
        color: #d4d4d8;
      }
      @media (max-width: 640px) {
        .prose-industrial li, .preview-body li {
          margin: 4px 0;
        }
      }
      .prose-industrial li::marker {
        color: #10b981;
      }
      .prose-industrial hr, .preview-body hr {
        border: none;
        border-top: 1px solid #27272a;
        margin: 16px 0;
      }
      @media (max-width: 640px) {
        .prose-industrial hr, .preview-body hr {
          margin: 12px 0;
        }
      }
      .prose-industrial table, .preview-body table {
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0;
        font-size: 11px;
      }
      @media (max-width: 640px) {
        .prose-industrial table, .preview-body table {
          font-size: 10px;
          display: block;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 8px 0;
        }
      }
      .prose-industrial th, .preview-body th {
        text-align: left;
        background: rgba(39, 39, 42, 0.8);
        color: #e4e4e7;
        padding: 6px 8px;
        border: 1px solid #27272a;
        font-weight: 600;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      @media (max-width: 640px) {
        .prose-industrial th, .preview-body th {
          padding: 5px 6px;
          font-size: 9px;
        }
      }
      .prose-industrial td, .preview-body td {
        padding: 6px 8px;
        border: 1px solid #27272a;
        color: #d4d4d8;
      }
      @media (max-width: 640px) {
        .prose-industrial td, .preview-body td {
          padding: 5px 6px;
        }
      }
      .prose-industrial tr:nth-child(even) td {
        background: rgba(24, 24, 27, 0.5);
      }
      .prose-industrial img, .preview-body img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 12px auto;
        border: 1px solid #27272a;
        border-radius: 4px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
      }
      @media (max-width: 640px) {
        .prose-industrial img, .preview-body img {
          margin: 8px auto;
          border-radius: 3px;
        }
      }
      .prose-industrial .callout, .preview-body .callout {
        margin: 10px 0;
        font-size: 12px;
      }
      @media (max-width: 640px) {
        .prose-industrial .callout, .preview-body .callout {
          margin: 8px 0;
          font-size: 11px;
        }
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
        heading(text: string, level: number) {
          const id = text.toLowerCase().replace(/[^\w]+/g, '-');
          return `<h${level} id="${id}" class="scroll-mt-8">${text}</h${level}>`;
        },
        code(code: string, infostring: string) {
          const parts = (infostring || '').split(/\s+/).filter(Boolean);
          const lang = parts[0] || '';
          const titlePart = parts.find(p => p.startsWith('title='));
          const title = titlePart ? titlePart.replace(/^title=\"/, '').replace(/\"$/, '') : '';
          const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
          try {
            const highlighted = hljs.highlight(code || '', { language }).value;
            const titleBar = title ? `<div style="background:rgba(39,39,42,0.9);color:#e4e4e7;font-size:9px;padding:4px 8px;border-bottom:1px solid #27272a;font-family:monospace;letter-spacing:0.05em;">${title}</div>` : '';
            return `<div class="code-block" style="border:1px solid #27272a;background:rgba(12,12,12,0.85);border-radius:4px;overflow:hidden;margin:8px 0;">${titleBar}<pre style="margin:0;overflow-x:auto;scrollbar-width:thin;scrollbar-color:#10b981 #18181b;">`+
              `<code class="hljs ${language}" style="font-size:9px;line-height:1.4;white-space:pre;padding:8px;display:block;">${highlighted}</code></pre></div>`;
          } catch (e) {
            return `<pre style="overflow-x:auto;"><code style="font-size:9px;white-space:pre;">${code || ''}</code></pre>`;
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
        setLoadingStats({ writeups: 0, platforms: 0, tags: 0, minutes: 0 });
        setTerminalLines([]);
        setLoadingPhase('connecting');

        // Terminal output simulation
        const addTerminalLine = (line: string) => {
          setTerminalLines(prev => [...prev.slice(-8), line]);
        };

        // Phase 1: Connecting
        addTerminalLine('$ vault --connect --secure');
        await new Promise(r => setTimeout(r, 400));
        addTerminalLine('> Establishing secure connection...');
        setLoadingProgress(10);

        await new Promise(r => setTimeout(r, 600));
        addTerminalLine('> Connection established [TLS 1.3]');
        setLoadingProgress(20);
        setLoadingPhase('scanning');

        // Phase 2: Scanning
        await new Promise(r => setTimeout(r, 400));
        addTerminalLine('$ scan --bucket writeups --recursive');
        setLoadingProgress(30);

        await new Promise(r => setTimeout(r, 500));
        addTerminalLine('> Scanning storage bucket...');
        setLoadingProgress(40);

        // Actually load the data
        const data = await loadAllWriteups();
        const validData = data || [];

        // Calculate target stats
        const parseMinutes = (rt?: string): number => {
          if (!rt) return 0;
          const m = rt.match(/(\d+)\s*MIN/i);
          return m ? parseInt(m[1], 10) : 0;
        };

        const allTags = new Set<string>();
        const allPlatforms = new Set<string>();
        let totalMinutes = 0;

        validData.forEach(w => {
          if (w.platform) allPlatforms.add(w.platform.toUpperCase());
          (w.tags || []).forEach(t => allTags.add(t.toLowerCase()));
          totalMinutes += parseMinutes(w.readingTime);
        });

        const targetStats = {
          writeups: validData.length,
          platforms: allPlatforms.size,
          tags: allTags.size,
          minutes: totalMinutes
        };

        addTerminalLine(`> Found ${validData.length} writeup files`);
        setLoadingProgress(50);
        setLoadingPhase('decrypting');

        // Phase 3: Decrypting
        await new Promise(r => setTimeout(r, 400));
        addTerminalLine('$ decrypt --all --verify-checksum');
        setLoadingProgress(60);

        await new Promise(r => setTimeout(r, 500));
        addTerminalLine('> Decrypting writeup modules...');
        setLoadingProgress(70);

        // Animate stats counting up
        const steps = 20;
        const stepDelay = 60;
        
        for (let i = 1; i <= steps; i++) {
          await new Promise(r => setTimeout(r, stepDelay));
          const progress = i / steps;
          setLoadingStats({
            writeups: Math.round(targetStats.writeups * progress),
            platforms: Math.round(targetStats.platforms * progress),
            tags: Math.round(targetStats.tags * progress),
            minutes: Math.round(targetStats.minutes * progress)
          });
          setLoadingProgress(70 + (progress * 20));
        }

        setLoadingPhase('loading');
        addTerminalLine('> Verification complete');
        setLoadingProgress(92);

        // Phase 4: Loading
        await new Promise(r => setTimeout(r, 400));
        addTerminalLine('$ mount --filesystem /writeups');
        setLoadingProgress(95);

        await new Promise(r => setTimeout(r, 500));
        addTerminalLine('> Mounting encrypted filesystem...');
        setLoadingProgress(98);

        await new Promise(r => setTimeout(r, 400));
        addTerminalLine('> System ready');
        setLoadingProgress(100);
        setLoadingPhase('complete');

        // Brief pause to show completion
        await new Promise(r => setTimeout(r, 800));
        
        setWriteups(validData);
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
      // Disable body scroll when viewing writeup using CSS class
      document.body.classList.add('writeup-open');
      document.documentElement.classList.add('writeup-open');
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      // Re-enable body scroll when not viewing writeup
      document.body.classList.remove('writeup-open');
      document.documentElement.classList.remove('writeup-open');
    }
    return () => {
      document.body.classList.remove('writeup-open');
      document.documentElement.classList.remove('writeup-open');
    };
  }, [selectedWriteup]);

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
                    <Lock size={12} className="sm:hidden text-emerald-500" />
                    <Lock size={14} className="hidden sm:block text-emerald-500" />
                    <div className="absolute inset-0 animate-ping opacity-30">
                      <Lock size={12} className="sm:hidden text-emerald-500" />
                      <Lock size={14} className="hidden sm:block text-emerald-500" />
                    </div>
                  </div>
                  <span className="mono text-[8px] sm:text-[10px] text-emerald-400 uppercase tracking-[0.15em] sm:tracking-[0.2em] font-bold">
                    Vault Access
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                  <span className="mono text-[8px] sm:text-[9px] text-zinc-500 uppercase tracking-wider">Secure</span>
                </div>
              </div>

              {/* Main loading content */}
              <div className="p-2.5 sm:p-6 space-y-2.5 sm:space-y-6">
                {/* Title Section */}
                <div className="text-center space-y-1 sm:space-y-3">
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <span className="text-emerald-500/30 text-base sm:text-2xl font-light">[</span>
                    <h1 className="text-lg sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-violet-400 tracking-tight">
                      ACCESSING ARCHIVE
                    </h1>
                    <span className="text-violet-500/30 text-base sm:text-2xl font-light">]</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <Zap size={8} className="sm:hidden text-emerald-500 animate-pulse" />
                    <Zap size={12} className="hidden sm:block text-emerald-500 animate-pulse" />
                    <span className="mono text-[8px] sm:text-[11px] text-emerald-500 font-bold tracking-[0.08em] sm:tracking-[0.15em] animate-pulse">
                      {loadingPhase === 'connecting' && 'CONNECTING...'}
                      {loadingPhase === 'scanning' && 'SCANNING...'}
                      {loadingPhase === 'decrypting' && 'DECRYPTING...'}
                      {loadingPhase === 'loading' && 'MOUNTING...'}
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
                        {loadingPhase === 'connecting' && 'Initializing connection...'}
                        {loadingPhase === 'scanning' && 'Scanning storage...'}
                        {loadingPhase === 'decrypting' && 'Decrypting modules...'}
                        {loadingPhase === 'loading' && 'Preparing filesystem...'}
                        {loadingPhase === 'complete' && 'All loaded successfully.'}
                      </span>
                    </div>
                    <span className="mono text-[10px] sm:text-[11px] text-emerald-400 font-bold ml-2">{progressPercent}%</span>
                  </div>
                </div>

                {/* Stats Grid - 2x2 on mobile, 4 on desktop */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                  {/* Writeups */}
                  <div className="group relative border border-zinc-800 bg-zinc-900/30 p-1.5 sm:p-3 rounded-sm overflow-hidden hover:border-emerald-500/30 transition-all duration-300">
                    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                      <FileText size={8} className="sm:hidden text-emerald-500" />
                      <FileText size={10} className="hidden sm:block text-emerald-500" />
                      <span className="mono text-[6px] sm:text-[8px] text-zinc-600 uppercase">Writeups</span>
                    </div>
                    <div className="text-sm sm:text-xl font-black text-emerald-400 font-mono">{loadingStats.writeups}</div>
                  </div>

                  {/* Platforms */}
                  <div className="group relative border border-zinc-800 bg-zinc-900/30 p-1.5 sm:p-3 rounded-sm overflow-hidden hover:border-blue-500/30 transition-all duration-300">
                    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                      <Server size={8} className="sm:hidden text-blue-500" />
                      <Server size={10} className="hidden sm:block text-blue-500" />
                      <span className="mono text-[6px] sm:text-[8px] text-zinc-600 uppercase">Platforms</span>
                    </div>
                    <div className="text-sm sm:text-xl font-black text-blue-400 font-mono">{loadingStats.platforms}</div>
                  </div>

                  {/* Tags */}
                  <div className="group relative border border-zinc-800 bg-zinc-900/30 p-1.5 sm:p-3 rounded-sm overflow-hidden hover:border-violet-500/30 transition-all duration-300">
                    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                      <Tag size={8} className="sm:hidden text-violet-500" />
                      <Tag size={10} className="hidden sm:block text-violet-500" />
                      <span className="mono text-[6px] sm:text-[8px] text-zinc-600 uppercase">Tags</span>
                    </div>
                    <div className="text-sm sm:text-xl font-black text-violet-400 font-mono">{loadingStats.tags}</div>
                  </div>

                  {/* Reading Time */}
                  <div className="group relative border border-zinc-800 bg-zinc-900/30 p-1.5 sm:p-3 rounded-sm overflow-hidden hover:border-orange-500/30 transition-all duration-300">
                    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                      <Clock size={8} className="sm:hidden text-orange-500" />
                      <Clock size={10} className="hidden sm:block text-orange-500" />
                      <span className="mono text-[6px] sm:text-[8px] text-zinc-600 uppercase">Minutes</span>
                    </div>
                    <div className="text-sm sm:text-xl font-black text-orange-400 font-mono">{loadingStats.minutes}</div>
                  </div>
                </div>

                {/* Phase Indicators */}
                <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                  {['connecting', 'scanning', 'decrypting', 'loading', 'complete'].map((phase, i) => {
                    const isActive = loadingPhase === phase;
                    const isPast = ['connecting', 'scanning', 'decrypting', 'loading', 'complete'].indexOf(loadingPhase) > i;
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
                  <span className="mono text-[7px] sm:text-[9px] text-zinc-600 ml-1 sm:ml-2">vault@Cyb3rWo9f</span>
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

  if (selectedWriteup) {
    // Locked content requires being authenticated AND approved
    const canAccessLocked = isAuthenticated && isApproved;
    
    if (selectedWriteup.locked && !canAccessLocked) {
      return (
        <div className="w-full max-w-5xl animate-in fade-in slide-in-from-right-8 duration-700 px-2 sm:px-0 h-[calc(100vh-180px)] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#10b981 #18181b' }}>
          {/* Back Button */}
          <button 
            onClick={() => setSelectedWriteup(null)}
            className="flex items-center gap-2 text-zinc-500 hover:text-emerald-400 mono text-[9px] sm:text-[10px] mb-4 group transition-colors uppercase font-bold tracking-widest"
          >
            <div className="p-1.5 border border-zinc-800 group-hover:border-emerald-500/50 rounded-sm transition-colors">
              <ChevronLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <span className="hidden sm:inline">/RETURN_TO_INTEL</span>
            <span className="sm:hidden">Back</span>
          </button>

          {/* Main Container */}
          <div className="relative border border-zinc-800 bg-zinc-950/80 rounded-sm overflow-hidden">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-l-2 border-red-500/40" />
            <div className="absolute top-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-r-2 border-red-500/40" />
            <div className="absolute bottom-0 left-0 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-l-2 border-red-500/40" />
            <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-r-2 border-red-500/40" />

            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(239,68,68,0.08), transparent 40%), radial-gradient(circle at 80% 80%, rgba(16,185,129,0.05), transparent 40%)' }} />
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-red-500/50 via-transparent to-transparent" />
            </div>

            {/* Header Section */}
            <div className="relative border-b border-zinc-800 p-3 sm:p-4 bg-zinc-900/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-sm text-[8px] sm:text-[9px] mono font-bold border border-emerald-500/20">ID::{selectedWriteup.id}</span>
                  {selectedWriteup.platform && (
                    <span className="text-[8px] sm:text-[9px] mono text-zinc-600 uppercase tracking-wider">NODE::{(selectedWriteup.platform || '').toUpperCase()}</span>
                  )}
                  <div className="flex items-center gap-1.5 px-2 py-1 border border-red-500/40 bg-red-500/10 rounded-sm">
                    <Lock size={10} className="text-red-400" />
                    <span className="text-[8px] sm:text-[9px] mono text-red-400 uppercase font-bold">Locked</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-[8px] sm:text-[9px] mono text-zinc-600">
                  <div className="flex items-center gap-1.5 border border-zinc-800 px-2 py-1 rounded-sm bg-black/20">
                    <Calendar size={10} className="text-zinc-600" />
                    <span>{selectedWriteup.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 border border-zinc-800 px-2 py-1 rounded-sm bg-black/20">
                    <Clock size={10} className="text-zinc-600" />
                    <span>{selectedWriteup.readingTime}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <h1 className="text-white text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight">{selectedWriteup.title}</h1>
                {selectedWriteup.excerpt && (
                  <p className="text-zinc-500 text-[11px] sm:text-[12px] leading-relaxed max-w-3xl">{selectedWriteup.excerpt}</p>
                )}
                {selectedWriteup.tags && selectedWriteup.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {selectedWriteup.tags.slice(0, 5).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-[8px] sm:text-[9px] mono text-zinc-500 border border-zinc-800 rounded-sm uppercase bg-black/20">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Content Section */}
            <div className="relative p-3 sm:p-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Preview Panel */}
                <div className="lg:col-span-2 relative">
                  <div className="border border-zinc-800 bg-black/40 rounded-sm overflow-hidden">
                    {/* Preview Header */}
                    <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500/80" />
                          <span className="w-2 h-2 rounded-full bg-yellow-500/80" />
                          <span className="w-2 h-2 rounded-full bg-green-500/80" />
                        </div>
                        <span className="mono text-[8px] sm:text-[9px] text-emerald-400 uppercase tracking-wider font-bold">Content Preview</span>
                      </div>
                      <span className="mono text-[7px] sm:text-[8px] text-zinc-600 uppercase">Read-Only</span>
                    </div>

                    {/* Preview Content with Blur */}
                    <div className="relative p-3 sm:p-4 max-h-[200px] sm:max-h-[250px] overflow-hidden">
                      <div className="prose-industrial preview-body" dangerouslySetInnerHTML={{ __html: preview.html }} />
                      
                      {/* Gradient blur overlay */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/95 pointer-events-none" />
                      <div className="absolute bottom-0 inset-x-0 h-32 sm:h-40 backdrop-blur-[2px] bg-gradient-to-t from-black/90 via-black/70 to-transparent pointer-events-none" />
                      
                      {/* Lock indicator overlay */}
                      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 pb-4 sm:pb-6">
                        <div className="p-2.5 sm:p-3 border border-red-500/30 bg-black/80 rounded-full shadow-lg shadow-red-500/10">
                          <Lock size={18} className="sm:hidden text-red-400" />
                          <Lock size={22} className="hidden sm:block text-red-400" />
                        </div>
                        <span className="mono text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-wider">Full content locked</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hints Panel */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={12} className="text-emerald-500" />
                    <span className="mono text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Available Hints</span>
                  </div>
                  {(selectedWriteup.hints || []).slice(0, 3).map((hint, i) => (
                    <div key={i} className="group relative border border-emerald-500/30 bg-emerald-500/5 p-3 sm:p-4 rounded-sm overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-emerald-500/50" />
                      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-emerald-500/50" />
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="mono text-[8px] sm:text-[9px] text-emerald-400 uppercase font-bold tracking-wider">Hint #{i + 1}</span>
                      </div>
                      <div className="text-[11px] sm:text-[12px] text-zinc-300 leading-relaxed">{hint}</div>
                    </div>
                  ))}
                  {(!selectedWriteup.hints || selectedWriteup.hints.length === 0) && (
                    <div className="border border-zinc-800 bg-zinc-900/40 p-3 sm:p-4 rounded-sm">
                      <div className="flex items-center gap-2 text-zinc-600">
                        <AlertTriangle size={14} />
                        <span className="text-[11px] sm:text-[12px]">No hints available for this writeup.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="relative border-t border-zinc-800 p-3 sm:p-4 bg-zinc-900/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {!isAuthenticated ? (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-zinc-600" />
                        <span className="text-[10px] sm:text-[11px] text-zinc-500 mono uppercase tracking-wider">Authentication Required</span>
                      </div>
                      <p className="text-[11px] sm:text-[12px] text-zinc-600">Sign in with Google to request access to locked content.</p>
                    </div>
                    <button 
                      onClick={login} 
                      className="group flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-5 sm:px-6 py-2.5 rounded-sm font-bold mono text-[9px] sm:text-[10px] uppercase shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/40"
                    >
                      <LogIn size={12} className="group-hover:scale-110 transition-transform" />
                      Sign In to Unlock
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-amber-500 animate-pulse" />
                        <span className="text-[10px] sm:text-[11px] text-amber-500 mono uppercase tracking-wider font-bold">Pending Approval</span>
                      </div>
                      <p className="text-[11px] sm:text-[12px] text-zinc-600">Your account is awaiting admin approval for full access.</p>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 border border-amber-500/30 bg-amber-500/10 rounded-sm">
                      <div className="relative">
                        <div className="w-2 h-2 bg-amber-500 rounded-full" />
                        <div className="absolute inset-0 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                      </div>
                      <span className="text-[9px] sm:text-[10px] mono text-amber-400 uppercase tracking-wider">Review in progress</span>
                    </div>
                  </>
                )}
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
      <div className="w-full max-w-6xl animate-in fade-in slide-in-from-right-8 duration-700 h-[calc(100vh-180px)]" style={{ willChange: 'transform, opacity' }}>
        <button 
          onClick={() => setSelectedWriteup(null)}
          className="flex items-center gap-2 text-zinc-500 hover:text-emerald-400 mono text-[9px] mb-4 group transition-colors uppercase font-bold tracking-widest"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          /RETURN_TO_INTEL
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100%-40px)]">
          <article id="writeup-content" className="lg:col-span-8 space-y-6 overflow-y-auto pr-4 scroll-smooth" style={{ scrollbarWidth: 'thin', scrollbarColor: '#10b981 #18181b' }}>
            <header className="border-b border-zinc-900 pb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[9px] mono font-bold border border-emerald-500/20">
                  ID::{selectedWriteup.id}
                </span>
                <span className="text-zinc-600 mono text-[9px] tracking-widest uppercase">{selectedWriteup.category}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-4 leading-tight tracking-tight uppercase">
                {selectedWriteup.title}
              </h1>
              <div className="flex flex-wrap gap-4 text-zinc-500 mono text-[9px] font-bold tracking-wider">
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

          <aside className="lg:col-span-4 hidden lg:block h-full">
            <div className="space-y-4">
              {/* Structure Section - Minimal */}
              <div className="bg-zinc-950/80 border border-zinc-800/50 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-emerald-500" />
                    <span className="text-[10px] mono font-bold text-zinc-300 uppercase tracking-wider">Structure</span>
                  </div>
                  <span className="text-[9px] mono text-zinc-600">{toc.length}</span>
                </div>
                
                <nav className="p-2 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#10b981 transparent' }}>
                  {toc.length > 0 ? toc.map((item, i) => (
                    <button 
                      key={i}
                      onClick={() => {
                        const articleContainer = document.getElementById('writeup-content');
                        const element = document.getElementById(item.id);
                        if (element && articleContainer) {
                          const offsetTop = element.offsetTop - articleContainer.offsetTop;
                          articleContainer.scrollTo({ top: offsetTop - 20, behavior: 'smooth' });
                        }
                      }}
                      className={`w-full text-left flex items-center gap-2 py-2 px-3 rounded-md text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/5 transition-colors ${item.depth === 3 ? 'pl-6' : ''}`}
                    >
                      <span className="text-[9px] mono text-zinc-700 w-4">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-[10px] mono uppercase tracking-tight truncate">{item.text}</span>
                    </button>
                  )) : (
                    <div className="text-[9px] mono text-zinc-700 py-3 px-3">No sections</div>
                  )}
                </nav>
              </div>

              {/* Assets Section - Minimal */}
              {imageMeta.length > 0 && (
                <div className="bg-zinc-950/80 border border-zinc-800/50 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-violet-500" />
                      <span className="text-[10px] mono font-bold text-zinc-300 uppercase tracking-wider">Assets</span>
                    </div>
                    <span className="text-[9px] mono text-zinc-600">{imageMeta.length}</span>
                  </div>
                  
                  <div className="p-2 max-h-[200px] overflow-y-auto space-y-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#8b5cf6 transparent' }}>
                    {imageMeta.map((img, idx) => (
                      <div key={`${img.src}-${idx}`} className="flex items-center justify-between gap-2 py-2 px-3 rounded-md hover:bg-violet-500/5 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[9px] mono text-zinc-700 w-4">{String(idx + 1).padStart(2, '0')}</span>
                          <span className="text-[10px] mono text-zinc-400 truncate">{img.alt || img.name}</span>
                        </div>
                        <span className={`text-[8px] mono uppercase ${
                          img.status === 'ok' ? 'text-emerald-500' : img.status === 'error' ? 'text-red-500' : 'text-amber-500'
                        }`}>
                          {img.status === 'ok' ? '✓' : img.status === 'error' ? '✗' : '...'}
                        </span>
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
                <span className="text-[8px] mono text-zinc-500 uppercase tracking-[0.3em]">Writeups</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-12">
          {sectionNodes.map((sec, idx) => {
            const nodeId = `NODE.${String(idx + 1).padStart(2, '0')}`;
            const accentColors = [
              { border: 'border-emerald-500/40', bg: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
              { border: 'border-violet-500/40', bg: 'bg-violet-500', text: 'text-violet-400', glow: 'shadow-violet-500/20' },
              { border: 'border-sky-500/40', bg: 'bg-sky-500', text: 'text-sky-400', glow: 'shadow-sky-500/20' },
              { border: 'border-amber-500/40', bg: 'bg-amber-500', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
              { border: 'border-rose-500/40', bg: 'bg-rose-500', text: 'text-rose-400', glow: 'shadow-rose-500/20' },
              { border: 'border-cyan-500/40', bg: 'bg-cyan-500', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
            ];
            const accent = accentColors[idx % accentColors.length];
            const iconFor = (label: string) => {
              const L = label.toUpperCase();
              if (L.includes('HACKTHEBOX')) return <Server size={16} className={accent.text} />;
              if (L.includes('TRYHACKME')) return <Cpu size={16} className={accent.text} />;
              if (L.includes('PORTSWIGGER')) return <BookOpen size={16} className={accent.text} />;
              if (L.includes('OFFSEC')) return <Shield size={16} className={accent.text} />;
              if (L.includes('VULNHUB')) return <Box size={16} className={accent.text} />;
              return <Flag size={16} className={accent.text} />;
            };
            const displayName = sec.label
              .replace('OFFSEC PG', 'Offsec PG')
              .replace('PORTSWIGGER', 'PortSwigger')
              .replace('HACKTHEBOX', 'HackTheBox')
              .replace('TRYHACKME', 'TryHackMe')
              .replace('VULNHUB', 'VulnHub')
              .replace('OTHERS', 'Others');

            return (
              <button
                key={sec.key}
                onClick={() => setPlatformFilter(sec.key)}
                className={`group relative bg-zinc-950/60 border border-zinc-800 hover:${accent.border} p-4 sm:p-5 rounded-sm transition-all duration-300 hover:bg-zinc-900/60 overflow-hidden text-left`}
              >
                {/* Corner brackets */}
                <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-zinc-700 group-hover:${accent.border} transition-colors`} />
                <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-zinc-700 group-hover:${accent.border} transition-colors`} />
                <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-zinc-700 group-hover:${accent.border} transition-colors`} />
                <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-zinc-700 group-hover:${accent.border} transition-colors`} />

                {/* Hover glow effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className={`absolute top-0 left-0 w-full h-1 ${accent.bg} opacity-10 blur-xl`} />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Icon container */}
                    <div className={`relative w-8 h-8 sm:w-10 sm:h-10 bg-zinc-900 border border-zinc-800 rounded-sm flex items-center justify-center group-hover:border-zinc-700 transition-colors`}>
                      {iconFor(sec.label)}
                      {/* Ping effect on hover */}
                      <div className={`absolute inset-0 ${accent.bg} opacity-0 group-hover:opacity-20 rounded-sm animate-ping`} style={{ animationDuration: '2s' }} />
                    </div>
                    <div className="flex flex-col">
                      <span className="mono text-[8px] sm:text-[9px] text-zinc-600 tracking-widest uppercase">{nodeId}</span>
                      <span className={`mono text-[10px] sm:text-[11px] font-black uppercase tracking-wider group-hover:${accent.text} transition-colors text-white`}>
                        {displayName}
                      </span>
                    </div>
                  </div>
                  {/* Status indicator */}
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 ${accent.bg} rounded-full animate-pulse`} />
                    <span className="mono text-[8px] sm:text-[9px] text-zinc-600 uppercase hidden sm:inline">Online</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-zinc-500 text-[11px] sm:text-[12px] leading-relaxed mb-4 line-clamp-2">{sec.description}</p>

                {/* Stats panel */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 border border-zinc-800/50 rounded-sm p-2.5 sm:p-3 bg-black/30">
                  <div className="text-center sm:text-left">
                    <div className="mono text-[7px] sm:text-[8px] text-zinc-600 uppercase tracking-wider mb-0.5">Writeups</div>
                    <div className={`mono text-sm sm:text-base font-black ${accent.text}`}>{String(sec.count).padStart(2, '0')}</div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="mono text-[7px] sm:text-[8px] text-zinc-600 uppercase tracking-wider mb-0.5">Tags</div>
                    <div className="mono text-sm sm:text-base font-black text-zinc-400">{sec.tags.length}</div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="mono text-[7px] sm:text-[8px] text-zinc-600 uppercase tracking-wider mb-0.5">Time</div>
                    <div className="mono text-sm sm:text-base font-black text-zinc-400">{sec.minutes}m</div>
                  </div>
                </div>

                {/* Footer - Access indicator */}
                <div className="mt-3 sm:mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-[1px] ${accent.bg} opacity-50 group-hover:w-8 transition-all duration-300`} />
                    <span className="mono text-[8px] sm:text-[9px] text-zinc-600 uppercase tracking-wider group-hover:text-zinc-400 transition-colors">Access Node</span>
                  </div>
                  <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* If a section is chosen, show its writeups list; otherwise no list */}
      {platformFilter && (
      <>
      {/* Enhanced Header Section */}
      <div className="relative border border-zinc-800 bg-zinc-950/80 rounded-sm p-4 sm:p-5 mb-6 overflow-hidden">
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-500/30" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-500/30" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-500/30" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-500/30" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Back button and node info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <button 
              onClick={() => { setPlatformFilter(null); setSearchQuery(''); }}
              className="flex items-center gap-2 text-zinc-500 hover:text-emerald-400 mono text-[9px] sm:text-[10px] group transition-colors uppercase font-bold tracking-wider"
            >
              <div className="p-1.5 border border-zinc-800 group-hover:border-emerald-500/50 rounded-sm transition-colors">
                <ChevronLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
              </div>
              <span className="hidden sm:inline">Return</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                <span className="mono text-[10px] sm:text-[11px] text-emerald-400 font-bold uppercase tracking-wider">
                  {platformFilter}
                </span>
              </div>
              <div className="h-4 w-px bg-zinc-800" />
              <div className="flex items-center gap-2">
                <FileText size={12} className="text-zinc-600" />
                <span className="mono text-[9px] sm:text-[10px] text-zinc-500 font-bold">
                  {filteredWriteups.length} Writeups
                </span>
              </div>
              {currentNode && (
                <>
                  <div className="h-4 w-px bg-zinc-800 hidden sm:block" />
                  <div className="hidden sm:flex items-center gap-2">
                    <Clock size={12} className="text-zinc-600" />
                    <span className="mono text-[9px] sm:text-[10px] text-zinc-500 font-bold">
                      {currentNode.minutes}m read
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Search */}
          <div className="relative flex items-center gap-2 bg-black/50 border border-zinc-800 hover:border-zinc-700 focus-within:border-emerald-500/50 px-3 py-2 rounded-sm transition-colors w-full lg:w-auto">
            <Search size={14} className="text-zinc-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search writeups..."
              className="bg-transparent border-none outline-none text-[10px] sm:text-[11px] mono text-emerald-400 placeholder:text-zinc-700 w-full lg:w-48 font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <span className="mono text-[10px]">×</span>
              </button>
            )}
          </div>
        </div>

        {/* Tags Section */}
        {nodeTags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800/50">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={10} className="text-zinc-600" />
              <span className="mono text-[8px] sm:text-[9px] text-zinc-600 uppercase tracking-wider">Popular Tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {nodeTags.map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(searchQuery === tag ? '' : tag)}
                  className={`group/tag relative px-2.5 py-1 text-[9px] sm:text-[10px] mono uppercase border rounded-sm transition-all duration-200 ${
                    searchQuery === tag 
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                      : 'border-zinc-800 text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/30'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1 h-1 rounded-full transition-colors ${searchQuery === tag ? 'bg-emerald-500' : 'bg-zinc-700 group-hover/tag:bg-emerald-500'}`} />
                    #{tag}
                    <span className="text-zinc-600 text-[8px]">({count})</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Writeups Grid */}
      <div className="space-y-3 sm:space-y-4">
        {filteredWriteups.length > 0 ? filteredWriteups.map((w, idx) => (
          <div 
            key={w.id}
            onClick={() => {
              setSelectedWriteup(w);
            }}
            className="group relative bg-zinc-950/40 border border-zinc-800 hover:border-emerald-500/30 p-4 sm:p-6 rounded-sm transition-all duration-300 cursor-pointer overflow-hidden"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-zinc-700 group-hover:border-emerald-500/50 transition-colors" />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-zinc-700 group-hover:border-emerald-500/50 transition-colors" />
            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-zinc-700 group-hover:border-emerald-500/50 transition-colors" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-zinc-700 group-hover:border-emerald-500/50 transition-colors" />

            {/* Hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-emerald-500/50 via-emerald-500/20 to-transparent" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4 sm:gap-6">
              <div className="space-y-2 sm:space-y-3 flex-1 min-w-0">
                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="mono text-[8px] sm:text-[9px] text-emerald-500/50 font-bold group-hover:text-emerald-500 transition-colors uppercase tracking-wider">
                    #{String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="w-px h-3 bg-zinc-800" />
                  <span className="mono text-[8px] sm:text-[9px] text-zinc-600 font-bold uppercase tracking-wider">{w.category}</span>
                  {w.locked && (
                    <>
                      <div className="w-px h-3 bg-zinc-800" />
                      {isAuthenticated && isApproved ? (
                        <span className="flex items-center gap-1 mono text-[8px] sm:text-[9px] text-emerald-500 font-bold uppercase tracking-wider">
                          <Lock size={10} />
                          Unlocked
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 mono text-[8px] sm:text-[9px] text-red-500 font-bold uppercase tracking-wider">
                          <Lock size={10} />
                          Locked
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-white group-hover:text-emerald-400 transition-colors tracking-tight leading-tight">
                  {w.title}
                </h3>

                {/* Excerpt */}
                <p className="text-[11px] sm:text-xs text-zinc-500 line-clamp-2 max-w-2xl leading-relaxed group-hover:text-zinc-400 transition-colors">
                  {w.excerpt}
                </p>

                {/* Tags */}
                {w.tags && w.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {w.tags.slice(0, 4).map((tag) => (
                      <span 
                        key={tag} 
                        className="px-1.5 py-0.5 text-[8px] sm:text-[9px] mono text-zinc-600 border border-zinc-800/50 rounded-sm uppercase"
                      >
                        {tag}
                      </span>
                    ))}
                    {w.tags.length > 4 && (
                      <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] mono text-zinc-700">
                        +{w.tags.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Hints for locked content */}
                {w.locked && !(isAuthenticated && isApproved) && w.hints && w.hints.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {w.hints.slice(0, 2).map((hint, i) => (
                      <div key={i} className="border border-emerald-500/20 bg-emerald-500/5 p-2.5 sm:p-3 rounded-sm">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Zap size={10} className="text-emerald-500" />
                          <span className="mono text-[7px] sm:text-[8px] text-emerald-400 uppercase font-bold">Hint {i + 1}</span>
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-zinc-400 leading-relaxed">{hint}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right side - Stats & Arrow */}
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-3 sm:gap-4 shrink-0">
                <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-2">
                  <div className="text-right">
                    <div className="mono text-[7px] sm:text-[8px] text-zinc-700 uppercase tracking-wider mb-0.5">Date</div>
                    <div className="mono text-[9px] sm:text-[10px] text-zinc-500 font-bold">{w.date}</div>
                  </div>
                  <div className="w-px h-6 bg-zinc-800 md:hidden" />
                  <div className="text-right">
                    <div className="mono text-[7px] sm:text-[8px] text-zinc-700 uppercase tracking-wider mb-0.5">Read</div>
                    <div className="mono text-[9px] sm:text-[10px] text-zinc-500 font-bold group-hover:text-emerald-400 transition-colors">{w.readingTime}</div>
                  </div>
                </div>
                <div className="p-2 border border-zinc-800 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all rounded-sm">
                  <ChevronRight size={14} className="text-zinc-700 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="relative text-center py-16 sm:py-20 border border-dashed border-zinc-800 rounded-sm bg-zinc-950/30">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-zinc-800" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-zinc-800" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-zinc-800" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-zinc-800" />
            
            <Database size={32} className="text-zinc-800 mx-auto mb-4" />
            <span className="mono text-[10px] sm:text-[11px] text-zinc-700 uppercase font-bold tracking-widest block mb-2">No Records Found</span>
            <span className="mono text-[9px] text-zinc-800">Try adjusting your search or filters</span>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};

export default WriteupView;