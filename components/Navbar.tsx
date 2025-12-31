
import React, { useState, useRef } from 'react';
import { Shield } from 'lucide-react';
import { NAV_ITEMS } from '../constants';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isLoggedIn?: boolean;
  onLoginToggle?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, isLoggedIn, onLoginToggle }) => {
  const [hoverStyle, setHoverStyle] = useState<React.CSSProperties>({ opacity: 0, width: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = e.currentTarget;
    setHoverStyle({
      opacity: 1,
      width: target.offsetWidth,
      left: target.offsetLeft,
    });
  };

  const handleMouseLeave = () => {
    setHoverStyle((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-4">
      <div className="bg-zinc-950/80 border border-zinc-800/40 backdrop-blur-xl rounded-full h-16 flex items-center justify-between px-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        
        {/* Logo Section */}
        <div 
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 group cursor-pointer pr-4"
        >
          <div className="flex items-center text-emerald-500 font-bold mono text-xl tracking-tighter">
            <span>&gt;</span>
            <span className="animate-blink text-emerald-400">_</span>
          </div>
          <span className="text-white group-hover:text-emerald-400 transition-all duration-500 font-extrabold tracking-tight whitespace-nowrap text-lg">
            Cyb3rWo9f's Lab
          </span>
        </div>

        {/* Desktop Links with Sliding Container */}
        <div 
          ref={containerRef}
          className="hidden md:flex relative items-center bg-zinc-900/40 border border-zinc-800/50 p-1 rounded-full"
        >
          <div 
            className="absolute h-[calc(100%-8px)] bg-zinc-700/40 rounded-full transition-all duration-300 ease-out pointer-events-none"
            style={hoverStyle}
          />

          {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.href;
            return (
              <a
                key={item.label}
                href={`#${item.href}`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.href);
                }}
                className={`relative z-10 px-5 py-2 text-sm font-semibold transition-all duration-300 whitespace-nowrap rounded-full ${
                  isActive 
                    ? 'bg-white text-black' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>

        {/* Action Button Section */}
        <div className="pl-4">
          <button onClick={onLoginToggle} className="bg-white hover:bg-emerald-500 text-black text-sm font-bold px-6 py-2.5 rounded-full transition-all duration-300 flex items-center gap-2 group">
            <Shield size={14} className="group-hover:rotate-12 transition-transform" />
            {isLoggedIn ? 'Logout' : 'Login'}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
