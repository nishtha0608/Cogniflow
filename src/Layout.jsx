import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { useAuth } from '@/lib/AuthContext';
import { cogniflow } from '@/api/cogniflowClient';
import { useQuery } from '@tanstack/react-query';
import { useActiveProject } from '@/lib/ProjectContext';
import { useTheme } from '@/lib/ThemeContext';
import {
  BookOpen,
  PenTool,
  Search,
  GraduationCap,
  Clock,
  LogOut,
  Menu,
  X,
  Brain,
  FileText,
  MessageSquare,
  Sparkles,
  Zap,
  ChevronRight,
  ArrowLeft,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Eight modules as defined in the paper (Figure 4)
const MODES = [
  { id: 'thinking',  name: 'Thinking Mode',      icon: Brain,         page: 'Dashboard',      color: 'from-violet-500 to-purple-600',  accent: '#8b5cf6' },
  { id: 'writing',   name: 'Writing Mode',        icon: PenTool,       page: 'Writing',        color: 'from-blue-500 to-cyan-600',      accent: '#3b82f6' },
  { id: 'research',  name: 'Research Assistant',  icon: MessageSquare, page: 'ResearchChat',   color: 'from-emerald-500 to-teal-600',   accent: '#10b981' },
  { id: 'gaps',      name: 'Gap Analyzer',        icon: Search,        page: 'GapAnalyzer',    color: 'from-amber-500 to-orange-600',   accent: '#f59e0b' },
  { id: 'viva',      name: 'Viva Preparation',    icon: GraduationCap, page: 'VivaSimulator',  color: 'from-rose-500 to-pink-600',      accent: '#f43f5e' },
  { id: 'memory',    name: 'Research Memory',     icon: Clock,         page: 'Memory',         color: 'from-slate-500 to-gray-600',     accent: '#64748b' },
  { id: 'projects',  name: 'Project Dashboard',   icon: BookOpen,      page: 'Projects',       color: 'from-indigo-500 to-blue-600',    accent: '#6366f1' },
  { id: 'documents', name: 'Document Manager',    icon: FileText,      page: 'Documents',      color: 'from-fuchsia-500 to-violet-600', accent: '#d946ef' },
];


export default function Layout({ children, currentPageName }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { projects, activeProject, clearProject } = useActiveProject();

  const currentMode = MODES.find((m) => m.page === currentPageName);
  const activeAccent = currentMode?.accent || '#8b5cf6';

  const isProjectsHub = currentPageName === 'Projects';

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', user?.email],
    queryFn: () => cogniflow.entities.Document.list('-updated_date', 50),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: gaps = [] } = useQuery({
    queryKey: ['gaps', user?.email],
    queryFn: () => cogniflow.entities.ResearchGap.list('-created_date', 20),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.email],
    queryFn: () => cogniflow.entities.Conversation.list('-updated_date', 20),
    enabled: !!user,
    staleTime: 60_000,
  });

  const momentum = useMemo(() => {
    if (!user) return null;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const docsThisWeek  = documents.filter(d => new Date(d.created_date) >= weekAgo).length;
    const gapsThisWeek  = gaps.filter(g => new Date(g.created_date) >= weekAgo).length;
    const convsThisWeek = conversations.filter(c => new Date(c.updated_date || c.created_date) >= weekAgo).length;
    const totalDocs     = documents.length;

    const raw   = docsThisWeek * 15 + gapsThisWeek * 20 + convsThisWeek * 10;
    const base  = 10 + totalDocs * 3 + projects.length * 5;
    const score = Math.min(100, Math.max(10, raw + base));

    const labelMap = [
      [90, "Breakthrough Mode"],
      [80, "Accelerating"],
      [65, "In Flow"],
      [50, "Building"],
      [35, "Warming Up"],
      [0,  "Dormant"],
    ];
    return {
      score,
      label: labelMap.find(([t]) => score >= t)[1],
    };
  }, [user, documents, gaps, conversations, projects]);

  return (
    <div className="min-h-screen bg-violet-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-300">
      {/* Aurora background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-10 transition-colors duration-1000"
          style={{ background: activeAccent }}
        />
        <div
          className="absolute top-1/3 -right-40 w-80 h-80 rounded-full blur-3xl opacity-8 transition-colors duration-1000"
          style={{ background: activeAccent, opacity: 0.06 }}
        />
      </div>

      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-b border-gray-200 dark:border-slate-800 z-50">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Logo */}
            <Link to={createPageUrl('Projects')} className="flex items-center gap-2.5 group">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${activeAccent}, ${activeAccent}88)` }}
              >
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="font-bold text-base tracking-tight hidden sm:block text-gray-900">
                Cogni<span style={{ color: activeAccent }}>Flow</span>
              </span>
            </Link>

            {/* Collapse toggle (desktop) */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-700"
            >
              <ChevronRight size={14} className={cn('transition-transform duration-300', collapsed ? '' : 'rotate-180')} />
            </button>

            {/* Workspace breadcrumb — shown only when a project is active */}
            {!isProjectsHub && activeProject && (
              <div className="hidden md:flex items-center gap-1.5 ml-1">
                <Link
                  to={createPageUrl('Projects')}
                  onClick={() => clearProject()}
                  className="text-xs text-gray-400 hover:text-gray-500 transition-colors font-medium"
                >
                  Projects
                </Link>
                <ChevronRight size={10} className="text-gray-300" />
                <span
                  className="text-xs font-semibold truncate max-w-[200px]"
                  style={{ color: activeAccent }}
                >
                  {activeProject.title}
                </span>
              </div>
            )}
          </div>

          {/* Centre: Current mode pill */}
          {currentMode && !isProjectsHub && (
            <div
              className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border border-gray-200 transition-all duration-500"
              style={{
                background: `${activeAccent}18`,
                borderColor: `${activeAccent}30`,
                color: activeAccent,
              }}
            >
              <currentMode.icon size={13} />
              {currentMode.name}
            </div>
          )}

          {/* Right: user + momentum + logout */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {momentum && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs">
                <Zap size={11} className="text-amber-400" />
                <span className="text-amber-400 font-bold">{momentum.score}</span>
                <span className="text-gray-500 dark:text-slate-300">{momentum.label}</span>
              </div>
            )}
            {user && (
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">{user.full_name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-400 leading-tight">{user.email}</p>
                </div>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: `linear-gradient(135deg, ${activeAccent}, ${activeAccent}88)` }}
                >
                  {(user.full_name || user.email || '?')[0].toUpperCase()}
                </div>
                <button
                  onClick={logout}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        'fixed left-0 top-14 bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-r border-gray-200 dark:border-slate-800 z-40 transition-all duration-300 flex flex-col',
        'lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed ? 'w-16' : 'w-64',
      )}>

        {/* Workspace context header — shown when inside a tool, not on the Projects hub */}
        {!isProjectsHub && (
          <div className={cn('border-b border-gray-200 shrink-0', collapsed ? 'py-3 px-2' : 'p-3')}>
            <Link
              to={createPageUrl('Projects')}
              onClick={() => { setMobileOpen(false); clearProject(); }}
              className={cn(
                'flex items-center gap-2 rounded-xl text-gray-500 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-slate-800/60 transition-colors',
                collapsed ? 'justify-center py-2' : 'px-3 py-2 mb-2 text-xs font-medium',
              )}
              title={collapsed ? 'All Projects' : undefined}
            >
              <ArrowLeft size={13} />
              {!collapsed && 'All Projects'}
            </Link>

          </div>
        )}

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {/* Research Modes */}
          {!collapsed && (
            <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-widest">
              Modules
            </p>
          )}

          {MODES.map((mode) => {
            const isActive = currentPageName === mode.page;
            const Icon = mode.icon;
            return (
              <Link
                key={mode.id}
                to={createPageUrl(mode.page)}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl transition-all duration-200 group',
                  collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
                  isActive
                    ? 'text-gray-900 dark:text-white font-semibold'
                    : 'text-gray-500 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-slate-800/60',
                )}
                title={collapsed ? mode.name : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeModeBg"
                    className={`absolute inset-0 rounded-xl bg-gradient-to-r ${mode.color} opacity-20`}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                {isActive && (
                  <div
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-gradient-to-b ${mode.color}`}
                  />
                )}
                <div
                  className={cn(
                    'relative flex items-center justify-center w-7 h-7 rounded-lg transition-all',
                    isActive
                      ? `bg-gradient-to-br ${mode.color} shadow-lg`
                      : 'bg-transparent group-hover:bg-gray-100 dark:group-hover:bg-slate-800',
                  )}
                >
                  <Icon size={15} className={isActive ? 'text-white' : ''} />
                </div>
                {!collapsed && (
                  <span className="relative text-sm font-medium">{mode.name}</span>
                )}
              </Link>
            );
          })}

        </nav>

        {/* Bottom: Research health */}
        {!collapsed && (
          <div className="p-3 border-t border-gray-200 dark:border-slate-800 shrink-0">
            <div className="p-3 rounded-xl bg-gray-100/70 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-300">Research Health</span>
                <span
                  className="text-xs font-bold"
                  style={{ color: momentum?.score >= 65 ? '#10b981' : momentum?.score >= 40 ? '#f59e0b' : '#ef4444' }}
                >
                  {momentum?.label || 'Calculating…'}
                </span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${momentum?.score || 0}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: momentum?.score >= 65
                      ? 'linear-gradient(90deg, #10b981, #059669)'
                      : momentum?.score >= 40
                      ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                      : 'linear-gradient(90deg, #ef4444, #dc2626)',
                  }}
                />
              </div>
              {momentum && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Zap size={11} className="text-amber-400" />
                  <span className="text-xs text-gray-400">{momentum.score}/100 momentum</span>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className={cn(
        'relative z-10 pt-14 min-h-screen transition-all duration-300',
        collapsed ? 'lg:pl-16' : 'lg:pl-64',
      )}>
        {children}
      </main>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
