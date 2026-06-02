import React, { useState, useRef, useEffect } from 'react';
import { cogniflow } from '@/api/cogniflowClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useActiveProject } from '@/lib/ProjectContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Zap, Search, Brain, Layers, ChevronRight, Play, Loader2,
  CheckCircle2, CircleDot, FileText, ArrowRight, Sparkles, RefreshCw,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

const STEP_META = {
  plan:      { icon: Brain,    color: 'violet', label: 'Planning',    bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
  search:    { icon: Search,   color: 'blue',   label: 'Searching',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400'   },
  analyze:   { icon: Layers,   color: 'amber',  label: 'Analysing',   bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-400'  },
  synthesize:{ icon: Sparkles, color: 'emerald',label: 'Synthesising',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',text: 'text-emerald-400'},
  reflect:   { icon: Brain,    color: 'rose',   label: 'Reflecting',  bg: 'bg-rose-500/10',   border: 'border-rose-500/20',   text: 'text-rose-400'   },
};

const EXAMPLE_QUESTIONS = [
  'What are the most critical unresolved questions in machine learning fairness?',
  'How does cognitive load theory apply to online learning environments?',
  'What methodological gaps exist in climate change adaptation research?',
  'Where does the evidence for mindfulness interventions in education break down?',
];

const USE_CASES = [
  { icon: Search, label: 'Literature gaps', desc: 'Find what the field hasn\'t answered yet' },
  { icon: Layers, label: 'Methodology audit', desc: 'Stress-test your research design' },
  { icon: Brain, label: 'Hypothesis check', desc: 'See if your idea holds up against evidence' },
  { icon: Sparkles, label: 'Synthesis report', desc: 'Turn a messy question into a clear summary' },
];

function StepCard({ step, index, isLive }) {
  const meta = STEP_META[step.type] || STEP_META.plan;
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.15 }}
      className={cn('rounded-xl border p-4 space-y-3', meta.bg, meta.border)}
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', meta.bg, 'border', meta.border)}>
          <Icon size={14} className={meta.text} />
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-bold uppercase tracking-widest', meta.text)}>{meta.label}</span>
          <span className="text-xs text-slate-600">Step {step.step}</span>
        </div>
        {isLive && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400">Live</span>
          </div>
        )}
      </div>

      <div className="space-y-2 pl-10">
        <div>
          <p className="text-xs text-slate-500 mb-0.5 font-medium">Thought</p>
          <p className="text-sm text-slate-300 italic">{step.thought}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5 font-medium">Action</p>
          <p className="text-sm text-slate-400">{step.action}</p>
        </div>
        <div className={cn('rounded-lg p-2.5 border', meta.bg, meta.border)}>
          <p className="text-xs text-slate-500 mb-0.5 font-medium">Observation</p>
          <p className="text-sm text-white font-medium">{step.observation}</p>
        </div>
      </div>
    </motion.div>
  );
}

function ConfidenceMeter({ score }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 36;
  const dash = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r="36" fill="none" stroke="#1e293b" strokeWidth="6" />
        <motion.circle
          cx="45" cy="45" r="36" fill="none"
          stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - dash }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
        <text x="45" y="48" textAnchor="middle" fill={color} fontSize="16" fontWeight="bold">{score}</text>
      </svg>
      <span className="text-xs text-slate-500">Confidence</span>
    </div>
  );
}

