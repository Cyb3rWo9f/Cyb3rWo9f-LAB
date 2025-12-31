
import React from 'react';
import { PLATFORMS_METRICS } from '../constants';

const SystemDashboard: React.FC = () => {
  return (
    <div className="mt-12 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-6 px-1 border-b border-zinc-900/50 pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-white text-sm mono font-black tracking-widest uppercase flex items-center gap-2">
            <span className="w-1 h-3 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            Telemetry Dashboard
          </h2>
        </div>

        {/* Sequential Sync Section */}
          <div className="flex items-center justify-between bg-zinc-950/50 px-4 py-2 rounded border border-zinc-900/80" aria-live="polite">
            <div className="flex items-center gap-2">
              <span className="text-[8px] mono text-zinc-500 uppercase tracking-widest font-bold">Status:</span>
              <span className="text-[8px] mono text-emerald-400 uppercase font-black">Syncing</span>
            </div>
            <div className="flex gap-1 items-end h-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-emerald-500/20 rounded-sm animate-[syncWave_1.4s_ease-in-out_infinite]"
                  style={{ height: `${6 + (i % 3) * 4}px`, animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
          </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {PLATFORMS_METRICS.map((platform, index) => {
          const progress = (platform.pwned / platform.maxPwned) * 100;
          const nodeID = `X-0${index + 1}`;
          const statusLabel = progress >= 66 ? 'STABLE' : progress >= 33 ? 'DEGRADED' : 'INIT';
          const statusColor = progress >= 66 ? 'text-emerald-400' : progress >= 33 ? 'text-yellow-400' : 'text-zinc-500';
          const bars = Array.from({ length: 10 }, (_, i) => i < Math.round((progress / 100) * 10));
          
          return (
            <div 
              key={platform.name}
              className="group relative bg-zinc-950/40 border border-zinc-900 p-3 rounded-sm transition-all duration-300 hover:border-emerald-500/40 hover:bg-zinc-900/40 overflow-hidden hover:scale-[1.01] cursor-crosshair"
            >
              {/* Internal Scan Line Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.03] to-transparent h-full w-full -translate-y-full group-hover:animate-[cardScan_2.5s_ease-in-out_infinite] pointer-events-none" />

              {/* Dynamic Corner Brackets */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-zinc-800 group-hover:border-emerald-500/50 group-hover:w-3 group-hover:h-3 transition-all" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-zinc-800 group-hover:border-emerald-500/50 group-hover:w-3 group-hover:h-3 transition-all" />

              {/* Platform Title Section */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-emerald-500/40 group-hover:bg-emerald-500 rounded-full transition-colors" />
                    <span className="text-[7px] mono text-emerald-500 font-black tracking-[0.2em] uppercase">{platform.name}</span>
                  </div>
                  <span className="text-white text-[10px] font-black mono group-hover:text-emerald-400 transition-colors mt-0.5 tracking-tight">RANK: {platform.rank}</span>
                </div>
                <div className="text-right">
                  <div className={`text-[8px] mono font-bold uppercase transition-colors ${statusColor}`}>{statusLabel}</div>
                </div>
              </div>

              {/* Progress Bar & Numerical Stats */}
              <div className="space-y-2">
                <div className="flex justify-between items-end text-[9px] mono uppercase tracking-tight whitespace-nowrap">
                  <span className="text-zinc-600 group-hover:text-zinc-400 truncate max-w-[100px]">Data_Integrity</span>
                  <span className="text-emerald-500/80 font-black whitespace-nowrap">
                    {platform.pwned} <span className="text-zinc-800 mx-0.5">/</span> <span className="text-zinc-600">{platform.maxPwned}</span>
                  </span>
                </div>
                
                {/* Custom Industrial Progress Bar */}
                <div className="relative h-1.5 w-full bg-zinc-950 rounded-none overflow-hidden border border-zinc-900">
                  <div 
                    className="absolute top-0 left-0 h-full bg-emerald-600 transition-all duration-1000 ease-out group-hover:bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    style={{ width: `${progress}%` }}
                  />
                  {/* Subtle noise pattern on progress */}
                  <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                </div>
                {/* Mini sparkline bars */}
                <div className="flex items-center gap-0.5 mt-2">
                  {bars.map((filled, i) => (
                    <div key={i} className={`w-1 h-2 ${filled ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
                  ))}
                </div>
              </div>

              {/* Micro Decoration Footer */}
              <div className="mt-3 flex justify-between items-center opacity-30 group-hover:opacity-100 transition-all duration-300">
                <div className="flex gap-0.5">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="w-0.5 h-1 bg-zinc-800 group-hover:bg-emerald-500/30" />
                  ))}
                </div>
                <span className="text-[6px] mono text-zinc-700 tracking-tighter uppercase font-bold group-hover:text-emerald-500/40">NODE::{nodeID}</span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes barSequence {
          0%, 100% { 
            background-color: rgba(16, 185, 129, 0.1); 
            box-shadow: 0 0 0 rgba(16, 185, 129, 0);
            height: 60%;
          }
          50% { 
            background-color: rgba(16, 185, 129, 1); 
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.8);
            height: 100%;
          }
        }
        @keyframes syncWave {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-2px); opacity: 1; }
        }
        @keyframes cardScan {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default SystemDashboard;
