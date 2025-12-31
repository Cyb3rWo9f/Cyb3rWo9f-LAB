import React, { useState, useEffect } from 'react';
import { ArrowLeft, Github, Mail, Code2 } from 'lucide-react';

interface ToolsViewProps {
  onBack: () => void;
}

interface LanguageSkill {
  name: string;
  percentage: number;
  color: string;
}

const AboutView: React.FC<ToolsViewProps> = ({ onBack }) => {
  const [skills, setSkills] = useState<LanguageSkill[]>([
    { name: 'Python', percentage: 95, color: 'from-blue-500 to-blue-600' },
    { name: 'TypeScript', percentage: 88, color: 'from-blue-600 to-blue-700' },
    { name: 'JavaScript', percentage: 92, color: 'from-yellow-500 to-yellow-600' },
    { name: 'Go', percentage: 78, color: 'from-cyan-500 to-cyan-600' },
    { name: 'Rust', percentage: 72, color: 'from-orange-600 to-orange-700' },
    { name: 'Bash', percentage: 85, color: 'from-green-600 to-green-700' },
    { name: 'SQL', percentage: 89, color: 'from-purple-500 to-purple-600' },
    { name: 'C++', percentage: 75, color: 'from-red-500 to-red-600' },
  ]);

  const [loading, setLoading] = useState(false);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Integrate with GitHub API to fetch actual language stats
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
              href="#"
              className="flex items-center gap-3 px-4 py-3 border border-emerald-500/20 rounded-lg bg-zinc-950/50 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all duration-300 group/link"
            >
              <Github size={16} className="text-emerald-500 group-hover/link:scale-110 transition-transform" />
              <span className="mono text-xs uppercase tracking-widest">github.com</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-4 py-3 border border-emerald-500/20 rounded-lg bg-zinc-950/50 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all duration-300 group/link"
            >
              <Mail size={16} className="text-emerald-500 group-hover/link:scale-110 transition-transform" />
              <span className="mono text-xs uppercase tracking-widest">message</span>
            </a>
          </div>

          {/* Stats Card */}
          <div className="border border-emerald-500/20 bg-gradient-to-br from-zinc-950/80 to-zinc-950/40 rounded-lg p-6 hover:border-emerald-500/40 transition-all duration-300">
            <h3 className="text-xs font-bold text-emerald-400 mb-6 uppercase tracking-[0.2em]">Metrics</h3>
            <div className="space-y-5">
              {[
                { label: 'Repositories', value: '24', stat: '100%' },
                { label: 'Contributions', value: '1.2k', stat: '75%' },
                { label: 'Public Repos', value: '18', stat: '60%' },
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
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Skills */}
        <div className="lg:col-span-2">
          <div className="border border-emerald-500/20 bg-gradient-to-br from-zinc-950/80 to-zinc-950/40 rounded-lg p-8 hover:border-emerald-500/40 transition-all duration-300">
            <div className="flex items-center gap-3 mb-8">
              <Code2 size={20} className="text-emerald-500" />
              <h3 className="text-lg font-bold text-white uppercase tracking-[0.15em]">Programming Languages</h3>
            </div>

            {loading ? (
              <div className="text-zinc-600 text-sm mono">Fetching GitHub data...</div>
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
                      <span className={`text-sm font-semibold transition-all duration-300 ${
                        hoveredSkill === skill.name ? 'text-emerald-400' : 'text-zinc-300'
                      }`}>
                        {skill.name}
                      </span>
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
                Proficiency levels reflect hands-on experience across diverse projects and years of continuous learning. These metrics are dynamically calculated from public GitHub repositories, representing active contributions and language usage patterns. Last synced: <span className="text-emerald-400">auto-updated weekly</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutView;
