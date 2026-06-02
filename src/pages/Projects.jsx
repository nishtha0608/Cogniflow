import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useActiveProject } from '@/lib/ProjectContext';
import { cogniflow } from '@/api/cogniflowClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Target, Calendar, ChevronRight, Trash2, Edit3, Flame,
  X, Loader2, Sparkles, TrendingUp, AlertTriangle,
  Clock, Zap, Tag, FileText, Check,
  AlertCircle, BarChart2, Layers, ArrowLeft, MessageSquare,
  Search, PenTool, HelpCircle, Network, ListChecks, Info,
  ChevronDown, ChevronUp, ExternalLink, Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, isPast } from 'date-fns';

// ── Field config ──────────────────────────────────────────────────────────────

const FIELD_META = {
  computer_science: { label: 'Computer Science', color: '#06b6d4', from: 'from-cyan-500',    to: 'to-blue-600'    },
  medicine:         { label: 'Medicine',          color: '#f43f5e', from: 'from-rose-500',    to: 'to-pink-600'    },
  physics:          { label: 'Physics',            color: '#8b5cf6', from: 'from-violet-500',  to: 'to-purple-600'  },
  chemistry:        { label: 'Chemistry',          color: '#f97316', from: 'from-orange-500',  to: 'to-amber-600'   },
  biology:          { label: 'Biology',            color: '#10b981', from: 'from-emerald-500', to: 'to-teal-600'    },
  engineering:      { label: 'Engineering',        color: '#6366f1', from: 'from-indigo-500',  to: 'to-blue-600'    },
  social_sciences:  { label: 'Social Sciences',   color: '#14b8a6', from: 'from-teal-500',    to: 'to-cyan-600'    },
  humanities:       { label: 'Humanities',         color: '#d946ef', from: 'from-fuchsia-500', to: 'to-violet-600'  },
  economics:        { label: 'Economics',          color: '#f59e0b', from: 'from-amber-500',   to: 'to-yellow-600'  },
  law:              { label: 'Law',                color: '#94a3b8', from: 'from-slate-400',   to: 'to-slate-600'   },
  other:            { label: 'Other',              color: '#64748b', from: 'from-slate-500',   to: 'to-slate-700'   },
};

const RESEARCH_FIELDS = Object.keys(FIELD_META);

const STAGES = [
  { id: 'ideation',          name: 'Ideation',           progress: 10,  color: '#8b5cf6' },
  { id: 'literature_review', name: 'Literature Review',  progress: 25,  color: '#6366f1' },
  { id: 'methodology',       name: 'Methodology',        progress: 40,  color: '#3b82f6' },
  { id: 'data_collection',   name: 'Data Collection',    progress: 55,  color: '#06b6d4' },
  { id: 'analysis',          name: 'Analysis',           progress: 70,  color: '#10b981' },
  { id: 'writing',           name: 'Writing',            progress: 85,  color: '#f59e0b' },
  { id: 'revision',          name: 'Revision',           progress: 95,  color: '#f97316' },
  { id: 'submission',        name: 'Submission',         progress: 100, color: '#f43f5e' },
];

const HEALTH_COLORS = {
  'Critical':           '#ef4444',
  'At Risk':            '#f97316',
  'On Track':           '#f59e0b',
  'Thriving':           '#10b981',
  'Breakthrough Ready': '#8b5cf6',
};

const EMPTY_FORM = {
  title: '',
  abstract: '',
  field: 'computer_science',
  stage: 'ideation',
  target_journal: '',
  deadline: '',
  research_questions: '',
  keywords: '',
};

// ── Stage pipeline mini-bar ───────────────────────────────────────────────────

