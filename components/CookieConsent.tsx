import React, { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cyb3rwo9f_cookie_consent';

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Show banner after a short delay
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setIsVisible(false);
  };

  const declineCookies = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-8 duration-500">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-zinc-950/95 border border-zinc-800 backdrop-blur-xl p-4 md:p-5 rounded-lg shadow-2xl">
          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-emerald-500/50" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-emerald-500/50" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-emerald-500/50" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-emerald-500/50" />

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Icon and Text */}
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Cookie className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] mono text-emerald-500 uppercase tracking-widest">SYS::COOKIES</span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  We use cookies to enhance your browsing experience and analyze site traffic. 
                  <span className="text-zinc-500 ml-1">
                    By clicking "Accept", you consent to our use of cookies.
                  </span>
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
              <button
                onClick={declineCookies}
                className="flex-1 md:flex-none px-4 py-2 text-zinc-400 hover:text-white text-sm mono uppercase tracking-wider transition-colors border border-zinc-800 hover:border-zinc-600 rounded"
              >
                Decline
              </button>
              <button
                onClick={acceptCookies}
                className="flex-1 md:flex-none px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm mono font-bold uppercase tracking-wider transition-colors rounded shadow-lg shadow-emerald-500/20"
              >
                Accept
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={declineCookies}
            className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-500 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
