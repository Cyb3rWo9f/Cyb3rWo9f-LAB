
import React, { useState, useEffect } from 'react';
import { Terminal, Fingerprint, Newspaper, Zap } from 'lucide-react';

interface HeroProps {
  onNavigate?: (view: string) => void;
}

const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const fullText = "Cyb3rWo9f";
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const getTypingDelay = () => {
      if (isPaused) return 2500; // Pause at full text
      if (isDeleting) return 40 + Math.random() * 30; // Faster delete with slight variation
      return 80 + Math.random() * 60; // Smooth typing with human-like variation
    };

    const handleTyping = () => {
      if (isPaused) {
        setIsPaused(false);
        setIsDeleting(true);
        return;
      }

      if (!isDeleting) {
        const newText = fullText.substring(0, displayText.length + 1);
        setDisplayText(newText);

        if (newText === fullText) {
          setIsPaused(true);
        }
      } else {
        const newText = fullText.substring(0, displayText.length - 1);
        setDisplayText(newText);

        if (newText === "") {
          setIsDeleting(false);
        }
      }
    };

    const timer = setTimeout(handleTyping, getTypingDelay());
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, isPaused]);

  return (
    <div className="relative flex flex-col items-start max-w-2xl pt-20">
      {/* System Status - Enhanced */}
      <div className="group flex items-center gap-3 mb-8 bg-zinc-900/80 border border-zinc-700/50 px-4 py-2 rounded-sm backdrop-blur-sm hover:border-emerald-500/30 transition-all duration-300 cursor-default">
        {/* Animated Status Indicator */}
        <div className="relative flex items-center justify-center">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_#10b981]" />
          <div className="absolute w-4 h-4 bg-emerald-500/20 rounded-full animate-ping" />
        </div>
        
        {/* Status Text with Icon */}
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-emerald-500 animate-pulse" />
          <span className="text-[11px] mono uppercase tracking-[0.2em] text-emerald-400 font-bold">
            System Online
          </span>
        </div>
        
        {/* Uptime indicator */}
        <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-3 border-l border-zinc-700/50">
          <span className="text-[9px] mono uppercase tracking-wider text-zinc-500">Uptime</span>
          <span className="text-[10px] mono text-emerald-500/80 font-bold">99.9%</span>
        </div>
      </div>

      {/* Main Title - Enhanced with Glitch Effect */}
      <div className="min-h-[1.1em] flex items-center mb-6 relative">
        {/* Subtle glow behind text */}
        <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-r from-emerald-500 via-emerald-400 to-violet-500 -z-10" />
        
        {/* Bracket decorations */}
        <span className="text-emerald-500/30 text-4xl md:text-6xl font-light select-none">[</span>
        
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter select-none inline-flex items-center leading-none">
          {/* Container with fixed width to prevent jumping */}
          <span className="relative inline-block" style={{ minWidth: `${fullText.length * 0.6}em` }}>
            {/* Invisible text to maintain width */}
            <span className="invisible">{fullText}</span>
            {/* Rendered characters with gradient - absolute positioned */}
            <span className="absolute left-0 top-0 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-emerald-300 to-violet-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              {displayText}
            </span>
          </span>
        </h1>
        
        <span className="text-violet-500/30 text-4xl md:text-6xl font-light select-none">]</span>
      </div>

      {/* Subtext */}
      <div className="flex gap-4 mb-10 max-w-lg">
        <span className="text-emerald-500 font-bold mono text-xl">$</span>
        <p className="text-zinc-400 text-lg leading-relaxed relative">
          Finding, Exploiting & Explaining!?
          <span className="inline-block w-[2px] h-[1em] bg-emerald-500 ml-1.5 animate-blink align-middle shadow-[0_0_8px_#10b981]" />
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full sm:w-auto">
        {/* Archives Button - Primary - Full width on mobile */}
        <button 
          onClick={() => onNavigate?.('archives')}
          className="group relative w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 font-bold mono text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 overflow-hidden"
        >
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-black/20" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-black/20" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-black/20" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-black/20" />
          <Terminal size={16} className="group-hover:rotate-12 transition-transform" />
          <span>Access Archives</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </button>
        
        {/* Secondary buttons container - side by side on mobile */}
        <div className="flex gap-3 w-full sm:w-auto">
          {/* Identity Button - Links to About */}
          <button 
            onClick={() => onNavigate?.('about')}
            className="group relative flex-1 sm:flex-none bg-transparent border border-zinc-700 hover:border-emerald-500/50 text-zinc-300 hover:text-emerald-400 px-6 py-3 font-bold mono text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-zinc-700 group-hover:border-emerald-500/50 transition-colors" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-zinc-700 group-hover:border-emerald-500/50 transition-colors" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-zinc-700 group-hover:border-emerald-500/50 transition-colors" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-zinc-700 group-hover:border-emerald-500/50 transition-colors" />
            <Fingerprint size={16} className="group-hover:scale-110 transition-transform" />
            <span>Identity</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
          </button>

          {/* News Button */}
          <button 
            onClick={() => onNavigate?.('news')}
            className="group relative flex-1 sm:flex-none bg-transparent border border-zinc-700 hover:border-violet-500/50 text-zinc-300 hover:text-violet-400 px-6 py-3 font-bold mono text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-zinc-700 group-hover:border-violet-500/50 transition-colors" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-zinc-700 group-hover:border-violet-500/50 transition-colors" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-zinc-700 group-hover:border-violet-500/50 transition-colors" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-zinc-700 group-hover:border-violet-500/50 transition-colors" />
            <Newspaper size={16} className="group-hover:-rotate-6 transition-transform" />
            <span>News</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