function StagePipeline({ currentStage, size = 'sm' }) {
  const idx = STAGES.findIndex(s => s.id === currentStage);
  return (
    <div className="flex items-center gap-0.5">
      {STAGES.map((s, i) => (
        <div
          key={s.id}
          className={cn(
            'flex-1 rounded-full transition-colors',
            size === 'lg' ? 'h-2' : 'h-1',
            i <= idx ? 'opacity-100' : 'opacity-20',
            i < idx ? 'bg-slate-500' : i === idx ? '' : 'bg-slate-700',
          )}
          style={i === idx ? { background: s.color } : undefined}
          title={s.name}
        />
      ))}
    </div>
  );
}

// ── Progress arc ─────────────────────────────────────────────────────────────

function ProgressRing({ value, color, size = 48 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (value / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={size > 60 ? 6 : 4} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={size > 60 ? 6 : 4} strokeLinecap="round"
        strokeDasharray={`${circ} ${circ}`}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - fill }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  );
}

// ── AI Insights panel (used in both card and detail view) ─────────────────────

function InsightsContent({ project }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['project-insights', project.id],
    queryFn: () => cogniflow.ai.projectInsights({
      project_id: project.id,
      title: project.title,
      stage: project.stage,
      field: project.field,
      abstract: project.abstract,
      keywords: project.keywords || [],
      research_questions: project.research_questions || [],
      target_journal: project.target_journal,
      deadline: project.deadline,
      progress: project.progress || 0,
    }),
    staleTime: 5 * 60_000,
  });

  const healthColor = data ? (HEALTH_COLORS[data.health_label] || '#f59e0b') : '#64748b';

  if (isLoading) return (
    <div className="flex items-center gap-2 text-slate-500 text-xs py-4">
      <Loader2 size={13} className="animate-spin" />
      Analysing project health…
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 text-rose-400 text-xs py-4">
      <AlertCircle size={13} />
      Failed to load insights
    </div>
  );

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Health score */}
      <div
        className="flex items-center gap-4 p-4 rounded-xl border"
        style={{ background: `${healthColor}10`, borderColor: `${healthColor}25` }}
      >
        <div className="relative flex items-center justify-center shrink-0">
          <ProgressRing value={data.health_score} color={healthColor} size={56} />
          <span className="absolute text-sm font-black" style={{ color: healthColor }}>
            {data.health_score}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold" style={{ color: healthColor }}>{data.health_label}</span>
          <p className="text-xs text-slate-400 leading-relaxed mt-1">{data.narrative}</p>
          {data.predicted_contribution && (
            <p className="text-xs text-slate-500 mt-1 italic">{data.predicted_contribution}</p>
          )}
        </div>
      </div>

      {/* Next actions */}
      {data.next_actions?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Zap size={12} className="text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Next Actions</span>
          </div>
          <ol className="space-y-2">
            {data.next_actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-300 leading-relaxed">{a}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Risks */}
      {data.risks?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-rose-400" />
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-widest">Risks</span>
          </div>
          {data.risks.map((r, i) => {
            const sc = r.severity === 'high' ? '#ef4444' : r.severity === 'medium' ? '#f97316' : '#f59e0b';
            return (
              <div key={i} className="rounded-xl p-3 border border-rose-500/10 bg-rose-500/5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-semibold text-white">{r.risk}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color: sc, background: `${sc}18` }}>
                    {r.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{r.mitigation}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Velocity tip */}
      {data.velocity_tip && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-violet-500/8 border border-violet-500/15">
          <Sparkles size={13} className="text-violet-400 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-400 leading-relaxed">{data.velocity_tip}</p>
        </div>
      )}
    </div>
  );
}

// ── Card-level insights panel (collapsible) ────────────────────────────────────

function InsightsPanel({ project }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="border-t border-white/5 pt-4 mt-4">
        <InsightsContent project={project} />
      </div>
    </motion.div>
  );
}

// ── Project card ──────────────────────────────────────────────────────────────

function ProjectCard({ project, onEdit, onDelete, onOpen, onOpenWorkspace }) {
  const [showInsights, setShowInsights] = useState(false);
  const fieldMeta = FIELD_META[project.field] || FIELD_META.other;
  const stage = STAGES.find(s => s.id === project.stage);
  const progress = project.progress || stage?.progress || 0;

  const deadlineDays = project.deadline
    ? differenceInDays(new Date(project.deadline), new Date())
    : null;
  const deadlineOverdue = deadlineDays !== null && deadlineDays < 0;
  const deadlineUrgent = deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 14;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className="relative rounded-2xl bg-slate-900/60 border border-white/5 overflow-hidden group hover:border-white/10 transition-all duration-300 cursor-pointer"
      onClick={onOpen}
    >
      {/* Top accent bar */}
      <div className={`h-0.5 w-full bg-gradient-to-r ${fieldMeta.from} ${fieldMeta.to}`} />

      <div className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Progress ring */}
          <div className="relative flex items-center justify-center shrink-0 mt-0.5">
            <ProgressRing value={progress} color={fieldMeta.color} size={44} />
            <span className="absolute text-[9px] font-black text-white">{progress}%</span>
          </div>

          {/* Title + field */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ color: fieldMeta.color, background: `${fieldMeta.color}18`, border: `1px solid ${fieldMeta.color}30` }}
              >
                {fieldMeta.label}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">{project.title}</h3>
          </div>

          {/* Actions — stop propagation so clicks don't open detail */}
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-slate-200 transition-colors"
            >
              <Edit3 size={13} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Abstract */}
        {project.abstract && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{project.abstract}</p>
        )}

        {/* Stage pipeline */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">{stage?.name || 'Ideation'}</span>
            <span className="text-xs font-semibold" style={{ color: stage?.color || '#8b5cf6' }}>
              Stage {(STAGES.findIndex(s => s.id === project.stage) + 1) || 1}/{STAGES.length}
            </span>
          </div>
          <StagePipeline currentStage={project.stage} />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          {project.deadline && (
            <div className={cn(
              'flex items-center gap-1 text-xs',
              deadlineOverdue ? 'text-rose-400' : deadlineUrgent ? 'text-amber-400' : 'text-slate-500'
            )}>
              <Calendar size={11} />
              {deadlineOverdue
                ? `${Math.abs(deadlineDays)}d overdue`
                : deadlineDays === 0
                ? 'Due today'
                : `${deadlineDays}d left`}
            </div>
          )}
          {project.target_journal && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <FileText size={11} />
              <span className="truncate max-w-[120px]">{project.target_journal}</span>
            </div>
          )}
          {project.research_questions?.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Layers size={11} />
              {project.research_questions.length} question{project.research_questions.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Keywords */}
        {project.keywords?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.keywords.slice(0, 4).map((kw, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/50 text-slate-400"
              >
                {kw}
              </span>
            ))}
            {project.keywords.length > 4 && (
              <span className="text-xs text-slate-600">+{project.keywords.length - 4}</span>
            )}
          </div>
        )}

        {/* Enter workspace button */}
        <div
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-500/10 to-purple-600/10 border border-violet-500/20 text-violet-400 group-hover:from-violet-500/20 group-hover:to-purple-600/20 group-hover:border-violet-500/40 group-hover:text-violet-300 transition-all"
          onClick={e => { e.stopPropagation(); onOpenWorkspace(); }}
        >
          <ChevronRight size={12} />
          Open Workspace
        </div>
      </div>
    </motion.div>
  );
}

