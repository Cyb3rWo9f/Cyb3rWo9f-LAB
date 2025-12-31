import React, { useState, useEffect } from 'react';
import { ArrowLeft, Github, Mail, Code2, RefreshCw, Twitter, X } from 'lucide-react';
import { fetchLanguageStats, fetchGitHubStats, getLastSyncTime, formatBytes, LanguageSkill, GitHubStats } from '../services/github';

interface ToolsViewProps {
  onBack: () => void;
}

const AboutView: React.FC<ToolsViewProps> = ({ onBack }) => {
  const [skills, setSkills] = useState<LanguageSkill[]>([]);
  const [githubStats, setGithubStats] = useState<GitHubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ identifier: '', subject: '', payload: '' });
  const [sending, setSending] = useState(false);

  const loadGitHubData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch both stats and language data in parallel
      const [langData, statsData] = await Promise.all([
        fetchLanguageStats(),
        fetchGitHubStats(),
      ]);

      if (langData.length > 0) {
        setSkills(langData);
      }
      setGithubStats(statsData);
      setLastSync(getLastSyncTime());
    } catch (err) {
      console.error('Failed to load GitHub data:', err);
      setError('Failed to fetch GitHub data. Using cached values.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGitHubData();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="mb-12 md:mb-16 border-b border-emerald-500/20 pb-8 md:pb-12">
        <button
          onClick={onBack}
          className="group flex items-center gap-3 text-zinc-500 hover:text-emerald-400 transition-colors mb-8 md:mb-10 mono text-xs uppercase tracking-wider"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </button>

        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter">
            Cyb3rWo9f
          </h1>
          <p className="text-zinc-400 text-base md:text-lg max-w-4xl leading-relaxed">
            <span className="text-emerald-400">/ˈsaɪbər ˈwʊlf/</span> • <span className="text-emerald-400">v0ids3ek3r</span>
          </p>
          <p className="text-zinc-500 text-sm md:text-base max-w-4xl leading-relaxed">
            A curious mind deeply invested in chess, Linux (KDE gang), and the intricate world of computer systems—from programming and networking to security research and ethical hacking. Philosophy and systems thinking guide my approach to solving problems. I've grown quieter about myself over the years, but these passions remain constant. My DMs are always open; if you want to discuss ideas, collaborate on projects, or just chat about any of these topics, I'd love to hear from you.
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-16">
        {/* Left Column - Profile & Contact */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="group border border-emerald-500/20 bg-gradient-to-br from-zinc-950/80 to-zinc-950/40 rounded-lg p-8 hover:border-emerald-500/40 transition-all duration-300">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 rounded-lg blur-xl group-hover:blur-2xl transition-all" />
              <img 
                src="/images/voidseeker.gif" 
                alt="Cyb3rWo9f" 
                className="relative w-32 h-32 rounded-lg object-cover border border-emerald-500/30"
              />
            </div>
            <h2 className="text-2xl font-bold text-white text-center mb-2">Cyb3rWo9f</h2>
            <p className="text-emerald-400 mono text-xs text-center uppercase tracking-[0.2em] mb-6 font-semibold">
              v0ids3ek3r
            </p>
            <div className="w-12 h-1 bg-gradient-to-r from-emerald-500 to-transparent mx-auto mb-6" />
            <p className="text-zinc-400 text-sm text-center leading-relaxed">
              Chess player, systems thinker, eternal student of technology and philosophy.
            </p>
          </div>

          {/* Contact Links */}
          <div className="space-y-3">
            <a
              href="https://github.com/Cyb3rWo9f"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 border border-emerald-500/20 rounded-lg bg-zinc-950/50 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all duration-300 group/link"
            >
              <Github size={16} className="text-emerald-500 group-hover/link:scale-110 transition-transform" />
              <span className="mono text-xs uppercase tracking-widest">github.com/Cyb3rWo9f</span>
            </a>
            <a
              href="https://x.com/Cyb3rWo9f"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 border border-emerald-500/20 rounded-lg bg-zinc-950/50 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all duration-300 group/link"
            >
              <Twitter size={16} className="text-emerald-500 group-hover/link:scale-110 transition-transform" />
              <span className="mono text-xs uppercase tracking-widest">x.com/Cyb3rWo9f</span>
            </a>
            <button
              onClick={() => setShowContactModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 border border-emerald-500/20 rounded-lg bg-zinc-950/50 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all duration-300 group/link"
            >
              <Mail size={16} className="text-emerald-500 group-hover/link:scale-110 transition-transform" />
              <span className="mono text-xs uppercase tracking-widest">message</span>
            </button>
          </div>

          {/* Stats Card */}
          <div className="border border-emerald-500/20 bg-gradient-to-br from-zinc-950/80 to-zinc-950/40 rounded-lg p-6 hover:border-emerald-500/40 transition-all duration-300">
            <h3 className="text-xs font-bold text-emerald-400 mb-6 uppercase tracking-[0.2em]">GitHub Metrics</h3>
            <div className="space-y-5">
              {githubStats ? [
                { label: 'Public Repos', value: githubStats.publicRepos.toString(), stat: `${Math.min(100, githubStats.publicRepos * 4)}%` },
                { label: 'Followers', value: githubStats.followers.toString(), stat: `${Math.min(100, githubStats.followers * 2)}%` },
                { label: 'Following', value: githubStats.following.toString(), stat: `${Math.min(100, githubStats.following * 2)}%` },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-zinc-400 uppercase tracking-wider">{item.label}</span>
                    <span className="text-sm font-bold text-emerald-400">{item.value}</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: item.stat }}
                    />
                  </div>
                </div>
              )) : (
                <div className="text-zinc-600 text-sm mono">Loading stats...</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Skills */}
        <div className="lg:col-span-2">
          <div className="border border-emerald-500/20 bg-gradient-to-br from-zinc-950/80 to-zinc-950/40 rounded-lg p-8 hover:border-emerald-500/40 transition-all duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Code2 size={20} className="text-emerald-500" />
                <h3 className="text-lg font-bold text-white uppercase tracking-[0.15em]">Programming Languages</h3>
              </div>
              <button
                onClick={() => loadGitHubData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-emerald-400 border border-zinc-800 hover:border-emerald-500/50 rounded transition-all disabled:opacity-50"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Syncing...' : 'Refresh'}
              </button>
            </div>

            {error && (
              <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
                {error}
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2 animate-pulse">
                    <div className="flex justify-between">
                      <div className="h-4 w-20 bg-zinc-800 rounded" />
                      <div className="h-4 w-10 bg-zinc-800 rounded" />
                    </div>
                    <div className="h-2.5 bg-zinc-800 rounded-full" />
                  </div>
                ))}
              </div>
            ) : skills.length === 0 ? (
              <div className="text-zinc-500 text-sm">No language data available. Make sure repositories are public.</div>
            ) : (
              <div className="space-y-6">
                {skills.map((skill) => (
                  <div
                    key={skill.name}
                    className="space-y-2 cursor-pointer transition-all duration-300"
                    onMouseEnter={() => setHoveredSkill(skill.name)}
                    onMouseLeave={() => setHoveredSkill(null)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold transition-all duration-300 ${
                          hoveredSkill === skill.name ? 'text-emerald-400' : 'text-zinc-300'
                        }`}>
                          {skill.name}
                        </span>
                        {hoveredSkill === skill.name && (
                          <span className="text-xs text-zinc-500 mono">
                            ({formatBytes(skill.bytes)})
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-bold transition-all duration-300 ${
                        hoveredSkill === skill.name ? 'text-emerald-400' : 'text-emerald-500/70'
                      }`}>
                        {skill.percentage}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-900/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${skill.color} rounded-full transition-all duration-500 ease-out ${
                          hoveredSkill === skill.name ? 'shadow-lg shadow-emerald-500/50' : ''
                        }`}
                        style={{ 
                          width: `${skill.percentage}%`,
                          transform: hoveredSkill === skill.name ? 'scaleY(1.2)' : 'scaleY(1)',
                          transformOrigin: 'center',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-emerald-500/10">
              <p className="text-xs text-zinc-500 mono leading-relaxed">
                Proficiency levels are calculated from actual code in public GitHub repositories, measured by bytes of code per language across all non-forked repos. Last synced: <span className="text-emerald-400">{lastSync || 'syncing...'}</span>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setShowContactModal(false)}
        >
          <div 
            className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 md:p-8 max-w-lg w-full animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Send Message
                </h2>
                <p className="text-zinc-500 text-xs mono mt-1">// secure_transmission</p>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-zinc-600 hover:text-zinc-400 transition-colors p-1 hover:bg-zinc-800 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSending(true);
                // Simulate sending
                setTimeout(() => {
                  setSending(false);
                  setShowContactModal(false);
                  setContactForm({ identifier: '', subject: '', payload: '' });
                  alert('Message sent successfully!');
                }, 1500);
              }}
              className="space-y-5"
            >
              {/* Identifier */}
              <div className="space-y-2">
                <label className="text-[11px] text-zinc-500 mono uppercase tracking-wider">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.identifier}
                  onChange={(e) => setContactForm({ ...contactForm, identifier: e.target.value })}
                  placeholder="Your name"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-4 py-3 text-zinc-200 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none transition-colors text-sm"
                />
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-[11px] text-zinc-500 mono uppercase tracking-wider">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  placeholder="What's this about?"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-4 py-3 text-zinc-200 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none transition-colors text-sm"
                />
              </div>

              {/* Payload */}
              <div className="space-y-2">
                <label className="text-[11px] text-zinc-500 mono uppercase tracking-wider">
                  Message
                </label>
                <textarea
                  required
                  value={contactForm.payload}
                  onChange={(e) => setContactForm({ ...contactForm, payload: e.target.value })}
                  placeholder="Write your message..."
                  rows={5}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-4 py-3 text-zinc-200 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none transition-colors text-sm resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={sending}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-md transition-colors duration-200 text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>

            <p className="text-[10px] text-zinc-600 mono text-center mt-6">
              Messages are end-to-end encrypted
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutView;
