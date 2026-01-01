
import React from 'react';

interface TelemetryData {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

interface SystemMetric {
  name: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}

// Configurable telemetry data
const TELEMETRY: TelemetryData[] = [
  { label: 'UPTIME', value: '99.7%', trend: 'stable', color: '#10b981' },
  { label: 'THREATS', value: '2.4K', trend: 'up', color: '#ef4444' },
  { label: 'PATCHES', value: '847', trend: 'up', color: '#8b5cf6' },
  { label: 'SCANS', value: '12.8K', trend: 'stable', color: '#f59e0b' },
];

const METRICS: SystemMetric[] = [
  { name: 'CPU_LOAD', value: 67, max: 100, unit: '%', color: '#10b981' },
  { name: 'MEM_USAGE', value: 4.2, max: 8, unit: 'GB', color: '#3b82f6' },
  { name: 'NET_IO', value: 847, max: 1000, unit: 'Mb/s', color: '#f59e0b' },
  { name: 'DISK_OPS', value: 12.4, max: 20, unit: 'K/s', color: '#8b5cf6' },
];

const SystemDashboard: React.FC = () => {
  return (
    <div className="mt-8 w-full max-w-2xl">
      {/* Section Header - matching timeline style */}
      <div className="flex items-center gap-4 mb-6 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rotate-45" />
          <span className="text-[10px] mono uppercase tracking-[0.3em] text-zinc-500 font-bold">
            System Telemetry
          </span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-zinc-800 to-transparent" />
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[8px] mono text-emerald-500 uppercase tracking-wider">LIVE</span>
        </div>
      </div>

      {/* Main Dashboard Container */}
      <div className="relative bg-zinc-950/60 border border-zinc-800 p-4 overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-zinc-700" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-zinc-700" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-zinc-700" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-zinc-700" />

        {/* Telemetry Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {TELEMETRY.map((item) => (
            <div key={item.label} className="group text-center">
              <div className="text-[8px] mono text-zinc-600 uppercase tracking-wider mb-1">{item.label}</div>
              <div className="flex items-center justify-center gap-1">
                <span 
                  className="text-lg mono font-bold"
                  style={{ color: item.color }}
                >
                  {item.value}
                </span>
                <svg 
                  className="w-2.5 h-2.5" 
                  style={{ color: item.trend === 'up' ? '#10b981' : item.trend === 'down' ? '#ef4444' : '#71717a' }}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  {item.trend === 'up' ? (
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  ) : item.trend === 'down' ? (
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  ) : (
                    <path d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" />
                  )}
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Separator */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-[7px] mono text-zinc-600 uppercase tracking-widest">Real-Time Metrics</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Metrics Bars */}
        <div className="space-y-3">
          {METRICS.map((metric) => {
            const percentage = (metric.value / metric.max) * 100;
            return (
              <div key={metric.name} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: metric.color }}
                    />
                    <span className="text-[9px] mono text-zinc-500 uppercase tracking-wider">
                      {metric.name}
                    </span>
                  </div>
                  <span className="text-[10px] mono font-bold text-white">
                    {metric.value}<span className="text-zinc-600 ml-0.5">{metric.unit}</span>
                  </span>
                </div>
                <div className="relative h-1 bg-zinc-900 overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full transition-all duration-700 ease-out"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: metric.color,
                      boxShadow: `0 0 8px ${metric.color}40`
                    }}
                  />
                  {/* Animated scan line */}
                  <div 
                    className="absolute top-0 w-4 h-full opacity-60 animate-[scanLine_2s_ease-in-out_infinite]"
                    style={{ background: `linear-gradient(90deg, transparent, ${metric.color}, transparent)` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Activity Indicator */}
        <div className="mt-4 pt-3 border-t border-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-0.5 bg-emerald-500/30 animate-[wave_1.2s_ease-in-out_infinite]"
                  style={{ 
                    height: `${4 + Math.sin(i * 0.8) * 4}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
            <span className="text-[8px] mono text-zinc-600 uppercase">Active Monitoring</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] mono text-zinc-700">SYS::OK</span>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Bottom Label */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <div className="w-1 h-1 bg-emerald-500/40 rotate-45" />
        <span className="text-[8px] mono text-zinc-600 uppercase tracking-widest">
          Cyb3rWo9f Security Operations
        </span>
        <div className="w-1 h-1 bg-emerald-500/40 rotate-45" />
      </div>

      <style>{`
        @keyframes scanLine {
          0% { left: -16px; opacity: 0; }
          50% { opacity: 0.6; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes wave {
          0%, 100% { transform: scaleY(0.6); opacity: 0.4; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SystemDashboard;
