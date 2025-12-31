import React from 'react';
import { ArrowLeft, Lock } from 'lucide-react';

interface ToolsViewProps {
  onBack: () => void;
}

const ToolsView: React.FC<ToolsViewProps> = ({ onBack }) => {
  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="mb-8 md:mb-12 border-b border-zinc-900 pb-6 md:pb-8">
        <button
          onClick={onBack}
          className="group flex items-center gap-3 text-zinc-500 hover:text-emerald-400 transition-colors mb-6 md:mb-8 mono text-xs uppercase tracking-wider"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </button>
      </div>

      {/* Restricted Area */}
      <div className="min-h-[60vh] md:h-[60vh] flex items-center justify-center py-8 md:py-0">
        <div className="w-full max-w-2xl flex flex-col items-center justify-center text-center px-4 md:px-0 space-y-8">
          {/* Lock Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl" />
            <Lock size={80} className="text-emerald-500 relative" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
              AREA RESTRICTED
            </h1>
            <div className="mono text-emerald-500 text-sm md:text-base tracking-widest uppercase mb-2">
              Under Development
            </div>
          </div>

          {/* Description */}
          <p className="text-zinc-500 text-sm md:text-base max-w-xl leading-relaxed">
            This section is currently under active development. Advanced tools and utilities will be accessible here soon. Check back for updates.
          </p>

          {/* Divider */}
          <div className="w-32 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
        </div>
      </div>
    </div>
  );
};

export default ToolsView;