export default function AutoPilot() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [resultQuestion, setResultQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState([]);
  const reportRef = useRef(null);
  const printRef = useRef(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { activeProject } = useActiveProject();

  const saveConversationMutation = useMutation({
    mutationFn: (data) => cogniflow.entities.Conversation.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const runAutopilot = async () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setResultQuestion(question);
    setVisibleSteps([]);

    try {
      const data = await cogniflow.ai.autopilot({
        question,
        context: activeProject?.title ? `Research project: ${activeProject.title}` : undefined,
        max_steps: 4,
      });
      setResult(data);

      // Save to memory
      const convData = {
        title: question.slice(0, 60) + (question.length > 60 ? '…' : ''),
        type: 'autopilot',
        messages: [
          { role: 'user', content: question, timestamp: new Date().toISOString() },
          { role: 'assistant', content: data.final_report || '', timestamp: new Date().toISOString() },
        ],
        context: { confidence: data.confidence, steps_count: data.steps?.length || 0 },
      };
      if (activeProject?.id) convData.project_id = activeProject.id;
      saveConversationMutation.mutate(convData);

      // Reveal steps with stagger
      for (let i = 0; i < data.steps.length; i++) {
        await new Promise(r => setTimeout(r, 600));
        setVisibleSteps(prev => [...prev, data.steps[i]]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (result && reportRef.current) {
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
  }, [result?.final_report]);

  const handleDownloadPDF = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const projectLabel = activeProject?.title ? `Project: ${activeProject.title}` : 'General Research';
    const confidenceLabel = result?.confidence ? `Confidence: ${result.confidence}%` : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>AutoPilot Research Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Georgia', serif; color: #1a1a1a; background: #fff; padding: 48px 56px; max-width: 800px; margin: 0 auto; line-height: 1.7; }
            .cover { border-bottom: 2px solid #1a1a1a; padding-bottom: 28px; margin-bottom: 32px; }
            .badge { display: inline-block; font-family: sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #0891b2; border: 1px solid #0891b2; padding: 3px 8px; border-radius: 4px; margin-bottom: 16px; }
            h1 { font-size: 22px; font-weight: 700; line-height: 1.4; margin-bottom: 16px; }
            .meta { font-family: sans-serif; font-size: 12px; color: #666; display: flex; gap: 20px; flex-wrap: wrap; }
            .meta span { display: flex; align-items: center; gap: 4px; }
            h2 { font-size: 17px; font-weight: 700; margin: 28px 0 10px; }
            h3 { font-size: 15px; font-weight: 600; margin: 20px 0 8px; }
            p { margin-bottom: 14px; font-size: 14px; }
            ul, ol { padding-left: 22px; margin-bottom: 14px; }
            li { font-size: 14px; margin-bottom: 6px; }
            strong { font-weight: 700; }
            em { font-style: italic; }
            blockquote { border-left: 3px solid #ccc; padding-left: 16px; margin: 16px 0; color: #555; font-style: italic; }
            hr { border: none; border-top: 1px solid #e5e5e5; margin: 24px 0; }
            .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-family: sans-serif; font-size: 11px; color: #999; display: flex; justify-content: space-between; }
            @media print { body { padding: 32px; } }
          </style>
        </head>
        <body>
          <div class="cover">
            <div class="badge">AutoPilot Research Report</div>
            <h1>${resultQuestion}</h1>
            <div class="meta">
              <span>${date}</span>
              <span>${projectLabel}</span>
              ${confidenceLabel ? `<span>${confidenceLabel}</span>` : ''}
            </div>
          </div>
          <div class="body">
            ${content.innerHTML}
          </div>
          <div class="footer">
            <span>Generated by CogniFlow AutoPilot</span>
            <span>${date}</span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AutoPilot</h1>
              <p className="text-sm text-slate-500">Deep research on demand — for questions that need investigation, not just a quick answer</p>
            </div>
          </div>

          {/* Job-to-be-done callout */}
          <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/20 px-4 py-3 flex items-start gap-3">
            <Zap size={15} className="text-cyan-400 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-300">
              <span className="text-cyan-400 font-semibold">Use AutoPilot when</span> your question requires reading across sources, weighing conflicting evidence, or mapping a field — things that normally take hours. AutoPilot plans, searches, analyzes, and hands you a structured report with a confidence score.
            </p>
          </div>

          {/* Use cases */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {USE_CASES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-xl bg-slate-900/60 border border-white/5 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Icon size={13} className="text-cyan-400" />
                  <span className="text-xs font-semibold text-white">{label}</span>
                </div>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300">What do you need to investigate?</label>
            <p className="text-xs text-slate-500 mt-0.5">Be specific — the more focused your question, the sharper the report</p>
          </div>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runAutopilot(); }}
            placeholder="e.g. What methodological gaps exist in studies on remote work productivity post-2020?"
            className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-cyan-500/40 transition-colors"
            rows={3}
          />

          {/* Examples */}
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => setQuestion(q)}
                className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/40 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
              >
                {q.slice(0, 48)}…
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            {activeProject && (
              <span className="text-xs text-slate-500">
                Context: <span className="text-cyan-400">{activeProject.title}</span>
              </span>
            )}
            <button
              onClick={runAutopilot}
              disabled={!question.trim() || loading}
              className={cn(
                'ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all',
                question.trim() && !loading
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              )}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              {loading ? 'Investigating…' : 'Start Deep Research'}
            </button>
          </div>
        </div>

        {/* Live agent steps */}
        <AnimatePresence>
          {(loading || visibleSteps.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                {loading && <Loader2 size={14} className="text-cyan-400 animate-spin" />}
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  {loading ? 'Researching — this takes a moment…' : 'Research trace'}
                </span>
              </div>

              {visibleSteps.map((step, i) => (
                <StepCard
                  key={step.step}
                  step={step}
                  index={i}
                  isLive={loading && i === visibleSteps.length - 1}
                />
              ))}

              {loading && visibleSteps.length < 4 && (
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-700/20"
                >
                  <CircleDot size={14} className="text-cyan-400" />
                  <span className="text-sm text-slate-500">Processing next step…</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Final report */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              ref={reportRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Report header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">Research complete</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
                  >
                    <Download size={12} />
                    Export PDF
                  </button>
                  <button
                    onClick={() => { setResult(null); setVisibleSteps([]); setQuestion(''); }}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <RefreshCw size={12} />
                    New query
                  </button>
                </div>
              </div>

              {/* Report card */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-emerald-500/20 overflow-hidden">
                {/* Document header */}
                <div className="px-6 pt-6 pb-5 border-b border-white/5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded">AutoPilot Research Report</span>
                      </div>
                      <h2 className="text-base font-semibold text-white leading-snug">{resultQuestion}</h2>
                    </div>
                    <ConfidenceMeter score={result.confidence} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                    <span>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    {activeProject?.title && (
                      <>
                        <span className="text-slate-700">·</span>
                        <span className="text-cyan-400/70">{activeProject.title}</span>
                      </>
                    )}
                    <span className="text-slate-700">·</span>
                    <span>{visibleSteps.length} research steps</span>
                  </div>
                </div>

                {/* Report body — markdown rendered */}
                <div className="px-6 py-6">
                  <div
                    ref={printRef}
                    className="prose prose-sm prose-invert max-w-none
                      prose-headings:text-white prose-headings:font-semibold
                      prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3 prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-2
                      prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-2
                      prose-p:text-slate-300 prose-p:leading-relaxed prose-p:text-sm
                      prose-li:text-slate-300 prose-li:text-sm
                      prose-strong:text-white
                      prose-blockquote:border-cyan-500/40 prose-blockquote:text-slate-400
                      prose-hr:border-white/10"
                  >
                    <ReactMarkdown>{result.final_report}</ReactMarkdown>
                  </div>
                </div>

                {/* Next questions */}
                {result.next_questions?.length > 0 && (
                  <div className="px-6 pb-6 space-y-2">
                    <div className="border-t border-white/5 pt-4 mb-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                        Dig deeper — run these next
                      </p>
                    </div>
                    {result.next_questions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setQuestion(q); setResult(null); setVisibleSteps([]); }}
                        className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-xl hover:bg-slate-800/60 transition-colors group"
                      >
                        <ArrowRight size={13} className="text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0" />
                        <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">{q}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
