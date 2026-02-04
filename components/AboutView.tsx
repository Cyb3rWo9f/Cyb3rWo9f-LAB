import React, { useState, useEffect } from 'react';
import { ArrowLeft, Github, Mail, Code2, RefreshCw, Twitter, X, CheckCircle2, AlertCircle, BookOpen, Star, GitFork, ExternalLink, FolderGit2 } from 'lucide-react';
import { fetchLanguageStats, fetchGitHubStats, fetchFeaturedProjects, getLastSyncTime, formatBytes, LanguageSkill, GitHubStats, FeaturedProject } from '../services/github';
import { sendContactMessage } from '../services/emailService';
import { fetchJournalingStats, JournalingStats } from '../services/journaling';

interface ToolsViewProps {
  onBack: () => void;
}

const AboutView: React.FC<ToolsViewProps> = ({ onBack }) => {
  const [skills, setSkills] = useState<LanguageSkill[]>([]);
  const [githubStats, setGithubStats] = useState<GitHubStats | null>(null);
  const [journalingStats, setJournalingStats] = useState<JournalingStats | null>(null);
  const [projects, setProjects] = useState<FeaturedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ identifier: '', subject: '', payload: '' });
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadGitHubData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch both stats and language data in parallel
      const [langData, statsData, journalData, projectsData] = await Promise.all([
        fetchLanguageStats(),
        fetchGitHubStats(),
        fetchJournalingStats(),
        fetchFeaturedProjects(),
      ]);

      if (langData.length > 0) {
        setSkills(langData);
      }
      setGithubStats(statsData);
      setJournalingStats(journalData);
      setProjects(projectsData);
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
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-700 px-3 sm:px-4 lg:px-0">
      {/* Header */}
      <div className="mb-6 md:mb-8 border-b border-zinc-900 pb-6 md:pb-8">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-zinc-500 hover:text-emerald-400 transition-colors mb-6 md:mb-8 mono text-[9px] sm:text-xs uppercase tracking-wider"
        >
          <ArrowLeft size={14} className="sm:hidden group-hover:-translate-x-1 transition-transform" />
          <ArrowLeft size={16} className="hidden sm:block group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </button>

        <div className="relative">
          {/* Corner brackets */}
          <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-emerald-500/30" />
          <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-emerald-500/30" />
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-emerald-500/40 text-3xl md:text-5xl font-light select-none">[</span>
              <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-violet-400 tracking-tighter pt-1">
                Cyb3rWo9f
              </h1>
              <span className="text-violet-500/40 text-3xl md:text-5xl font-light select-none">]</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm md:text-base">
              <span className="px-2 py-1 border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 mono text-xs rounded">/ˈsaɪbər ˈwʊlf/</span>
              <span className="w-1 h-1 bg-zinc-700 rounded-full" />
              <span className="px-2 py-1 border border-violet-500/30 bg-violet-500/5 text-violet-300 mono text-xs rounded font-bold">v0ids3ek3r</span>
            </div>
            <p className="text-zinc-400 text-sm md:text-base max-w-4xl leading-relaxed border-l-2 border-emerald-500/20 pl-4">
              A curious mind deeply invested in chess, Linux (KDE gang), and the intricate world of computer systems—from programming and networking to security research and ethical hacking. Philosophy and systems thinking guide my approach to solving problems.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
        {/* Left Column - Profile & Contact */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="group relative border border-zinc-800 bg-zinc-950/90 rounded-sm p-6 hover:border-emerald-500/30 transition-all duration-300">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-500/40" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-500/40" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-500/40" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-500/40" />
            
            <div className="relative w-24 h-24 mx-auto mb-5">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-violet-500/20 rounded blur-md group-hover:blur-lg transition-all" />
              <img 
                src="/images/voidseeker.gif" 
                alt="Cyb3rWo9f" 
                className="relative w-24 h-24 rounded object-cover border-2 border-emerald-500/40"
              />
            </div>
            <h2 className="text-xl font-black text-white text-center mb-1.5">Cyb3rWo9f</h2>
            <p className="text-emerald-400 mono text-[10px] text-center uppercase tracking-[0.15em] mb-4 font-bold">
              v0ids3ek3r
            </p>
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto mb-4" />
            <p className="text-zinc-400 text-xs text-center leading-relaxed">
              Chess player, systems thinker, eternal student of technology and philosophy.
            </p>
          </div>

          {/* Contact Links */}
          <div className="space-y-2">
            <a
              href="https://github.com/Cyb3rWo9f"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2.5 border border-zinc-800 rounded-sm bg-zinc-950/50 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all duration-300 group/link"
            >
              <Github size={14} className="text-emerald-500 group-hover/link:scale-110 transition-transform" />
              <span className="mono text-[10px] uppercase tracking-wider flex-1">github</span>
            </a>
            <a
              href="https://x.com/Cyb3rWo9f"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2.5 border border-zinc-800 rounded-sm bg-zinc-950/50 text-zinc-400 hover:text-violet-400 hover:border-violet-500/50 transition-all duration-300 group/link"
            >
              <Twitter size={14} className="text-violet-500 group-hover/link:scale-110 transition-transform" />
              <span className="mono text-[10px] uppercase tracking-wider flex-1">twitter/x</span>
            </a>
            <button
              onClick={() => setShowContactModal(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 border border-zinc-800 rounded-sm bg-zinc-950/50 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all duration-300 group/link"
            >
              <Mail size={14} className="text-emerald-500 group-hover/link:scale-110 transition-transform" />
              <span className="mono text-[10px] uppercase tracking-wider flex-1">message</span>
            </button>
          </div>

          {/* Stats Card */}
          <div className="border border-zinc-800 bg-zinc-950/90 rounded-sm p-5 hover:border-emerald-500/30 transition-all duration-300">
            <h3 className="text-[10px] font-bold text-emerald-400 mb-5 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              GitHub Metrics
            </h3>
            <div className="space-y-4">
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

          {/* Journaling.tech Stats Card */}
          <div className="border border-zinc-800 bg-zinc-950/90 rounded-sm p-5 hover:border-violet-500/30 transition-all duration-300">
            <h3 className="text-[10px] font-bold text-violet-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
              Journaling.tech Stats
            </h3>
            <div className="space-y-3">
              {journalingStats ? [
                { label: 'Entries', value: journalingStats.totalEntries.toString() },
                { label: 'Current', value: journalingStats.currentStreak.toString() },
                { label: 'Best', value: journalingStats.bestStreak.toString() },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">{item.label}</span>
                  <span className="text-sm font-bold text-violet-400">{item.value}</span>
                </div>
              )) : (
                <div className="text-zinc-600 text-sm mono">Loading...</div>
              )}
            </div>
            <a 
              href="https://app.journaling.tech/u/Cyb3rWo9f"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-violet-400 transition-colors"
            >
              <BookOpen size={10} />
              View Profile
            </a>
          </div>
        </div>

        {/* Right Column - Skills */}
        <div className="lg:col-span-2">
          <div className="relative border border-zinc-800 bg-zinc-950/90 rounded-sm p-6 md:p-8 hover:border-emerald-500/30 transition-all duration-300">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-500/40" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-500/40" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-500/40" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-500/40" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <Code2 size={18} className="text-emerald-500 flex-shrink-0" />
                <h3 className="text-xs sm:text-base font-bold text-white uppercase tracking-[0.08em] sm:tracking-[0.12em]">Programming Languages</h3>
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
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
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

      {/* Featured Projects Section */}
      <div className="pb-12">
        <div className="relative border border-zinc-800 bg-zinc-950/90 rounded-sm p-6 md:p-8 hover:border-emerald-500/30 transition-all duration-300">
          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-500/40" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-500/40" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-500/40" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-500/40" />
          
          <div className="flex items-center gap-3 mb-6">
            <FolderGit2 size={18} className="text-emerald-500" />
            <h3 className="text-base font-bold text-white uppercase tracking-[0.12em]">Featured Projects</h3>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border border-zinc-800 bg-zinc-900/50 rounded p-4 animate-pulse">
                  <div className="h-4 bg-zinc-800 rounded mb-3 w-3/4" />
                  <div className="h-3 bg-zinc-800 rounded mb-2 w-full" />
                  <div className="h-3 bg-zinc-800 rounded mb-4 w-5/6" />
                  <div className="flex gap-2">
                    <div className="h-2 bg-zinc-800 rounded w-12" />
                    <div className="h-2 bg-zinc-800 rounded w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <a
                  key={project.name}
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-emerald-500/50 rounded p-4 transition-all duration-300"
                >
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-emerald-500/0 group-hover:border-emerald-500/50 transition-colors" />
                  <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-emerald-500/0 group-hover:border-emerald-500/50 transition-colors" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-emerald-500/0 group-hover:border-emerald-500/50 transition-colors" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-emerald-500/0 group-hover:border-emerald-500/50 transition-colors" />
                  
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors mono flex items-center gap-2">
                      {project.name}
                      <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h4>
                  </div>
                  
                  <p className="text-xs text-zinc-400 mb-3 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                      {project.language && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500/50" />
                          {project.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Star size={10} />
                        {project.stars}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork size={10} />
                        {project.forks}
                      </span>
                    </div>
                  </div>
                  
                  {project.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-zinc-800">
                      {project.topics.slice(0, 3).map((topic) => (
                        <span 
                          key={topic}
                          className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] rounded mono"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-600 mono text-sm">
              No projects found
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-emerald-500/10 flex items-center justify-between">
            <p className="text-xs text-zinc-500 mono">
              Showing top repositories by stars
            </p>
            <a
              href={`https://github.com/Cyb3rWo9f?tab=repositories`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors mono"
            >
              <Github size={10} />
              View All
            </a>
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
            className="relative bg-zinc-950 border border-emerald-500/30 rounded-sm p-6 md:p-8 max-w-lg w-full animate-in zoom-in-95 duration-300 shadow-lg shadow-emerald-500/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Corner brackets */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-emerald-500" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-emerald-500" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-emerald-500" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-emerald-500" />
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500/50 text-2xl font-light select-none">[</span>
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Send Message
                  </h2>
                  <span className="text-violet-500/50 text-2xl font-light select-none">]</span>
                </div>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-zinc-600 hover:text-emerald-400 transition-colors p-1.5 hover:bg-zinc-900 rounded border border-transparent hover:border-emerald-500/30"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-6 pb-6 border-b border-zinc-800">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-zinc-500 text-[10px] mono uppercase tracking-wider">secure_transmission</p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSending(true);
                setSendError(null);
                setSendSuccess(false);
                
                try {
                  const result = await sendContactMessage(
                    contactForm.identifier,
                    contactForm.subject,
                    contactForm.payload
                  );

                  if (result.success) {
                    setSendSuccess(true);
                    setContactForm({ identifier: '', subject: '', payload: '' });
                    
                    // Close modal after showing success
                    setTimeout(() => {
                      setShowContactModal(false);
                      setSendSuccess(false);
                    }, 2000);
                  } else {
                    setSendError(result.error || 'Failed to send message');
                  }
                } catch (error) {
                  setSendError('An unexpected error occurred. Please try again.');
                } finally {
                  setSending(false);
                }
              }}
              className="space-y-5"
            >
              {/* Success Message */}
              {sendSuccess && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-sm text-emerald-400 text-sm mono animate-in fade-in duration-200">
                  <CheckCircle2 size={16} />
                  <span>Message sent successfully!</span>
                </div>
              )}

              {/* Error Message */}
              {sendError && (
                <div className="flex items-start gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-sm text-red-400 text-xs mono animate-in fade-in duration-200">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{sendError}</span>
                </div>
              )}

              {/* Identifier */}
              <div className="space-y-2">
                <label className="text-[10px] text-emerald-400 mono uppercase tracking-[0.15em] font-bold flex items-center gap-2">
                  <span className="text-emerald-500">&gt;</span> Name
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.identifier}
                  onChange={(e) => setContactForm({ ...contactForm, identifier: e.target.value })}
                  placeholder="cyb3r_user"
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-sm px-4 py-2.5 text-zinc-200 placeholder-zinc-600 focus:border-emerald-500/50 focus:bg-zinc-900 focus:outline-none transition-all text-sm mono"
                />
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-[10px] text-emerald-400 mono uppercase tracking-[0.15em] font-bold flex items-center gap-2">
                  <span className="text-emerald-500">&gt;</span> Subject
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  placeholder="topic_of_discussion"
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-sm px-4 py-2.5 text-zinc-200 placeholder-zinc-600 focus:border-emerald-500/50 focus:bg-zinc-900 focus:outline-none transition-all text-sm mono"
                />
              </div>

              {/* Payload */}
              <div className="space-y-2">
                <label className="text-[10px] text-emerald-400 mono uppercase tracking-[0.15em] font-bold flex items-center gap-2">
                  <span className="text-emerald-500">&gt;</span> Message
                </label>
                <textarea
                  required
                  value={contactForm.payload}
                  onChange={(e) => setContactForm({ ...contactForm, payload: e.target.value })}
                  placeholder="# Enter your message here...\n# Be specific and clear"
                  rows={5}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-sm px-4 py-2.5 text-zinc-200 placeholder-zinc-600 focus:border-emerald-500/50 focus:bg-zinc-900 focus:outline-none transition-all text-sm resize-none mono leading-relaxed"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={sending}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-sm transition-all duration-200 text-xs uppercase tracking-[0.15em] disabled:opacity-50 disabled:cursor-not-allowed mt-2 border border-emerald-500/50 mono flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Transmitting...
                  </>
                ) : (
                  <>
                    <Mail size={14} />
                    Send Message
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-zinc-800 flex items-center justify-center gap-2">
              <div className="w-1 h-1 bg-emerald-500 rounded-full" />
              <p className="text-[9px] text-zinc-600 mono uppercase tracking-wider">
                secure_encrypted_channel
              </p>
              <div className="w-1 h-1 bg-emerald-500 rounded-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutView;
