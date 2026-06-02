import React, { useState, useRef, useEffect } from 'react';
import { cogniflow } from '@/api/cogniflowClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  FlaskConical,
  Telescope,
  Wrench,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Loader2,
  Users,
  Lightbulb,
  Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Agent config (mirrors backend) ────────────────────────────────────────────

const AGENTS = [
  {
    id: 'synthesizer',
    name: 'The Synthesizer',
    title: 'Polymathic Connector',
    icon: Brain,
    color: 'violet',
    gradient: 'from-violet-500 to-purple-700',
    border: 'border-violet-500/40',
    bg: 'bg-violet-500/10',
    glow: 'shadow-violet-500/20',
    text: 'text-violet-300',
    description: 'Connects your research to unexpected knowledge landscapes',
  },
  {
    id: 'skeptic',
    name: 'The Skeptic',
    title: 'Rigorous Critic',
    icon: FlaskConical,
    color: 'rose',
    gradient: 'from-rose-500 to-red-700',
    border: 'border-rose-500/40',
    bg: 'bg-rose-500/10',
    glow: 'shadow-rose-500/20',
    text: 'text-rose-300',
    description: 'Challenges assumptions and steels your methodology',
  },
  {
    id: 'visionary',
    name: 'The Visionary',
    title: 'Futures Thinker',
    icon: Telescope,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    glow: 'shadow-amber-500/20',
    text: 'text-amber-300',
    description: 'Extrapolates implications and identifies transformative potential',
  },
  {
    id: 'pragmatist',
    name: 'The Pragmatist',
    title: 'Action Architect',
    icon: Wrench,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    glow: 'shadow-emerald-500/20',
    text: 'text-emerald-300',
    description: 'Identifies actionable next steps and feasible paths forward',
  },
];

const EXAMPLE_QUESTIONS = [
  'What are the deepest assumptions my methodology makes that I haven\'t examined?',
  'Where is my research most vulnerable to critique, and how do I pre-empt it?',
  'What would it mean if my hypothesis turns out to be wrong?',
  'How might my findings be misused or misinterpreted?',
  'What is the most counterintuitive thing my research implies?',
  'What should I be reading that I probably haven\'t found yet?',
];

// ── Typing animation component ─────────────────────────────────────────────────

function TypedText({ text, delay = 0, speed = 12 }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    if (!text) return;

    let i = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [text, delay, speed]);

  return (
    <span>
      {displayed}
      {!done && text && <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5 align-middle" />}
    </span>
  );
}

// ── Agent Card ─────────────────────────────────────────────────────────────────