// ── Project Detail View ───────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    id: 'chat',
    label: 'Research Chat',
    description: 'Ask questions about this project',
    icon: MessageSquare,
    page: 'ResearchChat',
    color: '#10b981',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'gaps',
    label: 'Gap Analyzer',
    description: 'Find research gaps in this area',
    icon: Search,
    page: 'GapAnalyzer',
    color: '#f59e0b',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'writing',
    label: 'Writing Studio',
    description: 'Draft sections for this paper',
    icon: PenTool,
    page: 'Writing',
    color: '#3b82f6',
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    id: 'viva',
    label: 'Viva Prep',
    description: 'Simulate defence questions',
    icon: HelpCircle,
    page: 'VivaSimulator',
    color: '#f43f5e',
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    id: 'graph',
    label: 'Knowledge Graph',
    description: 'Visualise connections',
    icon: Network,
    page: 'KnowledgeGraph',
    color: '#6366f1',
    gradient: 'from-indigo-500 to-blue-600',
  },
  {
    id: 'docs',
    label: 'Documents',
    description: 'Manage linked papers & files',
    icon: FileText,
    page: 'Documents',
    color: '#64748b',
    gradient: 'from-slate-500 to-slate-600',
  },
];

function DetailSection({ title, icon: Icon, color, children }) {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-white/5 overflow-hidden">
      <div
        className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/5"
        style={{ background: `${color}08` }}
      >
        <Icon size={14} style={{ color }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function RecommendedPapers({ keywords }) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (!keywords?.length) return;
    setLoading(true);
    const token = localStorage.getItem('cogniflow_token');
    const kw = keywords.slice(0, 5).join(',');
    fetch(`http://localhost:8000/api/papers/recommendations?keywords=${encodeURIComponent(kw)}&limit=6`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => setPapers(d.results || []))
      .catch(() => setPapers([]))
      .finally(() => setLoading(false));
  }, [keywords?.join(',')]);

  const copyDoi = (doi) => {
    navigator.clipboard.writeText(`https://doi.org/${doi}`);
    setCopied(doi);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!keywords?.length) return null;

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-slate-800/30">
        <div className="flex items-center gap-2.5">
          <Sparkles size={14} className="text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">Recommended Papers</span>
        </div>
        <Link to={createPageUrl('PaperSearch')} className="text-xs text-slate-500 hover:text-violet-400 flex items-center gap-1 transition-colors">
          Browse all <ExternalLink size={10} />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={16} className="animate-spin text-violet-400" />
        </div>
      ) : papers.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-6">No recommendations found</p>
      ) : (
        <div className="divide-y divide-white/5">
          {papers.map(paper => (
            <div key={paper.id} className="px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
              <p className="text-xs font-medium text-slate-200 leading-snug line-clamp-2 mb-1">{paper.title}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {paper.authors?.slice(0, 2).join(', ')}{paper.authors?.length > 2 ? ' et al.' : ''}
                {paper.year && <span className="text-slate-600">·</span>}
                {paper.year && <span>{paper.year}</span>}
                {paper.cited_by_count > 0 && <span className="text-slate-600">· {paper.cited_by_count.toLocaleString()} citations</span>}
                {paper.is_open_access && <span className="text-emerald-500 font-medium">Open Access</span>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {paper.doi && (
                  <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <ExternalLink size={10} /> DOI
                  </a>
                )}
                {paper.doi && (
                  <button onClick={() => copyDoi(paper.doi)}
                    className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors">
                    {copied === paper.doi ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    {copied === paper.doi ? 'Copied' : 'Copy DOI'}
                  </button>
                )}
                {paper.pdf_url && (
                  <a href={paper.pdf_url} target="_blank" rel="noreferrer"
                    className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1">
                    <FileText size={10} /> PDF
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectDetail({ project, onBack, onEdit, onDelete, onOpenWorkspace }) {
  const fieldMeta = FIELD_META[project.field] || FIELD_META.other;
  const stage = STAGES.find(s => s.id === project.stage);
  const stageIdx = STAGES.findIndex(s => s.id === project.stage);
  const progress = project.progress || stage?.progress || 0;

  const deadlineDays = project.deadline
    ? differenceInDays(new Date(project.deadline), new Date())
    : null;
  const deadlineOverdue = deadlineDays !== null && deadlineDays < 0;
  const deadlineUrgent = deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 14;

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-slate-950 p-6 md:p-8"
    >
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Breadcrumb + actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-medium group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Research Portfolio
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onOpenWorkspace('Dashboard')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-lg hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, ${fieldMeta.color}, ${fieldMeta.color}bb)`,
                boxShadow: `0 4px 20px ${fieldMeta.color}30`,
              }}
            >
              <Zap size={14} />
              Enter Workspace
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
            >
              <Edit3 size={13} />
              Edit
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/8 border border-rose-500/15 text-rose-500 hover:text-rose-400 text-xs font-semibold transition-colors"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>

        {/* Hero header */}
        <div
          className="relative rounded-2xl border border-white/5 overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${fieldMeta.color}12 0%, transparent 60%)` }}
        >
          <div className={`h-0.5 w-full bg-gradient-to-r ${fieldMeta.from} ${fieldMeta.to}`} />
          <div className="p-6 md:p-8">
            <div className="flex items-start gap-6 flex-wrap md:flex-nowrap">
              {/* Big progress ring */}
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing value={progress} color={fieldMeta.color} size={80} />
                <div className="absolute text-center">
                  <span className="block text-lg font-black text-white leading-none">{progress}%</span>
                  <span className="block text-[9px] text-slate-500 leading-none mt-0.5">done</span>
                </div>
              </div>

              {/* Title & meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                    style={{ color: fieldMeta.color, background: `${fieldMeta.color}18`, border: `1px solid ${fieldMeta.color}30` }}
                  >
                    {fieldMeta.label}
                  </span>
                  {stage && (
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full font-semibold border"
                      style={{ color: stage.color, background: `${stage.color}15`, borderColor: `${stage.color}30` }}
                    >
                      {stage.name}
                    </span>
                  )}
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-white leading-snug mb-3">{project.title}</h1>

                {/* Stage pipeline — full width */}
                <div className="space-y-2 max-w-lg">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Stage {stageIdx + 1} of {STAGES.length}</span>
                    <span style={{ color: stage?.color }}>{stage?.name}</span>
                  </div>
                  <StagePipeline currentStage={project.stage} size="lg" />
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{STAGES[0].name}</span>
                    <span>{STAGES[STAGES.length - 1].name}</span>
                  </div>
                </div>
              </div>

              {/* Right meta chips */}
              <div className="flex flex-col gap-2 shrink-0">
                {project.deadline && (
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold',
                    deadlineOverdue
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      : deadlineUrgent
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      : 'bg-slate-800/60 border-slate-700/30 text-slate-400'
                  )}>
                    <Calendar size={13} />
                    {deadlineOverdue
                      ? `${Math.abs(deadlineDays)}d overdue`
                      : deadlineDays === 0
                      ? 'Due today'
                      : `${deadlineDays}d left`}
                    <span className="text-slate-600 font-normal">
                      {format(new Date(project.deadline), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                {project.target_journal && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-xs text-slate-400">
                    <FileText size={13} />
                    <span className="font-semibold">{project.target_journal}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Two-column body */}
        <div className="grid lg:grid-cols-5 gap-6">

          {/* LEFT: project info */}
          <div className="lg:col-span-3 space-y-5">

            {/* Abstract */}
            {project.abstract && (
              <DetailSection title="Abstract" icon={Info} color={fieldMeta.color}>
                <p className="text-sm text-slate-300 leading-relaxed">{project.abstract}</p>
              </DetailSection>
            )}

            {/* Research Questions */}
            {project.research_questions?.length > 0 && (
              <DetailSection title="Research Questions" icon={ListChecks} color="#10b981">
                <ol className="space-y-3">
                  {project.research_questions.map((q, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-slate-300 leading-relaxed">{q}</span>
                    </li>
                  ))}
                </ol>
              </DetailSection>
            )}

            {/* Keywords */}
            {project.keywords?.length > 0 && (
              <DetailSection title="Keywords" icon={Tag} color="#06b6d4">
                <div className="flex flex-wrap gap-2">
                  {project.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="text-sm px-3 py-1 rounded-full bg-slate-800 border border-slate-700/50 text-slate-300"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </DetailSection>
            )}

            {/* Stage detail */}
            <DetailSection title="Research Pipeline" icon={BarChart2} color="#8b5cf6">
              <div className="space-y-3">
                {STAGES.map((s, i) => {
                  const done = i < stageIdx;
                  const active = i === stageIdx;
                  const future = i > stageIdx;
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                          done ? 'bg-slate-700 text-slate-400' : active ? 'text-white' : 'bg-slate-800/60 border border-slate-700/40 text-slate-600'
                        )}
                        style={active ? { background: s.color } : undefined}
                      >
                        {done ? <Check size={12} /> : i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            'text-sm font-medium',
                            done ? 'text-slate-500' : active ? 'text-white' : 'text-slate-600'
                          )}>
                            {s.name}
                          </span>
                          {active && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{ color: s.color, background: `${s.color}18` }}>
                              Current
                            </span>
                          )}
                        </div>
                        {active && (
                          <div className="mt-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: s.color }}
                              initial={{ width: 0 }}
                              animate={{ width: '60%' }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </DetailSection>
          </div>

          {/* RIGHT: AI + quick actions */}
          <div className="lg:col-span-2 space-y-5">

            {/* AI Insights */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/5 overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/5 bg-violet-500/8">
                <Sparkles size={14} className="text-violet-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">AI Analysis</span>
              </div>
              <div className="p-5">
                <InsightsContent project={project} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/5 overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/5 bg-slate-800/30">
                <Zap size={14} className="text-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">Quick Actions</span>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map(a => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.id}
                      onClick={() => onOpenWorkspace(a.page)}
                      className="flex flex-col gap-1.5 p-3 rounded-xl border border-white/5 hover:border-white/10 bg-slate-800/30 hover:bg-slate-800/60 transition-all group text-left"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: `${a.color}18`, border: `1px solid ${a.color}25` }}
                      >
                        <Icon size={13} style={{ color: a.color }} />
                      </div>
                      <span className="text-xs font-semibold text-white">{a.label}</span>
                      <span className="text-xs text-slate-500 leading-tight">{a.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paper Recommendations */}
            <RecommendedPapers keywords={project.keywords} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Create / Edit modal ───────────────────────────────────────────────────────

function ProjectModal({ open, onClose, editingProject, onSubmit, isLoading }) {
  const [form, setForm] = useState(EMPTY_FORM);

  React.useEffect(() => {
    if (editingProject) {
      setForm({
        title: editingProject.title || '',
        abstract: editingProject.abstract || '',
        field: editingProject.field || 'computer_science',
        stage: editingProject.stage || 'ideation',
        target_journal: editingProject.target_journal || '',
        deadline: editingProject.deadline || '',
        research_questions: (editingProject.research_questions || []).join('\n'),
        keywords: (editingProject.keywords || []).join(', '),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingProject, open]);

  const fieldMeta = FIELD_META[form.field] || FIELD_META.other;

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onSubmit({
      ...form,
      research_questions: form.research_questions.split('\n').filter(Boolean),
      keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
      progress: STAGES.find(s => s.id === form.stage)?.progress || 0,
    });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="w-full max-w-2xl bg-slate-900 border border-white/8 rounded-2xl overflow-hidden shadow-2xl"
        >
          <div className={`h-0.5 bg-gradient-to-r ${fieldMeta.from} ${fieldMeta.to}`} />

          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${fieldMeta.color}20`, border: `1px solid ${fieldMeta.color}30` }}
                >
                  <BookOpen size={15} style={{ color: fieldMeta.color }} />
                </div>
                <h2 className="text-base font-bold text-white">
                  {editingProject ? 'Edit Project' : 'New Research Project'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Your research title…"
                  className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/40 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Abstract</label>
                <textarea
                  value={form.abstract}
                  onChange={e => setForm({ ...form, abstract: e.target.value })}
                  placeholder="Brief description of your research…"
                  rows={3}
                  className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Field *</label>
                  <select
                    value={form.field}
                    onChange={e => setForm({ ...form, field: e.target.value })}
                    className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/40 transition-colors appearance-none cursor-pointer"
                  >
                    {RESEARCH_FIELDS.map(f => (
                      <option key={f} value={f}>{FIELD_META[f].label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Stage</label>
                  <select
                    value={form.stage}
                    onChange={e => setForm({ ...form, stage: e.target.value })}
                    className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/40 transition-colors appearance-none cursor-pointer"
                  >
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Target Journal</label>
                  <input
                    value={form.target_journal}
                    onChange={e => setForm({ ...form, target_journal: e.target.value })}
                    placeholder="Nature, Science…"
                    className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/40 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Deadline</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={e => setForm({ ...form, deadline: e.target.value })}
                    className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/40 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Research Questions <span className="text-slate-600 normal-case font-normal">(one per line)</span>
                </label>
                <textarea
                  value={form.research_questions}
                  onChange={e => setForm({ ...form, research_questions: e.target.value })}
                  placeholder={"What is the primary research question?\nWhat are the sub-questions?"}
                  rows={3}
                  className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Keywords <span className="text-slate-600 normal-case font-normal">(comma separated)</span>
                </label>
                <input
                  value={form.keywords}
                  onChange={e => setForm({ ...form, keywords: e.target.value })}
                  placeholder="machine learning, NLP, transformers…"
                  className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/40 transition-colors"
                />
              </div>

              <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-3 space-y-2">
                <span className="text-xs text-slate-500">Stage preview</span>
                <StagePipeline currentStage={form.stage} />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{STAGES.find(s => s.id === form.stage)?.name}</span>
                  <span className="text-xs font-bold" style={{ color: STAGES.find(s => s.id === form.stage)?.color }}>
                    {STAGES.find(s => s.id === form.stage)?.progress}% progress
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.title.trim() || isLoading}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  form.title.trim() && !isLoading
                    ? `bg-gradient-to-r ${fieldMeta.from} ${fieldMeta.to} text-white hover:opacity-90`
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                )}
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editingProject ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Projects() {
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [stageFilter, setStageFilter] = useState('all');
  const [fieldFilter, setFieldFilter] = useState('all');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { selectProject } = useActiveProject();

  const handleOpenWorkspace = (project, targetPage = 'Dashboard') => {
    selectProject(project.id);
    navigate(createPageUrl(targetPage));
  };

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => cogniflow.entities.ResearchProject.list('-updated_date', 50),
  });

  // Keep selectedProject in sync if the project was edited
  React.useEffect(() => {
    if (selectedProject && projects.length > 0) {
      const updated = projects.find(p => p.id === selectedProject.id);
      if (updated) setSelectedProject(updated);
    }
  }, [projects]);

  const createMutation = useMutation({
    mutationFn: (data) => cogniflow.entities.ResearchProject.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => cogniflow.entities.ResearchProject.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingProject(null);
      setShowModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => cogniflow.entities.ResearchProject.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSelectedProject(null);
    },
  });

  const handleSubmit = (data) => {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProject(null);
  };

  const stats = useMemo(() => {
    const total = projects.length;
    const avgProgress = total
      ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / total)
      : 0;
    const activeStages = ['data_collection', 'analysis', 'writing', 'revision'];
    const active = projects.filter(p => activeStages.includes(p.stage)).length;
    const withDeadline = projects.filter(p => p.deadline).length;
    const overdue = projects.filter(p => p.deadline && isPast(new Date(p.deadline))).length;
    return { total, avgProgress, active, withDeadline, overdue };
  }, [projects]);

  const filtered = useMemo(() => projects.filter(p => {
    if (stageFilter !== 'all' && p.stage !== stageFilter) return false;
    if (fieldFilter !== 'all' && p.field !== fieldFilter) return false;
    return true;
  }), [projects, stageFilter, fieldFilter]);

  const isMutating = createMutation.isPending || updateMutation.isPending;

  // ── Detail view ──
  if (selectedProject) {
    return (
      <>
        <AnimatePresence mode="wait">
          <ProjectDetail
            project={selectedProject}
            onBack={() => setSelectedProject(null)}
            onEdit={() => handleEdit(selectedProject)}
            onDelete={() => deleteMutation.mutate(selectedProject.id)}
            onOpenWorkspace={(page) => handleOpenWorkspace(selectedProject, page)}
          />
        </AnimatePresence>
        <ProjectModal
          open={showModal}
          onClose={handleCloseModal}
          editingProject={editingProject}
          onSubmit={handleSubmit}
          isLoading={isMutating}
        />
      </>
    );
  }

  // ── Grid view ──
  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Research Portfolio</h1>
              <p className="text-sm text-slate-500">Track, manage, and accelerate your research projects</p>
            </div>
          </div>
          <button
            onClick={() => { setEditingProject(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/20"
          >
            <Plus size={15} />
            New Project
          </button>
        </div>

        {/* Stats bar */}
        {projects.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Projects', value: stats.total,                                      icon: Layers,    color: '#8b5cf6' },
              { label: 'Active Research', value: stats.active,                                    icon: Flame,     color: '#f43f5e' },
              { label: 'Avg Progress',   value: `${stats.avgProgress}%`,                          icon: TrendingUp,color: '#10b981' },
              { label: stats.overdue ? 'Overdue' : 'With Deadline', value: stats.overdue || stats.withDeadline, icon: Clock, color: stats.overdue ? '#ef4444' : '#f59e0b' },
            ].map(s => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-slate-900/60 border border-white/5 px-4 py-3 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${s.color}18`, border: `1px solid ${s.color}25` }}>
                    <Icon size={14} style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-lg font-black text-white leading-none">{s.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Filters */}
        {projects.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-600 font-semibold uppercase tracking-widest pr-1">Stage</span>
              {[{ id: 'all', name: 'All' }, ...STAGES].map(s => (
                <button
                  key={s.id}
                  onClick={() => setStageFilter(s.id)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full border transition-all',
                    stageFilter === s.id
                      ? 'bg-violet-500/20 border-violet-500/40 text-violet-400'
                      : 'bg-slate-800/60 border-slate-700/40 text-slate-500 hover:text-slate-300'
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent mx-auto"
              />
              <p className="text-sm text-slate-500">Loading projects…</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && projects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-violet-500/5 border border-violet-500/15 p-10 text-center space-y-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/20">
              <BookOpen size={28} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Start your research portfolio</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Create your first project to track your research journey — stage by stage, from ideation to submission.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus size={15} />
              Create First Project
            </button>
          </motion.div>
        )}

        {/* No results */}
        {!isLoading && projects.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm">
            No projects match the current filters.{' '}
            <button onClick={() => { setStageFilter('all'); setFieldFilter('all'); }} className="text-violet-400 hover:text-violet-300">
              Clear filters
            </button>
          </div>
        )}

        {/* Grid */}
        {!isLoading && filtered.length > 0 && (
          <motion.div layout className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={() => setSelectedProject(project)}
                  onOpenWorkspace={() => handleOpenWorkspace(project)}
                  onEdit={() => handleEdit(project)}
                  onDelete={() => deleteMutation.mutate(project.id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <ProjectModal
        open={showModal}
        onClose={handleCloseModal}
        editingProject={editingProject}
        onSubmit={handleSubmit}
        isLoading={isMutating}
      />
    </div>
  );
}
