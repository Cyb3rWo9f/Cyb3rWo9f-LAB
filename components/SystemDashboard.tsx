
import React, { useEffect, useState, useCallback } from 'react';
import { 
  TelemetryData as VMTelemetry, 
  subscribeToTelemetry, 
  fetchTelemetry, 
  isVMOnline,
  formatUptime 
} from '../services/telemetry';

interface DisplayMetric {
  name: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}

interface DisplayStat {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

const SystemDashboard: React.FC = () => {
  const [telemetry, setTelemetry] = useState<VMTelemetry | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('--:--');

  // Update telemetry data
  const handleTelemetryUpdate = useCallback((data: VMTelemetry) => {
    setTelemetry(data);
    setIsOnline(isVMOnline(data));
    
    // Format last update time
    const updateDate = new Date(data.last_updated);
    setLastUpdateTime(updateDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    }));
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchTelemetry().then(handleTelemetryUpdate);

    // Subscribe to real-time updates
    const unsubscribe = subscribeToTelemetry(handleTelemetryUpdate);

    // Polling fallback every 5 seconds (in case realtime fails)
    const pollInterval = setInterval(() => {
      fetchTelemetry().then(handleTelemetryUpdate);
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [handleTelemetryUpdate]);

  // Convert telemetry to display stats
  const stats: DisplayStat[] = telemetry ? [
    { 
      label: 'UPTIME', 
      value: formatUptime(telemetry.uptime_hours), 
      trend: 'stable', 
      color: '#10b981' 
    },
    { 
      label: 'CPU', 
      value: `${Math.round(telemetry.cpu_percent)}%`, 
      trend: telemetry.cpu_percent > 70 ? 'up' : 'stable', 
      color: telemetry.cpu_percent > 80 ? '#ef4444' : '#10b981' 
    },
    { 
      label: 'SCANS', 
      value: telemetry.scans_detected > 0 ? `${telemetry.scans_detected}` : '0', 
      trend: telemetry.under_attack ? 'up' : 'stable', 
      color: telemetry.under_attack ? '#ef4444' : '#f59e0b' 
    },
    { 
      label: 'DISK', 
      value: `${Math.round(telemetry.disk_percent)}%`, 
      trend: 'stable', 
      color: telemetry.disk_percent > 80 ? '#f59e0b' : '#3b82f6' 
    },
  ] : [
    { label: 'UPTIME', value: '--', trend: 'stable', color: '#71717a' },
    { label: 'CPU', value: '--', trend: 'stable', color: '#71717a' },
    { label: 'SCANS', value: '--', trend: 'stable', color: '#71717a' },
    { label: 'DISK', value: '--', trend: 'stable', color: '#71717a' },
  ];

  // Convert telemetry to display metrics
  const metrics: DisplayMetric[] = telemetry ? [
    { 
      name: 'CPU_LOAD', 
      value: telemetry.cpu_percent, 
      max: 100, 
      unit: '%', 
      color: telemetry.cpu_percent > 80 ? '#ef4444' : '#10b981' 
    },
    { 
      name: 'MEM_USAGE', 
      value: telemetry.memory_used_gb, 
      max: telemetry.memory_total_gb, 
      unit: 'GB', 
      color: '#3b82f6' 
    },
    { 
      name: 'NET_IO', 
      value: telemetry.network_recv_mbps + telemetry.network_sent_mbps, 
      max: 1000, 
      unit: 'Mb/s', 
      color: '#f59e0b' 
    },
    { 
      name: 'DISK_USE', 
      value: telemetry.disk_percent, 
      max: 100, 
      unit: '%', 
      color: '#8b5cf6' 
    },
  ] : [
    { name: 'CPU_LOAD', value: 0, max: 100, unit: '%', color: '#71717a' },
    { name: 'MEM_USAGE', value: 0, max: 8, unit: 'GB', color: '#71717a' },
    { name: 'NET_IO', value: 0, max: 1000, unit: 'Mb/s', color: '#71717a' },
    { name: 'DISK_USE', value: 0, max: 100, unit: '%', color: '#71717a' },
  ];

  // Status indicator
  const statusColor = isOnline ? '#10b981' : '#ef4444';
  const statusText = isOnline ? 'LIVE' : 'OFFLINE';
  const vmStatus = telemetry?.status || 'offline';

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
          <div 
            className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: statusColor }}
          />
          <span 
            className="text-[8px] mono uppercase tracking-wider"
            style={{ color: statusColor }}
          >
            {statusText}
          </span>
        </div>
      </div>

      {/* Main Dashboard Container */}
      <div className="relative bg-zinc-950/60 border border-zinc-800 p-4 overflow-hidden">
        {/* Top accent line */}
        <div 
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{ background: `linear-gradient(to right, transparent, ${statusColor}66, transparent)` }}
        />
        
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-zinc-700" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-zinc-700" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-zinc-700" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-zinc-700" />

        {/* Telemetry Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {stats.map((item) => (
            <div key={item.label} className="group text-center">
              <div className="text-[8px] mono text-zinc-600 uppercase tracking-wider mb-1">{item.label}</div>
              <div className="flex items-center justify-center gap-1">
                <span 
                  className="text-lg mono font-bold transition-colors duration-300"
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
          {metrics.map((metric) => {
            const percentage = metric.max > 0 ? (metric.value / metric.max) * 100 : 0;
            return (
              <div key={metric.name} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-1 h-1 rounded-full transition-colors duration-300"
                      style={{ backgroundColor: metric.color }}
                    />
                    <span className="text-[9px] mono text-zinc-500 uppercase tracking-wider">
                      {metric.name}
                    </span>
                  </div>
                  <span className="text-[10px] mono font-bold text-white">
                    {metric.value.toFixed(1)}<span className="text-zinc-600 ml-0.5">{metric.unit}</span>
                  </span>
                </div>
                <div className="relative h-1 bg-zinc-900 overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full transition-all duration-700 ease-out"
                    style={{ 
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: metric.color,
                      boxShadow: `0 0 8px ${metric.color}40`
                    }}
                  >
                    {/* Animated scan line - only when online and has value */}
                    {isOnline && percentage > 0 && (
                      <div 
                        className="absolute top-0 right-0 w-4 h-full opacity-60 animate-[scanLine_2s_ease-in-out_infinite]"
                        style={{ background: `linear-gradient(90deg, transparent, white, transparent)` }}
                      />
                    )}
                  </div>
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
                  className={`w-0.5 ${isOnline ? 'animate-[wave_1.2s_ease-in-out_infinite]' : ''}`}
                  style={{ 
                    height: `${4 + Math.sin(i * 0.8) * 4}px`,
                    animationDelay: `${i * 0.1}s`,
                    backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(113, 113, 122, 0.3)'
                  }}
                />
              ))}
            </div>
            <span className="text-[8px] mono text-zinc-600 uppercase">
              {isOnline ? 'Active Monitoring' : 'VM Offline'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] mono text-zinc-700">
              {lastUpdateTime}
            </span>
            <span className="text-[8px] mono text-zinc-700">
              SYS::{vmStatus.toUpperCase()}
            </span>
            <div 
              className={`w-1.5 h-1.5 rounded-full ${isOnline ? '' : 'opacity-50'}`}
              style={{ backgroundColor: statusColor }}
            />
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
