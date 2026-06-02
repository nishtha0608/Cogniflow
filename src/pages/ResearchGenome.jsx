import React, { useRef, useEffect } from 'react';
import { cogniflow } from '@/api/cogniflowClient';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Dna, Zap, AlertCircle, TrendingUp, Star, Eye, BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TRAIT_META = {
  empiricism: { label: 'Empiricism',  color: '#3b82f6', desc: 'Evidence-first thinking, data-driven instinct' },
  theorism:   { label: 'Theory',      color: '#8b5cf6', desc: 'Framework-building, conceptual depth' },
  criticality:{ label: 'Criticality', color: '#f59e0b', desc: 'Gap-hunting, assumption-challenging' },
  breadth:    { label: 'Breadth',     color: '#10b981', desc: 'Cross-project synthesis, disciplinary range' },
  momentum:   { label: 'Momentum',    color: '#f43f5e', desc: 'Activity rate, research velocity' },
};

const ARCHETYPE_COLORS = {
  'The Pioneer':          { from: '#3b82f6', to: '#6366f1' },
  'The Theorist':         { from: '#8b5cf6', to: '#a855f7' },
  'The Critic':           { from: '#f59e0b', to: '#f97316' },
  'The Polymath':         { from: '#10b981', to: '#06b6d4' },
  'The Builder':          { from: '#f43f5e', to: '#ec4899' },
  'The Explorer':         { from: '#06b6d4', to: '#3b82f6' },
  'The Emerging Scholar': { from: '#64748b', to: '#94a3b8' },
};

function RadarChart({ traits }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const maxR = Math.min(cx, cy) - 20;
    const keys = Object.keys(TRAIT_META);
    const n = keys.length;
    const angleStep = (2 * Math.PI) / n;
    const startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, W, H);

    // Grid rings
    for (let ring = 1; ring <= 4; ring++) {
      const r = (ring / 4) * maxR;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Axis lines
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle));
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Data polygon — filled
    ctx.beginPath();
    keys.forEach((key, i) => {
      const val = (traits[key] || 0) / 100;
      const angle = startAngle + i * angleStep;
      const x = cx + maxR * val * Math.cos(angle);
      const y = cy + maxR * val * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    grad.addColorStop(0, 'rgba(139,92,246,0.35)');
    grad.addColorStop(1, 'rgba(59,130,246,0.12)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(139,92,246,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dots + labels
    keys.forEach((key, i) => {
      const val = (traits[key] || 0) / 100;
      const angle = startAngle + i * angleStep;
      const x = cx + maxR * val * Math.cos(angle);
      const y = cy + maxR * val * Math.sin(angle);
      const meta = TRAIT_META[key];

      // Dot
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = meta.color;
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      const labelR = maxR + 22;
      const lx = cx + labelR * Math.cos(angle);
      const ly = cy + labelR * Math.sin(angle);
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = meta.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(meta.label, lx, ly);

      // Score
      ctx.font = '10px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(traits[key] || 0, lx, ly + 13);
    });
  }, [traits]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      className="w-full max-w-[300px]"
    />
  );
}

function TraitBar({ label, value, color, desc }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-white">{label}</span>
          <span className="text-xs text-slate-500 ml-2">{desc}</span>
        </div>
        <span className="text-sm font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

export default function ResearchGenome() {
  const { data: genome, isLoading, error } = useQuery({
    queryKey: ['genome'],
    queryFn: () => cogniflow.ai.genome(),
    staleTime: 5 * 60_000,
  });

  const archetypeColor = genome?.archetype
    ? ARCHETYPE_COLORS[genome.archetype] || ARCHETYPE_COLORS['The Emerging Scholar']
    : { from: '#64748b', to: '#94a3b8' };

  const blindSpots = genome?.blind_spots?.filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Dna size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Research Genome</h1>
            <p className="text-sm text-slate-500">Your unique research DNA — derived from everything you've built here</p>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent mx-auto"
              />
              <p className="text-sm text-slate-500">Sequencing your research DNA…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-center gap-3">
            <AlertCircle size={16} className="text-rose-400" />
            <p className="text-sm text-rose-400">Failed to load genome data</p>
          </div>
        )}

        {genome && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: Radar + Archetype */}
            <div className="space-y-4">
              {/* Archetype card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-5 border border-white/5 overflow-hidden relative"
                style={{ background: `linear-gradient(135deg, ${archetypeColor.from}18, ${archetypeColor.to}08)` }}
              >
                <div
                  className="absolute inset-0 opacity-10 blur-2xl"
                  style={{ background: `radial-gradient(circle at 30% 50%, ${archetypeColor.from}, transparent 70%)` }}
                />
                <div className="relative space-y-3">
                  <div className="flex items-center gap-2">
                    <Star size={14} style={{ color: archetypeColor.from }} />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Your Archetype</span>
                  </div>
                  <h2
                    className="text-3xl font-black tracking-tight"
                    style={{ background: `linear-gradient(135deg, ${archetypeColor.from}, ${archetypeColor.to})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >
                    {genome.archetype}
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed">{genome.archetype_description}</p>
                  <div className="pt-1">
                    <span className="text-xs text-slate-600">Dominant trait: </span>
                    <span className="text-xs font-semibold" style={{ color: TRAIT_META[genome.dominant_trait]?.color }}>
                      {TRAIT_META[genome.dominant_trait]?.label}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">{genome.dominant_description}</p>
                  </div>
                </div>
              </motion.div>

              {/* Radar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl bg-slate-900/60 border border-white/5 p-5 flex flex-col items-center"
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Research DNA Radar</p>
                <RadarChart traits={genome.traits} />
              </motion.div>
            </div>

            {/* Right: Trait bars + strengths + blind spots */}
            <div className="space-y-4">
              {/* Trait bars */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl bg-slate-900/60 border border-white/5 p-5 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <BarChart2 size={14} className="text-violet-400" />
                  <span className="text-sm font-semibold text-white">Trait Breakdown</span>
                </div>
                {Object.entries(TRAIT_META).map(([key, meta]) => (
                  <TraitBar
                    key={key}
                    label={meta.label}
                    value={genome.traits[key] || 0}
                    color={meta.color}
                    desc={meta.desc}
                  />
                ))}
              </motion.div>

              {/* Strengths */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl bg-slate-900/60 border border-white/5 p-5 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-400" />
                  <span className="text-sm font-semibold text-white">Observed Strengths</span>
                </div>
                <ul className="space-y-2">
                  {(genome.strengths || []).map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span className="text-sm text-slate-400">{s}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Blind spots */}
              {blindSpots.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl bg-amber-500/5 border border-amber-500/15 p-5 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <Eye size={14} className="text-amber-400" />
                    <span className="text-sm font-semibold text-amber-400">Blind Spots to Address</span>
                  </div>
                  <ul className="space-y-2">
                    {blindSpots.map((b, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        <span className="text-sm text-slate-400">{b}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Research events counter */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="rounded-xl bg-slate-800/40 border border-slate-700/30 px-4 py-3 flex items-center justify-between"
              >
                <span className="text-xs text-slate-500">Total research events analysed</span>
                <span className="text-lg font-black text-white">{genome.total_research_events}</span>
              </motion.div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {genome && genome.total_research_events <= 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl bg-violet-500/5 border border-violet-500/15 p-6 text-center space-y-3"
          >
            <Dna size={32} className="text-violet-400 mx-auto" />
            <h3 className="text-sm font-semibold text-white">Your genome is forming</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Upload documents, identify research gaps, and start Research Council sessions —
              each action adds DNA to your profile.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
