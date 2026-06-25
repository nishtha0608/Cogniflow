import React, { useState } from 'react';
import { cogniflow } from '@/api/cogniflowClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords, Shield, Zap, Loader2, ChevronRight, Scale, Trophy,
  AlertTriangle, Sparkles, RotateCcw, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EXAMPLE_HYPOTHESES = [
  'Increased AI usage in education reduces critical thinking skills',
  'Remote work permanently increases knowledge worker productivity',
  'Large language models can replace human peer review in academic publishing',
  'Social media platforms are net-negative for democratic discourse',
];

const AGENT_STYLES = {
  proponent: {
    name: 'Dr. Advocate',
    label: 'Proponent',
    icon: Shield,
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20',
  },
  challenger: {
    name: 'Dr. Contradict',
    label: 'Challenger',
    icon: Swords,
    gradient: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    text: 'text-rose-400',
    badgeBg: 'bg-rose-500/20',
  },
};

function ExchangeCard({ exchange, index }) {
  const style = AGENT_STYLES[exchange.agent];
  const Icon = style.icon;
  const isProponent = exchange.agent === 'proponent';

  return (
    <motion.div
      initial={{ opacity: 0, x: isProponent ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', bounce: 0.3 }}
      className={cn(
        'rounded-2xl border p-4 space-y-3 max-w-[92%]',
        style.bg, style.border,
        isProponent ? 'mr-auto' : 'ml-auto',
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn('w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center', style.gradient)}>
          <Icon size={13} className="text-white" />
        </div>
        <span className={cn('text-xs font-bold', style.text)}>{style.name}</span>
        <span className="text-xs text-gray-400">Round {exchange.round}</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{exchange.argument}</p>
      <div className={cn('rounded-lg px-3 py-2 border', style.bg, style.border)}>
        <p className="text-xs text-gray-400 mb-0.5 font-medium">Key claim</p>
        <p className={cn('text-xs font-semibold', style.text)}>{exchange.key_claim}</p>
      </div>
    </motion.div>
  );
}

function RoundDivider({ round }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Round {round}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

export default function AgentDebate() {
  const [hypothesis, setHypothesis] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saveConversationMutation = useMutation({
    mutationFn: (data) => cogniflow.entities.Conversation.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const runDebate = async () => {
    if (!hypothesis.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await cogniflow.ai.debate({ hypothesis, rounds: 3 });
      setResult(data);

      // Save to memory
      const title = (data.hypothesis || hypothesis).slice(0, 60);
      const convData = {
        title: title + ((data.hypothesis || hypothesis).length > 60 ? '…' : ''),
        type: 'debate',
        messages: (data.exchanges || []).map(ex => ({
          role: ex.agent === 'proponent' ? 'user' : 'assistant',
          content: ex.argument || '',
          timestamp: new Date().toISOString(),
        })),
        context: { verdict: data.verdict || '', strongest_argument: data.strongest_argument || '' },
      };
      if (user) saveConversationMutation.mutate(convData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const groupedByRound = result?.exchanges?.reduce((acc, ex) => {
    if (!acc[ex.round]) acc[ex.round] = [];
    acc[ex.round].push(ex);
    return acc;
  }, {}) || {};

  return (
    <div className="min-h-screen bg-violet-50 p-6 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Swords size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Debate Chamber</h1>
              <p className="text-sm text-gray-400">Two AI agents argue opposing sides of your hypothesis across 3 live rounds</p>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Shield size={11} className="text-white" />
              </div>
              <span className="text-xs text-gray-500">Dr. Advocate defends</span>
            </div>
            <Swords size={12} className="text-gray-400" />
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                <Swords size={11} className="text-white" />
              </div>
              <span className="text-xs text-gray-500">Dr. Contradict challenges</span>
            </div>
          </div>
        </div>

        {/* Input */}
        {!result && (
          <div className="rounded-2xl bg-white/80 border border-gray-200 p-5 space-y-4">
            <label className="text-sm font-medium text-gray-500">Your hypothesis</label>
            <textarea
              value={hypothesis}
              onChange={e => setHypothesis(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runDebate(); }}
              placeholder="Enter a bold research claim — the two agents will fight over it…"
              className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-slate-500 resize-none focus:outline-none focus:border-rose-500/40 transition-colors"
              rows={3}
            />

            <div className="flex flex-wrap gap-2">
              {EXAMPLE_HYPOTHESES.map(h => (
                <button
                  key={h}
                  onClick={() => setHypothesis(h)}
                  className="text-xs px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors"
                >
                  {h.slice(0, 52)}…
                </button>
              ))}
            </div>

            <button
              onClick={runDebate}
              disabled={!hypothesis.trim() || loading}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
                hypothesis.trim() && !loading
                  ? 'bg-gradient-to-r from-rose-500 to-orange-600 text-white hover:opacity-90 shadow-lg shadow-rose-500/20'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Swords size={15} />}
              {loading ? 'Agents debating…' : 'Start the Debate'}
            </button>
          </div>
        )}

        {/* Loading state */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
                  className={cn(
                    'h-20 rounded-2xl border',
                    i % 2 === 0 ? 'bg-emerald-500/5 border-emerald-500/10 mr-[8%]' : 'bg-rose-500/5 border-rose-500/10 ml-[8%]'
                  )}
                />
              ))}
              <p className="text-center text-xs text-gray-400 animate-pulse">Agents are formulating their arguments…</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Debate exchanges */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  Debate: <span className="text-rose-400">{result.hypothesis}</span>
                </h2>
                <button
                  onClick={() => { setResult(null); setHypothesis(''); }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <RotateCcw size={12} />
                  New debate
                </button>
              </div>

              {Object.entries(groupedByRound).map(([round, exchanges]) => (
                <div key={round} className="space-y-3">
                  <RoundDivider round={round} />
                  {exchanges.map((ex, i) => (
                    <ExchangeCard key={`${round}-${i}`} exchange={ex} index={i} />
                  ))}
                </div>
              ))}

              {/* Verdict */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-amber-500/20 p-5 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Scale size={16} className="text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">Judge's Verdict</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{result.verdict}</p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Trophy size={12} className="text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-400">Strongest argument</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{result.strongest_argument}</p>
                  </div>
                  <div className="rounded-xl bg-rose-500/5 border border-rose-500/15 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={12} className="text-rose-400" />
                      <span className="text-xs font-semibold text-rose-400">Weakest link</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{result.weakest_link}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
