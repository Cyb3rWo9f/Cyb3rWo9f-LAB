
import React, { useState, useEffect } from 'react';
import { Terminal, Fingerprint, Newspaper } from 'lucide-react';

interface HeroProps {
  onNavigate?: (view: string) => void;
}

const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const fullText = "Cyb3rWo9f";
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(100);

  useEffect(() => {
    const handleTyping = () => {
      if (!isDeleting) {
        setDisplayText(fullText.substring(0, displayText.length + 1));
        setTypingSpeed(100);

        if (displayText === fullText) {
          setTypingSpeed(3000);
          setIsDeleting(true);
        }
      } else {
        setDisplayText(fullText.substring(0, displayText.length - 1));
        setTypingSpeed(50);

        if (displayText === "") {
          setIsDeleting(false);
          setTypingSpeed(500);
        }
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, typingSpeed]);

  return (
    <div className="relative flex flex-col items-start max-w-2xl pt-20">
      {/* System Status */}
      <div className="flex items-center gap-2 mb-8 bg-zinc-900/50 border border-zinc-800 px-3 py-1.5 rounded-sm">
        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
        <span className="text-[10px] mono uppercase tracking-widest text-zinc-400 font-bold">System Online</span>
      </div>

      {/* Main Title */}
      <div className="min-h-[1.1em] flex items-center mb-6">
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-emerald-500 to-violet-500 select-none inline-block leading-none">
          {displayText || "\u00A0"}
        </h1>
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
      <div className="flex flex-wrap gap-4">
        <button 
          onClick={() => onNavigate?.('archives')}
          className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/10"
        >
          <Terminal size={18} />
          Access Archives
        </button>
        
        <button className="bg-transparent border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all">
          <Fingerprint size={18} />
          Identify
        </button>

        <button className="bg-transparent border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all">
          <Newspaper size={18} />
          News
        </button>
      </div>
    </div>
  );
};

export default Hero;
