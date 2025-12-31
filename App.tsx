
import React, { useState, Suspense } from 'react';
import Background from './components/Background';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SystemDashboard from './components/SystemDashboard';
const PlatformTimeline = React.lazy(() => import('./components/PlatformTimeline'));
const WriteupView = React.lazy(() => import('./components/WriteupView'));
const NewsView = React.lazy(() => import('./components/NewsView'));
const ToolsView = React.lazy(() => import('./components/ToolsView'));
const AboutView = React.lazy(() => import('./components/AboutView'));

const App: React.FC = () => {
  const [view, setView] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <div className="min-h-screen selection:bg-emerald-500 selection:text-black bg-black overflow-x-hidden">
      <Background />
      <Navbar currentView={view} onNavigate={setView} isLoggedIn={isLoggedIn} onLoginToggle={() => setIsLoggedIn(v => !v)} />
      
      <main className="container mx-auto px-6 pt-32 pb-24 flex min-h-screen items-center justify-center">
        {view === 'home' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-32 w-full max-w-7xl items-center">
            {/* Left Content - Hero Section & Dashboard */}
            <section className="lg:col-span-5 xl:col-span-6 flex flex-col items-start animate-in fade-in slide-in-from-left-8 duration-1000">
              <Hero onNavigate={setView} />
              <SystemDashboard />
            </section>

            {/* Right Content - Advanced Zig-Zag Timeline */}
            <section className="lg:col-span-7 xl:col-span-6 hidden lg:flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-12 duration-1000 delay-200">
              <div className="w-full max-w-lg" style={{ willChange: 'transform, opacity' }}>
                <Suspense fallback={<div className="mono text-[10px] text-zinc-600">Loading timeline…</div>}>
                  <PlatformTimeline />
                </Suspense>
              </div>
            </section>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            {view === 'archives' ? (
              <Suspense fallback={<div className="mono text-[10px] text-zinc-600">Loading archives…</div>}>
                <WriteupView onBack={() => setView('home')} isLoggedIn={isLoggedIn} onLogin={() => setIsLoggedIn(true)} />
              </Suspense>
            ) : view === 'news' ? (
              <Suspense fallback={<div className="mono text-[10px] text-zinc-600">Loading news feed…</div>}>
                <NewsView onBack={() => setView('home')} />
              </Suspense>
            ) : view === 'tools' ? (
              <Suspense fallback={<div className="mono text-[10px] text-zinc-600">Loading tools…</div>}>
                <ToolsView onBack={() => setView('home')} />
              </Suspense>
            ) : view === 'about' ? (
              <Suspense fallback={<div className="mono text-[10px] text-zinc-600">Loading about…</div>}>
                <AboutView onBack={() => setView('home')} />
              </Suspense>
            ) : (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <div className="text-emerald-500 mono text-xl mb-4 animate-pulse">404::MODULE_NOT_FOUND</div>
                <p className="text-zinc-500 mono text-xs uppercase tracking-widest">Section under construction or restricted.</p>
                <button onClick={() => setView('home')} className="mt-8 text-white mono text-[10px] border border-zinc-800 px-4 py-2 hover:border-emerald-500 transition-colors uppercase font-bold">Return Home</button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Lab Telemetry Footer */}
      <footer className="fixed bottom-6 left-12 hidden md:block z-40">
        <div className="flex items-center gap-10 text-[9px] mono text-zinc-600 tracking-[0.3em] uppercase">
          <div className="flex items-center gap-2 group cursor-crosshair">
            <span className="w-1 h-1 bg-emerald-500/30 rounded-full group-hover:bg-emerald-500 transition-colors shadow-[0_0_5px_#10b981]" />
            <span className="group-hover:text-zinc-400 transition-colors">LATENCY: 12ms</span>
          </div>
          <div className="flex items-center gap-2 group cursor-crosshair">
            <span className="w-1 h-1 bg-emerald-500/30 rounded-full group-hover:bg-emerald-500 transition-colors shadow-[0_0_5px_#10b981]" />
            <span className="group-hover:text-zinc-400 transition-colors">ENCRYPTED: AES-256</span>
          </div>
          <div className="flex items-center gap-2 group cursor-crosshair">
            <span className="w-1 h-1 bg-emerald-500/30 rounded-full group-hover:bg-emerald-500 transition-colors shadow-[0_0_5px_#10b981]" />
            <span className="group-hover:text-zinc-400 transition-colors">STATUS: NOMINAL</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
