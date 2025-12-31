
import React from 'react';
import { PLATFORMS_METRICS } from '../constants';

const PlatformTimeline: React.FC = () => {
  const CARD_HEIGHT = 110;
  const GAP = 80; // Vertical gap between cards
  const CENTER_X = 256; 
  const INNER_PADDING = 32; 

  return (
    <div className="relative w-full py-8 flex flex-col items-center">
      {/* Vertical Spine with segment connectors (no horizontals) */}
      <div className="absolute inset-0 pointer-events-none hidden md:block" aria-hidden="true">
        <svg className="w-full h-full" style={{ minHeight: (PLATFORMS_METRICS.length * (CARD_HEIGHT + GAP)) }}>
          <defs>
            {/* No arrowheads or glow; simple vertical trace styling only */}
          </defs>

          {PLATFORMS_METRICS.map((_, index) => {
            if (index === PLATFORMS_METRICS.length - 1) return null;

            const isCurrentRight = index % 2 === 0;
            const startY = 48 + index * (CARD_HEIGHT + GAP);
            const endY = 48 + (index + 1) * (CARD_HEIGHT + GAP);
            // Only vertical connector line at CENTER_X
            const pathVertical = `M ${CENTER_X} ${startY} V ${endY}`;

            return (
              <g key={`circuit-v2-${index}`}>
                {/* Base Structural Trace (vertical only) */}
                <path d={pathVertical} fill="none" stroke="#09090b" strokeWidth="4" strokeLinecap="round" />
                <path d={pathVertical} fill="none" stroke="#18181b" strokeWidth="1" strokeLinecap="round" />

                {/* Passive Signal Line */}
                <path d={pathVertical} fill="none" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="1" />

                {/* Junction markers with blink */}
                <rect x={CENTER_X - 2} y={startY - 2} width="4" height="4" fill="#0a0a0b" stroke="#27272a" strokeWidth="1" />
                <rect x={CENTER_X - 2} y={endY - 2} width="4" height="4" fill="#0a0a0b" stroke="#27272a" strokeWidth="1" />
                <circle cx={CENTER_X} cy={startY} r="1" fill="#10b981">
                  <animate attributeName="opacity" values="0;1;0" dur="1.6s" repeatCount="indefinite" />
                </circle>
                <circle cx={CENTER_X} cy={endY} r="1" fill="#10b981">
                  <animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="0.8s" repeatCount="indefinite" />
                </circle>

                {/* Packets moving along the vertical spine */}
                <circle r="1.6" fill="#10b981">
                  <animateMotion dur="2.4s" repeatCount="indefinite" path={pathVertical} />
                </circle>
                <circle r="1.2" fill="#34d399" opacity="0.9">
                  <animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path={pathVertical} />
                </circle>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-col gap-[80px] w-full relative z-10">
        {PLATFORMS_METRICS.map((platform, index) => {
          const isRight = index % 2 === 0;
          const nodeID = `X-0${index + 1}`;

          return (
            <div key={platform.name} className={`relative flex items-center w-full group ${isRight ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
              <div className={`w-full md:w-1/2 flex ${isRight ? 'md:justify-start md:pl-8' : 'md:justify-end md:pr-8'} pl-10`}>
                <div className="relative w-[240px] min-w-[240px]">
                  
                  {/* Identification Tag */}
                  <div className={`absolute -top-5 flex items-center gap-2 mono text-[8px] font-bold tracking-[0.3em] ${isRight ? 'right-0 text-right' : 'left-0 text-left'}`}> 
                    <span className="text-emerald-500/40">NODE::{nodeID}</span>
                  </div>

                  {/* Glass-Morphic Module */}
                  <div className={`
                    relative bg-zinc-950/40 border border-zinc-900/80 p-4 rounded-sm transition-all duration-200 
                    hover:border-emerald-500/40 hover:bg-emerald-500/[0.02]
                    w-full h-[110px] flex flex-col justify-center overflow-hidden
                    cursor-crosshair
                  `}>
                    
                    {/* Industrial Corner Decors */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-zinc-800 group-hover:border-emerald-500/50 transition-colors" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-zinc-800 group-hover:border-emerald-500/50 transition-colors" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-zinc-800 group-hover:border-emerald-500/50 transition-colors" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-zinc-800 group-hover:border-emerald-500/50 transition-colors" />

                    {/* Inner Scanner Line Animation */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.03] to-transparent h-1/2 w-full -translate-y-full group-hover:animate-[scan_2s_ease-in-out_infinite] pointer-events-none" />

                    {/* Header Layout */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <span className="text-[7px] mono text-zinc-600 font-black tracking-widest uppercase">LAB_MODULE</span>
                        <h3 className="text-white font-bold mono text-[13px] tracking-wider">
                          {platform.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-800/50">
                        <span className="text-[6px] mono text-zinc-500 font-bold uppercase">Level</span>
                        <span className="text-[6px] mono text-emerald-400 font-bold">{platform.percentile}</span>
                      </div>
                    </div>

                    <p className="text-[8px] text-zinc-500 font-medium tracking-[0.05em] leading-tight mt-0.5 uppercase">
                      {platform.description}
                    </p>

                    {/* Removed metrics bar; showing only Level */}

                    {/* Hex Footer Deco */}
                    <div className="absolute bottom-2 right-4 flex gap-1 opacity-20 group-hover:opacity-70 transition-opacity">
                       <div className="w-1 h-1 bg-emerald-500 rotate-45" />
                       <div className="w-1 h-1 bg-emerald-500 rotate-45" />
                       <div className="w-1 h-1 bg-emerald-500 rotate-45" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden md:block md:w-1/2" />
            </div>
          );
        })}
      </div>

      {/* Removed dash animation; kept basic styles minimal for smoothness */}
    </div>
  );
};

export default PlatformTimeline;
