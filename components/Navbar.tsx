
import React, { useState, useRef } from 'react';
import { LogOut, Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, isLoading, isLoggedIn, isApproved, login, logout, userInitials } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
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
        <div className="pl-4 relative">
          {isLoading ? (
            <div className="bg-zinc-800 text-zinc-400 text-sm font-bold px-6 py-2.5 rounded-full flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              <span className="hidden sm:inline">Loading...</span>
            </div>
          ) : isLoggedIn && user ? (
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-emerald-500/50 text-white text-sm font-bold px-3 py-2 rounded-full transition-all duration-300"
              >
                {/* User Avatar */}
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-black text-xs font-bold">
                  {userInitials}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">{user.name}</span>
                <svg className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-zinc-800">
                      <p className="text-white text-sm font-medium truncate">{user.name}</p>
                      <p className="text-zinc-500 text-xs truncate">{user.email}</p>
                    </div>
                    
                    {/* Approval Status */}
                    <div className="px-4 py-3 border-b border-zinc-800">
                      <div className="flex items-center gap-2">
                        {isApproved ? (
                          <>
                            <ShieldCheck size={16} className="text-emerald-500" />
                            <div>
                              <p className="text-emerald-500 text-xs font-bold uppercase tracking-wider">Approved</p>
                              <p className="text-zinc-600 text-[10px]">Full access to all writeups</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <ShieldX size={16} className="text-amber-500" />
                            <div>
                              <p className="text-amber-500 text-xs font-bold uppercase tracking-wider">Pending</p>
                              <p className="text-zinc-600 text-[10px]">Limited access to writeups</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-1">
                      <button 
                        onClick={() => {
                          setShowDropdown(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-zinc-800 transition-colors"
                      >
                        <LogOut size={14} />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button 
              onClick={login}
              className="bg-white hover:bg-emerald-500 text-black text-sm font-bold px-6 py-2.5 rounded-full transition-all duration-300 flex items-center gap-2 group"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="hidden sm:inline">Continue with Google</span>
              <span className="sm:hidden">Login</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