function AgentCard({ agent, response, isLoading, revealDelay }) {
  const [expanded, setExpanded] = useState(true);
  const Icon = agent.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: revealDelay * 0.15 }}
      className={cn(
        'rounded-2xl border backdrop-blur-sm overflow-hidden',
        agent.border,
        agent.bg,
        'shadow-xl',
        agent.glow,
      )}
    >
      {/* Card Header */}
      <div
        className={cn('flex items-center justify-between p-4 cursor-pointer', agent.bg)}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-xl bg-gradient-to-br', agent.gradient, 'shadow-lg')}>
            <Icon size={18} className="text-white" />
          </div>
          <div>
            <h3 className={cn('font-bold text-sm', agent.text)}>{agent.name}</h3>
            <p className="text-xs text-slate-500">{agent.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className={cn('w-1.5 h-1.5 rounded-full bg-gradient-to-r', agent.gradient)}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                />
              ))}
            </div>
          )}
          {expanded ? (
            <ChevronUp size={16} className="text-slate-500" />
          ) : (
            <ChevronDown size={16} className="text-slate-500" />
          )}
        </div>
      </div>

      {/* Card Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-4 pb-4 space-y-3">
              {isLoading ? (
                <div className="space-y-2 py-2">
                  {[100, 90, 75].map((w, i) => (
                    <motion.div
                      key={i}
                      className={cn('h-2 rounded-full bg-gradient-to-r', agent.gradient, 'opacity-20')}
                      style={{ width: `${w}%` }}
                      animate={{ opacity: [0.1, 0.25, 0.1] }}
                      transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}
                    />
                  ))}
                </div>
              ) : response ? (
                <>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    <TypedText text={response.response} delay={revealDelay * 200} speed={8} />
                  </p>
                  {response.key_point && (
                    <div className={cn('flex gap-2 p-3 rounded-xl border', agent.border, agent.bg)}>
                      <Quote size={14} className={cn('mt-0.5 shrink-0', agent.text)} />
                      <p className={cn('text-xs font-medium leading-relaxed', agent.text)}>
                        {response.key_point}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-600 italic py-2">{agent.description}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ResearchCouncil() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [councilResponse, setCouncilResponse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [showExamples, setShowExamples] = useState(false);
  const textareaRef = useRef(null);

  const handleSubmit = async () => {
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setCouncilResponse(null);

    const newSession = {
      id: Date.now(),
      question: question.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      response: null,
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSession(newSession.id);

    try {
      const result = await cogniflow.ai.council({ question: question.trim() });
      const completed = { ...newSession, response: result };
      setSessions((prev) => prev.map((s) => (s.id === newSession.id ? completed : s)));
      setCouncilResponse(result);
    } catch (e) {
      console.error('Council error:', e);
    } finally {
      setIsLoading(false);
    }

    setQuestion('');
  };

  const loadSession = (session) => {
    setActiveSession(session.id);
    setCouncilResponse(session.response);
    setQuestion('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sessions Sidebar */}
      <aside className="hidden xl:flex flex-col w-72 border-r border-slate-800/50 bg-slate-900/30 p-4 gap-3">
        <div className="flex items-center gap-2 px-1 py-2">
          <Users size={16} className="text-violet-400" />
          <span className="text-sm font-semibold text-slate-300">Council Sessions</span>
        </div>

        {sessions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-slate-600 text-center px-4">
              Your council sessions will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto flex-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => loadSession(session)}
                className={cn(
                  'w-full text-left p-3 rounded-xl border text-xs transition-all',
                  activeSession === session.id
                    ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                    : 'bg-slate-800/30 border-slate-700/30 text-slate-400 hover:bg-slate-800/50',
                )}
              >
                <p className="font-medium line-clamp-2 mb-1">{session.question}</p>
                <p className="text-slate-600">{session.timestamp}</p>
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 shadow-lg shadow-violet-500/30">
              <Users size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Research Council</h1>
              <p className="text-slate-400 mt-1 text-sm">
                Four expert AI minds — The Synthesizer, The Skeptic, The Visionary, The Pragmatist —
                analyse your research question from every angle simultaneously.
              </p>
            </div>
          </div>

          {/* Agent roster */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {AGENTS.map((agent) => {
              const Icon = agent.icon;
              return (
                <div
                  key={agent.id}
                  className={cn('p-3 rounded-xl border', agent.border, agent.bg)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn('p-1.5 rounded-lg bg-gradient-to-br', agent.gradient)}>
                      <Icon size={12} className="text-white" />
                    </div>
                    <span className={cn('text-xs font-semibold', agent.text)}>{agent.name}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-tight">{agent.description}</p>
                </div>
              );
            })}
          </div>

          {/* Question Input */}
          <div className="relative mb-6">
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-sm overflow-hidden focus-within:border-violet-500/60 transition-all">
              <Textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your research question... (⌘+Enter to submit)"
                className="border-0 bg-transparent resize-none text-slate-200 placeholder-slate-600 p-4 pb-2 min-h-[100px] text-sm focus-visible:ring-0"
                disabled={isLoading}
              />
              <div className="flex items-center justify-between px-4 pb-3">
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExamples(!showExamples)}
                    className="text-slate-500 hover:text-slate-300 text-xs gap-1.5 h-8"
                  >
                    <Lightbulb size={12} />
                    Example questions
                    {showExamples ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </Button>
                  <AnimatePresence>
                    {showExamples && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute bottom-10 left-0 w-80 z-10 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-3 space-y-1"
                      >
                        {EXAMPLE_QUESTIONS.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setQuestion(q);
                              setShowExamples(false);
                              textareaRef.current?.focus();
                            }}
                            className="w-full text-left text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg p-2.5 transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!question.trim() || isLoading}
                  className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white border-0 gap-2 h-9 px-5 rounded-xl shadow-lg shadow-violet-500/25 disabled:opacity-40"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Convening…
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Convene Council
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          {!councilResponse && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-4 text-center"
            >
              <div className="relative">
                <div className="absolute inset-0 blur-3xl bg-violet-500/10 rounded-full" />
                <div className="relative grid grid-cols-2 gap-3 w-32 h-32">
                  {AGENTS.map((a, i) => {
                    const Icon = a.icon;
                    return (
                      <motion.div
                        key={a.id}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 2, delay: i * 0.5, repeat: Infinity }}
                        className={cn('flex items-center justify-center rounded-xl bg-gradient-to-br', a.gradient, 'opacity-80')}
                      >
                        <Icon size={20} className="text-white" />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-300">The Council Awaits</h3>
                <p className="text-sm text-slate-600 mt-1 max-w-md">
                  Ask anything — your research question, a methodological dilemma, a theoretical challenge.
                  The Council will provide four perspectives simultaneously.
                </p>
              </div>
            </motion.div>
          )}

          {(isLoading || councilResponse) && (
            <div className="space-y-6">
              {/* Question display */}
              {activeSession && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 items-start"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <BookOpen size={14} className="text-slate-300" />
                  </div>
                  <div className="flex-1 bg-slate-800/60 rounded-2xl rounded-tl-sm border border-slate-700/50 p-4">
                    <p className="text-slate-200 text-sm">
                      {sessions.find((s) => s.id === activeSession)?.question}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Agent responses grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {AGENTS.map((agent, i) => {
                  const agentResp = councilResponse?.agents?.find((a) => a.agent_id === agent.id);
                  return (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      response={agentResp}
                      isLoading={isLoading && !agentResp}
                      revealDelay={i}
                    />
                  );
                })}
              </div>

              {/* Synthesis */}
              <AnimatePresence>
                {councilResponse?.synthesis && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="relative rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-900/20 to-purple-900/10 p-6 overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shrink-0">
                        <Sparkles size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">
                          Council Synthesis
                        </p>
                        <p className="text-slate-200 text-sm leading-relaxed">
                          <TypedText
                            text={councilResponse.synthesis}
                            delay={1200}
                            speed={6}
                          />
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
