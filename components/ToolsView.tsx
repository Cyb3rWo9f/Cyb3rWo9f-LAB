import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lock, Shield, AlertTriangle, Terminal, Zap, Cpu, Database } from 'lucide-react';

interface ToolsViewProps {
  onBack: () => void;
}

const ToolsView: React.FC<ToolsViewProps> = ({ onBack }) => {
  const [scanProgress, setScanProgress] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    '$ access --sector tools',
    '> Authenticating credentials...',
    '> ERROR: Insufficient clearance level',
    '> Access denied: SECTOR LOCKED'
  ]);
  const [glitchText, setGlitchText] = useState('AREA RESTRICTED');

  // Animate terminal lines - keep looping without clearing
  useEffect(() => {
    const lines = [
      '$ access --sector tools',
      '> Authenticating credentials...',
      '> ERROR: Insufficient clearance level',
      '> Access denied: SECTOR LOCKED',
      '$ bypass --force',
      '> ALERT: Unauthorized attempt logged',
      '> Sector status: UNDER DEVELOPMENT',
      '> ETA: CLASSIFIED',
      '$ retry --auth admin',
      '> Verifying admin privileges...',
      '> ERROR: Admin access revoked',
      '> Session terminated'
    ];
    
    let index = 4; // Start after initial lines
    const interval = setInterval(() => {
      setTerminalLines(prev => [...prev.slice(-3), lines[index]]);
      index = (index + 1) % lines.length;
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Scan animation
  useEffect(() => {
    const interval = setInterval(() => {
      setScanProgress(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Glitch effect
  useEffect(() => {
    const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const originalText = 'AREA RESTRICTED';
    
    const interval = setInterval(() => {
      if (Math.random() > 0.9) {
        let glitched = '';
        for (let i = 0; i < originalText.length; i++) {
          if (Math.random() > 0.7) {
            glitched += glitchChars[Math.floor(Math.random() * glitchChars.length)];
          } else {
            glitched += originalText[i];
          }
        }
        setGlitchText(glitched);
        setTimeout(() => setGlitchText(originalText), 100);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 px-2 sm:px-4 lg:px-0">
      {/* Header */}
      <div className="mb-2 sm:mb-6 border-b border-zinc-900 pb-2 sm:pb-4">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-zinc-500 hover:text-emerald-400 transition-colors mono text-[9px] sm:text-xs uppercase tracking-wider"
        >
          <ArrowLeft size={14} className="sm:hidden group-hover:-translate-x-1 transition-transform" />
          <ArrowLeft size={16} className="hidden sm:block group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </button>
      </div>

      {/* Main Restricted Area Container */}
      <div className="relative flex items-center justify-center py-2 sm:py-6">
        
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.3) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(16, 185, 129, 0.3) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
          
          {/* Scanning line */}
          <div 
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"
            style={{ 
              top: `${scanProgress}%`,
              boxShadow: '0 0 30px 10px rgba(16, 185, 129, 0.1)'
            }}
          />

          {/* Corner decorations */}
          <div className="absolute top-1 left-1 sm:top-4 sm:left-4 w-6 sm:w-16 h-6 sm:h-16 border-t border-l sm:border-t-2 sm:border-l-2 border-emerald-500/20" />
          <div className="absolute top-1 right-1 sm:top-4 sm:right-4 w-6 sm:w-16 h-6 sm:h-16 border-t border-r sm:border-t-2 sm:border-r-2 border-emerald-500/20" />
          <div className="absolute bottom-1 left-1 sm:bottom-4 sm:left-4 w-6 sm:w-16 h-6 sm:h-16 border-b border-l sm:border-b-2 sm:border-l-2 border-emerald-500/20" />
          <div className="absolute bottom-1 right-1 sm:bottom-4 sm:right-4 w-6 sm:w-16 h-6 sm:h-16 border-b border-r sm:border-b-2 sm:border-r-2 border-emerald-500/20" />
        </div>

        {/* Main Content Card */}
        <div className="relative w-full max-w-2xl">
          <div className="relative border border-zinc-800 bg-zinc-950/90 backdrop-blur-sm overflow-hidden">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-2 h-2 sm:w-4 sm:h-4 border-t border-l sm:border-t-2 sm:border-l-2 border-emerald-500/50" />
            <div className="absolute top-0 right-0 w-2 h-2 sm:w-4 sm:h-4 border-t border-r sm:border-t-2 sm:border-r-2 border-emerald-500/50" />
            <div className="absolute bottom-0 left-0 w-2 h-2 sm:w-4 sm:h-4 border-b border-l sm:border-b-2 sm:border-l-2 border-emerald-500/50" />
            <div className="absolute bottom-0 right-0 w-2 h-2 sm:w-4 sm:h-4 border-b border-r sm:border-b-2 sm:border-r-2 border-emerald-500/50" />

            {/* Header Bar */}
            <div className="flex items-center justify-between px-2 sm:px-4 py-1 sm:py-2 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative">
                  <Shield size={12} className="sm:hidden text-emerald-500" />
                  <Shield size={14} className="hidden sm:block text-emerald-500" />
                  <div className="absolute inset-0 animate-ping opacity-30">
                    <Shield size={12} className="sm:hidden text-emerald-500" />
                    <Shield size={14} className="hidden sm:block text-emerald-500" />
                  </div>
                </div>
                <span className="mono text-[8px] sm:text-[10px] text-emerald-400 uppercase tracking-[0.15em] sm:tracking-[0.2em] font-bold">
                  Restricted Sector
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                <span className="mono text-[8px] sm:text-[9px] text-zinc-500 uppercase tracking-wider">Locked</span>
              </div>
            </div>

            {/* Main Content */}
            <div className="p-2.5 sm:p-5 text-center space-y-2 sm:space-y-4">
              {/* Lock Icon with Glow */}
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl scale-110" />
                <div className="relative p-2 sm:p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-full">
                  <Lock size={24} className="sm:hidden text-emerald-500" />
                  <Lock size={44} className="hidden sm:block text-emerald-500" />
                </div>
              </div>

              {/* Title with Glitch Effect */}
              <div className="space-y-0.5 sm:space-y-2">
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <span className="text-emerald-500/30 text-base sm:text-xl font-light">[</span>
                  <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-violet-400 tracking-tight">
                    {glitchText}
                  </h1>
                  <span className="text-violet-500/30 text-base sm:text-xl font-light">]</span>
                </div>
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <Zap size={8} className="sm:hidden text-emerald-500 animate-pulse" />
                  <Zap size={12} className="hidden sm:block text-emerald-500 animate-pulse" />
                  <span className="mono text-[8px] sm:text-[11px] text-emerald-500 font-bold tracking-[0.08em] sm:tracking-[0.15em] uppercase">
                    Under Development
                  </span>
                  <Zap size={8} className="sm:hidden text-emerald-500 animate-pulse" />
                  <Zap size={12} className="hidden sm:block text-emerald-500 animate-pulse" />
                </div>
              </div>

              {/* Description */}
              <p className="text-zinc-500 text-[10px] sm:text-sm max-w-md mx-auto leading-relaxed">
                This sector contains advanced offensive and defensive tools currently in development. 
                Access will be granted upon completion and security clearance verification.
              </p>

              {/* Status Grid */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                <div className="relative border border-zinc-800 bg-zinc-900/30 p-1.5 sm:p-3 group hover:border-emerald-500/30 transition-colors">
                  <Terminal size={12} className="sm:hidden text-emerald-500 mb-0.5 mx-auto" />
                  <Terminal size={16} className="hidden sm:block text-emerald-500 mb-1.5 mx-auto" />
                  <div className="mono text-[6px] sm:text-[8px] text-zinc-600 uppercase">Exploits</div>
                  <div className="mono text-[7px] sm:text-[10px] text-emerald-400 font-bold">LOCKED</div>
                </div>
                <div className="relative border border-zinc-800 bg-zinc-900/30 p-1.5 sm:p-3 group hover:border-purple-500/30 transition-colors">
                  <Zap size={12} className="sm:hidden text-purple-500 mb-0.5 mx-auto" />
                  <Zap size={16} className="hidden sm:block text-purple-500 mb-1.5 mx-auto" />
                  <div className="mono text-[6px] sm:text-[8px] text-zinc-600 uppercase">Payloads</div>
                  <div className="mono text-[7px] sm:text-[10px] text-purple-400 font-bold">LOCKED</div>
                </div>
                <div className="relative border border-zinc-800 bg-zinc-900/30 p-1.5 sm:p-3 group hover:border-blue-500/30 transition-colors">
                  <Cpu size={12} className="sm:hidden text-blue-500 mb-0.5 mx-auto" />
                  <Cpu size={16} className="hidden sm:block text-blue-500 mb-1.5 mx-auto" />
                  <div className="mono text-[6px] sm:text-[8px] text-zinc-600 uppercase">Scanners</div>
                  <div className="mono text-[7px] sm:text-[10px] text-blue-400 font-bold">LOCKED</div>
                </div>
                <div className="relative border border-zinc-800 bg-zinc-900/30 p-1.5 sm:p-3 group hover:border-emerald-500/30 transition-colors">
                  <Database size={12} className="sm:hidden text-emerald-500 mb-0.5 mx-auto" />
                  <Database size={16} className="hidden sm:block text-emerald-500 mb-1.5 mx-auto" />
                  <div className="mono text-[6px] sm:text-[8px] text-zinc-600 uppercase">Databases</div>
                  <div className="mono text-[7px] sm:text-[10px] text-emerald-400 font-bold">LOCKED</div>
                </div>
              </div>
            </div>

            {/* Terminal Section */}
            <div className="border-t border-zinc-800">
              <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-zinc-900/80 border-b border-zinc-800/50">
                <span className="w-1 h-1 sm:w-2 sm:h-2 rounded-full bg-red-500/80" />
                <span className="w-1 h-1 sm:w-2 sm:h-2 rounded-full bg-yellow-500/80" />
                <span className="w-1 h-1 sm:w-2 sm:h-2 rounded-full bg-green-500/80" />
                <span className="mono text-[7px] sm:text-[9px] text-zinc-600 ml-1 sm:ml-2">tools@Cyb3rWo9f</span>
              </div>
              <div className="p-1.5 sm:p-3 h-[56px] sm:h-[80px] bg-black/30 overflow-hidden">
                <div className="flex flex-col justify-end h-full space-y-0.5">
                  {terminalLines.slice(-4).map((line, i) => (
                    <div 
                      key={i} 
                      className={`mono text-[7px] sm:text-[9px] leading-tight ${
                        line.startsWith('$') ? 'text-emerald-400' : 
                        line.includes('ERROR') || line.includes('ALERT') ? 'text-orange-400' :
                        line.startsWith('>') ? 'text-zinc-500' : 'text-zinc-400'
                      }`}
                    >
                      {line}
                    </div>
                  ))}
                  <div className="mono text-[7px] sm:text-[9px] text-emerald-400 leading-tight">
                    <span className="animate-pulse">█</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Info */}
          <div className="mt-2 sm:mt-4 flex items-center justify-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 text-zinc-600">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="mono text-[7px] sm:text-[9px] uppercase tracking-wider">In Progress</span>
            </div>
            <div className="w-px h-2 sm:h-3 bg-zinc-800" />
            <div className="flex items-center gap-1.5 text-zinc-600">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-violet-500 rounded-full" />
              <span className="mono text-[7px] sm:text-[9px] uppercase tracking-wider">Clearance Req</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsView;
