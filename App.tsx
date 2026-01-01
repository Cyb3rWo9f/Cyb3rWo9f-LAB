
import React, { useState, Suspense } from 'react';
import Background from './components/Background';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SystemDashboard from './components/SystemDashboard';
import CookieConsent from './components/CookieConsent';
import { AuthProvider } from './context/AuthContext';
const PlatformTimeline = React.lazy(() => import('./components/PlatformTimeline'));
const WriteupView = React.lazy(() => import('./components/WriteupView'));
const NewsView = React.lazy(() => import('./components/NewsView'));
const ToolsView = React.lazy(() => import('./components/ToolsView'));
const AboutView = React.lazy(() => import('./components/AboutView'));

// Inner app component that uses auth context
const AppContent: React.FC = () => {
  const [view, setView] = useState('home');

  return (
    <div className="min-h-screen selection:bg-emerald-500 selection:text-black bg-black overflow-x-hidden">
      <Background />
      <Navbar currentView={view} onNavigate={setView} />
      
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
                <WriteupView onBack={() => setView('home')} />
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

      {/* Cookie Consent Banner */}
      <CookieConsent />

    </div>
  );
};

// Main App component wrapped with AuthProvider
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
