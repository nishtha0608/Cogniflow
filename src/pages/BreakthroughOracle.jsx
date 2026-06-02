import React, { useState } from 'react';
import { cogniflow } from '@/api/cogniflowClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Loader2, ArrowUpRight, Lightbulb, Puzzle, Rocket,
  TrendingUp, TrendingDown, RefreshCw, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EXAMPLE_HYPOTHESES = [
  'Retrieval-augmented generation can match domain expert accuracy in medical diagnosis',
  'Sleep deprivation affects creative problem-solving more than analytical tasks',
  'Urban green spaces reduce chronic stress markers independent of socioeconomic status',
  'Peer learning in distributed teams outperforms instructor-led training for complex skills',
];

function ScoreArc({ score }) {
  const color = score >= 70 ? '#f43f5e' : score >= 50 ? '#f59e0b' : '#3b82f6';
  const label =
    score >= 80 ? 'Transformative' :
    score >= 65 ? 'High Potential' :
    score >= 50 ? 'Promising' :
    score >= 35 ? 'Incremental' : 'Exploratory';

  const r = 54;
  const circ = 2 * Math.PI * r;
  const half = circ / 2;
  const dashValue = (score / 100) * half;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="80" viewBox="0 0 140 80">
        {/* Track arc (bottom half of a circle placed at top) */}
        <path
          d={`M ${70 - r} 70 A ${r} ${r} 0 0 1 ${70 + r} 70`}
          fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round"
        />
        <motion.path
          d={`M ${70 - r} 70 A ${r} ${r} 0 0 1 ${70 + r} 70`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${half} ${half}`}
          initial={{ strokeDashoffset: half }}
          animate={{ strokeDashoffset: half - dashValue }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
        <text x="70" y="62" textAnchor="middle" fill="white" fontSize="26" fontWeight="900">{score}</text>
        <text x="70" y="76" textAnchor="middle" fill={color} fontSize="9" fontWeight="700">{label.toUpperCase()}</text>
      </svg>
      <span className="text-xs text-slate-500">Breakthrough probability</span>
    </div>
  );
}

function FactorRow({ factor }) {
  const positive = factor.score_contribution >= 0;
  return (
    <div className={cn(
      'flex items-start gap-3 rounded-xl p-3 border',
      positive ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-rose-500/5 border-rose-500/15'
    )}>
      {positive
        ? <TrendingUp size={14} className="text-emerald-400 mt-0.5 shrink-0" />
        : <TrendingDown size={14} className="text-rose-400 mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-white truncate">{factor.factor}</span>
          <span className={cn(
            'text-xs font-bold shrink-0',
            positive ? 'text-emerald-400' : 'text-rose-400'
          )}>
            {positive ? '+' : ''}{factor.score_contribution}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{factor.impact}</p>
      </div>
    </div>
  );
}

export default function BreakthroughOracle() {
  const [hypothesis, setHypothesis] = useState('');
  const [researchArea, setResearchArea] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saveConversationMutation = useMutation({
    mutationFn: (data) => cogniflow.entities.Conversation.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const run = async () => {
    if (!hypothesis.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await cogniflow.ai.breakthrough({
        hypothesis,
        research_area: researchArea || undefined,
      });
      setResult(data);

      // Save to memory
      const convData = {
        title: hypothesis.slice(0, 60) + (hypothesis.length > 60 ? '…' : ''),
        type: 'breakthrough',
        messages: [
          { role: 'user', content: hypothesis, timestamp: new Date().toISOString() },
          { role: 'assistant', content: data.verdict || '', timestamp: new Date().toISOString() },
        ],
        context: { score: data.score },
      };
      if (researchArea) convData.context.research_area = researchArea;
      if (user) saveConversationMutation.mutate(convData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Flame size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Breakthrough Oracle</h1>
            <p className="text-sm text-slate-500">Scores your hypothesis on breakthrough probability and maps the path to impact</p>
          </div>
        </div>

        {/* Input */}
        <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Your hypothesis or research claim</label>
            <textarea
              value={hypothesis}
              onChange={e => setHypothesis(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run(); }}
              placeholder="State your hypothesis as clearly and boldly as you can…"
              className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-orange-500/40 transition-colors"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Research area (optional)</label>
            <input
              value={researchArea}
              onChange={e => setResearchArea(e.target.value)}
              placeholder="e.g. Cognitive Psychology, Machine Learning, Climate Science…"
              className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {EXAMPLE_HYPOTHESES.map(h => (
              <button
                key={h}
                onClick={() => setHypothesis(h)}
                className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/40 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
              >
                {h.slice(0, 52)}…
              </button>
            ))}
          </div>

          <button
            onClick={run}
            disabled={!hypothesis.trim() || loading}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
              hypothesis.trim() && !loading
                ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white hover:opacity-90 shadow-lg shadow-orange-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            )}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Flame size={15} />}
            {loading ? 'Oracle consulting…' : 'Consult the Oracle'}
          </button>
        </div>

        {/* Results */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Score + verdict */}
              <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-6 flex flex-col sm:flex-row items-center gap-6">
                <ScoreArc score={result.score} />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-white">Verdict</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{result.verdict}</p>
                  <button
                    onClick={() => { setResult(null); setHypothesis(''); setResearchArea(''); }}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mt-2"
                  >
                    <RefreshCw size={11} />
                    Try another hypothesis
                  </button>
                </div>
              </div>

              {/* Factors */}
              {result.factors?.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="rounded-2xl bg-slate-900/60 border border-white/5 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-slate-400" />
                    <span className="text-sm font-semibold text-white">Scoring factors</span>
                  </div>
                  <div className="space-y-2">
                    {result.factors.map((f, i) => <FactorRow key={i} factor={f} />)}
                  </div>
                </motion.div>
              )}

              {/* Missing ingredients */}
              {result.missing_ingredients?.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="rounded-2xl bg-amber-500/5 border border-amber-500/15 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Puzzle size={14} className="text-amber-400" />
                    <span className="text-sm font-semibold text-amber-400">Missing ingredients</span>
                    <span className="text-xs text-slate-500 ml-1">— add these to raise your score</span>
                  </div>
                  <ul className="space-y-2">
                    {result.missing_ingredients.map((m, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <ChevronRight size={13} className="text-amber-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-300">{m}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Analogous breakthroughs */}
              {result.analogous_breakthroughs?.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="rounded-2xl bg-violet-500/5 border border-violet-500/15 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb size={14} className="text-violet-400" />
                    <span className="text-sm font-semibold text-violet-400">Analogous breakthroughs</span>
                    <span className="text-xs text-slate-500 ml-1">— from other fields</span>
                  </div>
                  <div className="space-y-3">
                    {result.analogous_breakthroughs.map((b, i) => (
                      <div key={i} className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight size={13} className="text-violet-400" />
                          <span className="text-xs font-semibold text-violet-400">{b.field}</span>
                        </div>
                        <p className="text-sm font-medium text-white">{b.breakthrough}</p>
                        <p className="text-xs text-slate-400 leading-relaxed">{b.lesson}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Unlock actions */}
              {result.unlock_actions?.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="rounded-2xl bg-emerald-500/5 border border-emerald-500/15 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Rocket size={14} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">Unlock actions</span>
                    <span className="text-xs text-slate-500 ml-1">— move the needle now</span>
                  </div>
                  <ol className="space-y-2">
                    {result.unlock_actions.map((a, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-300">{a}</span>
                      </li>
                    ))}
                  </ol>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
