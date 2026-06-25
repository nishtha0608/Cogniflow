import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { cogniflow } from '@/api/cogniflowClient';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lightbulb,
  Target,
  ArrowRight,
  Sparkles,
  FileText,
  BookOpen,
  Activity,
  Zap,
  Shuffle,
  Users,
  Network,
  Flame,
  Quote,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useActiveProject } from '@/lib/ProjectContext';
import { cn } from '@/lib/utils';

// ── Animated counter ───────────────────────────────────────────────────────────

function AnimatedNumber({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const startValRef = useRef(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    startValRef.current = display;
    startRef.current = performance.now();

    const animate = (now) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startValRef.current + (value - startValRef.current) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <span>{display}</span>;
}

// ── Momentum Gauge ─────────────────────────────────────────────────────────────

function MomentumGauge({ score, label, streak }) {
  const radius = 54;
  const circ   = 2 * Math.PI * radius;
  const dash   = (score / 100) * circ;

  const getColor = (s) => {
    if (s >= 90) return ['#f97316', '#ef4444'];
    if (s >= 80) return ['#8b5cf6', '#6d28d9'];
    if (s >= 65) return ['#10b981', '#059669'];
    if (s >= 50) return ['#3b82f6', '#1d4ed8'];
    return ['#64748b', '#475569'];
  };
  const [c1, c2] = getColor(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <motion.circle
            cx="64" cy="64" r={radius}
            fill="none"
            stroke={`url(#gauge-grad)`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${circ}`}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={c1} />
              <stop offset="100%" stopColor={c2} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-gray-900 dark:text-white leading-none">
            <AnimatedNumber value={score} />
          </span>
          <span className="text-xs text-gray-400 dark:text-slate-500 mt-1">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-gray-900 dark:text-white">{label}</p>
        <div className="flex items-center gap-1.5 justify-center mt-1">
          <Flame size={12} className="text-orange-400" />
          <span className="text-xs text-gray-500 dark:text-slate-400">{streak}-day streak</span>
        </div>
      </div>
    </div>
  );
}

// ── Serendipity Card ───────────────────────────────────────────────────────────

function SerendipityCard({ connection, index }) {
  const [open, setOpen] = useState(false);
  const score = connection.serendipity_score || 75;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 overflow-hidden"
    >
      <button className="w-full flex items-start gap-3 p-3 text-left" onClick={() => setOpen(!open)}>
        <div
          className="mt-0.5 flex items-center justify-center rounded-lg w-8 h-8 shrink-0 text-xs font-bold"
          style={{
            background: `conic-gradient(from 0deg, #8b5cf6 ${score * 3.6}deg, #1e293b ${score * 3.6}deg)`,
          }}
        >
          <div className="w-5 h-5 bg-white rounded flex items-center justify-center text-violet-400 text-xs font-bold">
            {score}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-violet-300 mb-0.5">{connection.field}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2">{connection.insight}</p>
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400 dark:text-slate-500 mt-1 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 dark:text-slate-500 mt-1 shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-gray-200 dark:border-slate-800 pt-2">
              <p className="text-xs text-gray-700 dark:text-slate-300 mb-2">{connection.insight}</p>
              {connection.how_to_apply && (
                <div className="flex gap-2 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <Lightbulb size={12} className="text-violet-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-violet-300">{connection.how_to_apply}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [serendipityTopic, setSerendipityTopic] = useState('');
  const { projects, activeProject: currentProject } = useActiveProject();

  useEffect(() => {
    cogniflow.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: gaps = [] } = useQuery({
    queryKey: ['gaps', user?.email],
    queryFn: () => cogniflow.entities.ResearchGap.filter({ created_by: user.email }, '-created_date', 5),
    enabled: !!user,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', user?.email],
    queryFn: () => cogniflow.entities.Document.filter({ created_by: user.email }, '-updated_date', 10),
    enabled: !!user,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.email],
    queryFn: () => cogniflow.entities.Conversation.filter({ created_by: user.email }, '-updated_date', 10),
    enabled: !!user,
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
    const label  = labelMap.find(([t]) => score >= t)[1];
    const streak = Math.max(1, Math.min(7, docsThisWeek + convsThisWeek + gapsThisWeek));
    const breakthrough = Math.min(100, score + 12);

    const insights = [];
    if (docsThisWeek)  insights.push(`Added ${docsThisWeek} document${docsThisWeek  > 1 ? 's' : ''} this week — your library is growing`);
    if (gapsThisWeek)  insights.push(`Found ${gapsThisWeek} research gap${gapsThisWeek  > 1 ? 's' : ''} — your critical eye is sharpening`);
    if (convsThisWeek) insights.push(`Held ${convsThisWeek} research session${convsThisWeek > 1 ? 's' : ''} — active dialogue drives breakthroughs`);
    if (!insights.length) insights.push(
      "Upload a paper you've been meaning to read to ignite momentum",
      "Ask the Research Council your most pressing question",
      "Spend 20 minutes in the Writing editor — words build momentum",
    );

    const milestones = [
      "Complete your methodology outline",
      "Identify 5 critical research gaps",
      "Reach 10 Research Council sessions",
      "Upload 10 reference papers",
      "Write 1,000 words this week",
      "Run your first full gap analysis",
    ];

    return {
      score,
      label,
      streak_days: streak,
      documents_this_week: docsThisWeek,
      gaps_found: gapsThisWeek,
      breakthrough_proximity: breakthrough,
      next_milestone: milestones[totalDocs % milestones.length],
      insights: insights.slice(0, 3),
    };
  }, [user, documents, gaps, conversations, projects]);

  const narrativePayload = currentProject
    ? {
        project_title: currentProject.title || 'My Research',
        stage: currentProject.stage,
        keywords: currentProject.keywords || [],
        recent_activity: documents.length
          ? `Recently worked on: ${documents.slice(0, 2).map((d) => d.title).join(', ')}`
          : undefined,
      }
    : null;

  const { data: narrative, isLoading: narrativeLoading } = useQuery({
    queryKey: ['narrative', currentProject?.id],
    queryFn: () => cogniflow.ai.narrative(narrativePayload),
    enabled: !!narrativePayload,
    staleTime: 300_000,
  });

  const serendipityQuery = {
    research_topic: currentProject?.title || serendipityTopic || 'academic research',
    keywords: currentProject?.keywords || [],
  };

  const {
    data: serendipity,
    isLoading: serendipityLoading,
    refetch: refetchSerendipity,
  } = useQuery({
    queryKey: ['serendipity', currentProject?.id],
    queryFn: () => cogniflow.ai.serendipity(serendipityQuery),
    enabled: !!currentProject,
    staleTime: 300_000,
  });

  const healthMetrics = currentProject?.health_scores || { originality: 0, rigor: 0, coherence: 0, citation_trust: 0 };
  const overallHealth = Math.round(
    (healthMetrics.originality + healthMetrics.rigor + healthMetrics.coherence + healthMetrics.citation_trust) / 4,
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── CogniFlow AI Chat Banner ─────────────────────────────────── */}
      <Link to={createPageUrl('ResearchChat')}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-violet-200 dark:border-violet-500/20 bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-fuchsia-950/40 p-4 flex items-center gap-5 cursor-pointer group hover:shadow-lg hover:shadow-violet-200/50 dark:hover:shadow-violet-900/30 transition-all duration-300"
        >
          {/* Ambient glow blobs */}
          <div className="absolute -top-6 -left-6 w-32 h-32 bg-violet-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-6 right-24 w-40 h-40 bg-fuchsia-400/10 rounded-full blur-2xl pointer-events-none" />

          {/* Avatar */}
          <div className="shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:scale-105 transition-transform duration-300">
            <Brain size={26} className="text-white" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">CogniFlow AI</h2>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-400 leading-snug">
              Your personal AI research assistant — ask about your documents, papers, or any research question.
            </p>
            <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full border border-violet-300 dark:border-violet-500/40 text-violet-700 dark:text-violet-300 text-xs font-medium bg-white/60 dark:bg-violet-500/10">
              <Sparkles size={11} />
              RAG-powered — grounded in your research
            </span>
          </div>

          {/* CTA button */}
          <div className="shrink-0 hidden sm:block">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-500/30 text-gray-900 dark:text-white font-semibold text-sm shadow-sm group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-600 dark:group-hover:bg-violet-600 transition-all duration-200 whitespace-nowrap">
              Ask CogniFlow
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </motion.div>
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Research Intelligence</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">Your living research command centre</p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('ResearchCouncil')}>
            <Button className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white border-0 gap-2 shadow-lg shadow-violet-500/20">
              <Users size={15} />
              Convene Council
            </Button>
          </Link>
          <Link to={createPageUrl('Projects')}>
            <Button variant="outline" className="border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 gap-2">
              <BookOpen size={15} />
              Projects
            </Button>
          </Link>
        </div>
      </div>

      {/* Active Project + Momentum Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Project Card */}
        {currentProject ? (
          <Card className="lg:col-span-2 bg-gradient-to-br from-violet-900/30 to-purple-900/20 border-violet-800/30">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 mb-3 text-xs">
                    Active Project
                  </Badge>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">{currentProject.title}</h2>
                  <p className="text-gray-500 dark:text-slate-400 mt-2 text-sm line-clamp-2">{currentProject.abstract}</p>

                  {/* Living Narrative */}
                  {(narrative || narrativeLoading) && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-violet-500/20"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles size={12} className="text-violet-400" />
                        <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Living Narrative</span>
                      </div>
                      {narrativeLoading ? (
                        <div className="space-y-1.5">
                          {[95, 80, 60].map((w, i) => (
                            <div key={i} className="h-2 rounded bg-gray-200 dark:bg-slate-700 animate-pulse" style={{ width: `${w}%` }} />
                          ))}
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed italic">"{narrative?.narrative}"</p>
                          {narrative?.research_direction && (
                            <p className="text-xs text-violet-400 mt-2 font-medium">→ {narrative.research_direction}</p>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}

                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                      <Target size={14} />
                      <span className="capitalize">{currentProject.stage?.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                      <Activity size={14} />
                      <span>{currentProject.progress || 0}% Complete</span>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <div className="text-4xl font-black text-white">{overallHealth}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">Health Score</div>
                </div>
              </div>
              <Progress value={currentProject.progress || 0} className="mt-4 h-1.5" />
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-2 bg-white/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 border-dashed">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center py-12">
              <BookOpen size={36} className="text-slate-700 mb-3" />
              <h3 className="font-semibold text-gray-500 dark:text-slate-400">No active project</h3>
              <p className="text-sm text-gray-400 dark:text-slate-500 mt-1 mb-4">Create a project to unlock all features</p>
              <Link to={createPageUrl('Projects')}>
                <Button size="sm" variant="outline" className="border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800">
                  Create Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Momentum Card */}
        <Card className="bg-white/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap size={15} className="text-amber-400" />
              Research Momentum
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-5">
            {momentum ? (
              <>
                <MomentumGauge
                  score={momentum.score}
                  label={momentum.label}
                  streak={momentum.streak_days}
                />
                {/* Breakthrough proximity */}
                <div className="w-full space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500">
                    <span>Breakthrough proximity</span>
                    <span className="text-violet-400">{momentum.breakthrough_proximity}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${momentum.breakthrough_proximity}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full"
                    />
                  </div>
                </div>
                {/* Insights */}
                <div className="w-full space-y-1.5">
                  {(momentum.insights || []).map((insight, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-400">
                      <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
                {momentum.next_milestone && (
                  <div className="w-full p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                    <span className="text-amber-400 font-medium">Next: </span>
                    <span className="text-gray-700 dark:text-slate-300">{momentum.next_milestone}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6">
                <div className="w-16 h-16 rounded-full border-4 border-gray-200 dark:border-slate-700 border-t-amber-500 animate-spin" />
                <p className="text-xs text-gray-400 dark:text-slate-500">Calculating momentum…</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Health Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Originality', value: healthMetrics.originality, icon: Sparkles, color: 'violet' },
          { label: 'Rigor',       value: healthMetrics.rigor,       icon: CheckCircle, color: 'blue' },
          { label: 'Coherence',   value: healthMetrics.coherence,   icon: Brain,       color: 'emerald' },
          { label: 'Citation Trust', value: healthMetrics.citation_trust, icon: FileText, color: 'amber' },
        ].map(({ label, value, icon: Icon, color }) => (
          <HealthMetricCard key={label} label={label} value={value} icon={Icon} color={color} />
        ))}
      </div>

      {/* Serendipity + Quick Actions Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Serendipity Engine */}
        <Card className="bg-white/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Shuffle size={16} className="text-violet-400" />
                Serendipity Engine
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white"
                onClick={() => refetchSerendipity()}
                disabled={serendipityLoading}
              >
                <RefreshCw size={13} className={serendipityLoading ? 'animate-spin' : ''} />
              </Button>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Unexpected cross-disciplinary connections to your research</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {!currentProject ? (
              <div className="text-center py-6 text-gray-400 dark:text-slate-500 text-xs">
                Create a project to unlock serendipitous insights
              </div>
            ) : serendipityLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-gray-100/70 dark:bg-slate-800/70 animate-pulse" />
                ))}
              </div>
            ) : serendipity?.connections ? (
              <>
                {serendipity.connections.slice(0, 4).map((conn, i) => (
                  <SerendipityCard key={i} connection={conn} index={i} />
                ))}
                {serendipity.meta_insight && (
                  <div className="flex gap-2 p-3 rounded-xl bg-violet-500/8 border border-violet-500/20 mt-2">
                    <Quote size={12} className="text-violet-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-700 dark:text-slate-300 italic leading-relaxed">{serendipity.meta_insight}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-gray-400 dark:text-slate-500 text-xs">No serendipitous connections yet</div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions + Gaps */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="bg-white/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb size={16} className="text-emerald-400" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to={createPageUrl('ResearchCouncil')}>
                <ActionCard title="Convene the Council" description="4 AI experts debate your research" icon={Users} color="violet" />
              </Link>
              <Link to={createPageUrl('KnowledgeGraph')}>
                <ActionCard title="Knowledge Constellation" description="Explore your research as a living graph" icon={Network} color="indigo" />
              </Link>
              <Link to={createPageUrl('GapAnalyzer')}>
                <ActionCard title="Analyze Literature Gaps" description="Identify unexplored areas in your field" icon={Target} color="amber" />
              </Link>
              <Link to={createPageUrl('VivaSimulator')}>
                <ActionCard title="Practice Viva Defense" description="Face the AI examiner panel" icon={AlertTriangle} color="rose" />
              </Link>
            </CardContent>
          </Card>

          {/* Research Gaps */}
          {gaps.length > 0 && (
            <Card className="bg-white/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-400" />
                  Critical Gaps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {gaps.slice(0, 3).map((gap) => (
                  <div key={gap.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800">
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-1.5 shrink-0',
                      gap.significance === 'critical' ? 'bg-red-400' :
                      gap.significance === 'high'     ? 'bg-amber-400' : 'bg-slate-400',
                    )} />
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-1">{gap.title}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 capitalize">{gap.gap_type}</p>
                    </div>
                  </div>
                ))}
                <Link to={createPageUrl('GapAnalyzer')}>
                  <Button variant="ghost" size="sm" className="w-full text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white text-xs mt-1">
                    View all gaps <ArrowRight size={12} className="ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* System Intelligence: Retrieval Metrics + Global Saliency */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Retrieval Performance */}
        <Card className="bg-white/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-violet-400" />
              Retrieval Performance
            </CardTitle>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Dense RAG vs. lexical baselines (K=5, academic corpus)</p>
          </CardHeader>
          <CardContent className="p-0 pb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800">
                  <th className="px-4 py-2 text-left text-gray-400 dark:text-slate-500 font-medium">Model</th>
                  <th className="px-3 py-2 text-center text-gray-400 dark:text-slate-500 font-medium">P@5</th>
                  <th className="px-3 py-2 text-center text-gray-400 dark:text-slate-500 font-medium">R@5</th>
                  <th className="px-3 py-2 text-center text-gray-400 dark:text-slate-500 font-medium">MRR</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'TF-IDF + Cosine', p: '0.62', r: '0.58', mrr: '0.66', top: false },
                  { name: 'DPR',             p: '0.76', r: '0.73', mrr: '0.79', top: false },
                  { name: 'SBERT Dense',     p: '0.81', r: '0.78', mrr: '0.84', top: false },
                  { name: 'CogniFlow (RAG)', p: '0.86', r: '0.83', mrr: '0.89', top: true  },
                ].map((row) => (
                  <tr
                    key={row.name}
                    className={cn(
                      'border-b border-gray-50 dark:border-slate-800 last:border-0',
                      row.top ? 'bg-violet-50 dark:bg-violet-950/30 font-semibold' : '',
                    )}
                  >
                    <td className="px-4 py-2 text-gray-900 dark:text-white flex items-center gap-1.5">
                      {row.name}
                      {row.top && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-500 text-white font-normal leading-none">Best</span>
                      )}
                    </td>
                    <td className={cn('px-3 py-2 text-center', row.top ? 'text-violet-700 dark:text-violet-400' : 'text-gray-600 dark:text-slate-400')}>{row.p}</td>
                    <td className={cn('px-3 py-2 text-center', row.top ? 'text-violet-700 dark:text-violet-400' : 'text-gray-600 dark:text-slate-400')}>{row.r}</td>
                    <td className={cn('px-3 py-2 text-center', row.top ? 'text-violet-700 dark:text-violet-400' : 'text-gray-600 dark:text-slate-400')}>{row.mrr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Global Feature Saliency — Figure 2 from paper */}
        <Card className="bg-white/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity size={16} className="text-emerald-400" />
              Global Feature Saliency
            </CardTitle>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Mean section importance in relevance attribution (gradient-based)</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { section: 'Abstract',       weight: 0.42, color: 'from-violet-500 to-purple-600' },
              { section: 'Method',         weight: 0.31, color: 'from-violet-400 to-purple-500' },
              { section: 'Conclusion',     weight: 0.24, color: 'from-indigo-400 to-violet-500' },
              { section: 'Results',        weight: 0.18, color: 'from-blue-400 to-indigo-500' },
              { section: 'Introduction',   weight: 0.14, color: 'from-cyan-400 to-blue-500' },
              { section: 'Discussion',     weight: 0.12, color: 'from-teal-400 to-cyan-500' },
              { section: 'Related Work',   weight: 0.09, color: 'from-emerald-400 to-teal-500' },
              { section: 'Limitations',    weight: 0.07, color: 'from-slate-400 to-gray-500' },
              { section: 'Background',     weight: 0.05, color: 'from-gray-400 to-slate-500' },
              { section: 'Literature Review', weight: 0.04, color: 'from-gray-300 to-gray-400' },
            ].map((row) => (
              <div key={row.section} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-slate-400 w-28 shrink-0">{row.section}</span>
                <div className="flex-1 h-4 bg-gray-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(row.weight / 0.42) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.05 }}
                    className={`h-full bg-gradient-to-r ${row.color} rounded-sm`}
                  />
                </div>
                <span className="text-xs font-mono text-gray-500 dark:text-slate-400 w-8 text-right">{row.weight}</span>
              </div>
            ))}
            <p className="text-xs text-gray-400 dark:text-slate-500 pt-1 border-t border-gray-100 dark:border-slate-800">
              Abstract &amp; Method sections drive 73% of attribution weight
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-white/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock size={16} className="text-gray-500 dark:text-slate-400" />
              Research Timeline
            </CardTitle>
            <Link to={createPageUrl('Memory')}>
              <Button variant="ghost" size="sm" className="text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white text-xs gap-1">
                View all <ArrowRight size={12} />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 && conversations.length === 0 && gaps.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-slate-500">
              <Clock size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Your research journey starts here</p>
            </div>
          ) : (
            <div className="space-y-0">
              {[
                ...documents.slice(0, 2).map((d) => ({ event: `Updated: ${d.title}`, time: d.updated_date, type: 'writing' })),
                ...gaps.slice(0, 2).map((g)     => ({ event: `Gap found: ${g.title}`, time: g.created_date, type: 'analysis' })),
                ...conversations.slice(0, 1).map((c) => ({ event: `Chat: ${c.title}`, time: c.updated_date, type: 'milestone' })),
              ]
                .sort((a, b) => new Date(b.time) - new Date(a.time))
                .slice(0, 6)
                .map((item, idx, arr) => (
                  <TimelineItem key={idx} {...item} isLast={idx === arr.length - 1} />
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function HealthMetricCard({ label, value, icon: Icon, color }) {
  const styles = {
    violet: { bg: 'from-violet-500/15 to-purple-500/10 border-violet-500/25', text: 'text-violet-400', bar: 'from-violet-500 to-purple-500' },
    blue:   { bg: 'from-blue-500/15 to-cyan-500/10 border-blue-500/25',       text: 'text-blue-400',   bar: 'from-blue-500 to-cyan-500' },
    emerald:{ bg: 'from-emerald-500/15 to-teal-500/10 border-emerald-500/25', text: 'text-emerald-400',bar: 'from-emerald-500 to-teal-500' },
    amber:  { bg: 'from-amber-500/15 to-orange-500/10 border-amber-500/25',   text: 'text-amber-400',  bar: 'from-amber-500 to-orange-500' },
    indigo: { bg: 'from-indigo-500/15 to-blue-500/10 border-indigo-500/25',   text: 'text-indigo-400', bar: 'from-indigo-500 to-blue-500' },
  };
  const s = styles[color] || styles.violet;

  return (
    <Card className={`bg-gradient-to-br ${s.bg} border`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Icon size={17} className={s.text} />
          <span className="text-2xl font-black text-gray-900 dark:text-white">
            <AnimatedNumber value={value} />
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">{label}</p>
        <div className="h-1 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full bg-gradient-to-r ${s.bar} rounded-full`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ActionCard({ title, description, icon: Icon, color }) {
  const styles = {
    violet: { hover: 'hover:bg-violet-500/10 hover:border-violet-500/30', icon: 'text-violet-400' },
    indigo: { hover: 'hover:bg-indigo-500/10 hover:border-indigo-500/30', icon: 'text-indigo-400' },
    blue:   { hover: 'hover:bg-blue-500/10 hover:border-blue-500/30',     icon: 'text-blue-400' },
    amber:  { hover: 'hover:bg-amber-500/10 hover:border-amber-500/30',   icon: 'text-amber-400' },
    rose:   { hover: 'hover:bg-rose-500/10 hover:border-rose-500/30',     icon: 'text-rose-400' },
    emerald:{ hover: 'hover:bg-emerald-500/10 hover:border-emerald-500/30',icon: 'text-emerald-400' },
  };
  const s = styles[color] || styles.violet;

  return (
    <div className={`group flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 transition-all cursor-pointer ${s.hover}`}>
      <div className={`p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 ${s.icon}`}>
        <Icon size={17} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500">{description}</p>
      </div>
      <ArrowRight size={15} className="text-gray-400 dark:text-slate-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors shrink-0" />
    </div>
  );
}

function TimelineItem({ time, event, type, isLast }) {
  const dots = { writing: 'bg-blue-500', analysis: 'bg-amber-500', milestone: 'bg-emerald-500' };
  return (
    <div className="flex items-start gap-3 group">
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full mt-1 ${dots[type] || 'bg-slate-500'} ring-2 ring-slate-950`} />
        {!isLast && <div className="w-px flex-1 bg-gray-100 mt-1 mb-0" style={{ minHeight: 24 }} />}
      </div>
      <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
        <p className="text-sm text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{event}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{new Date(time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
      </div>
    </div>
  );
}

