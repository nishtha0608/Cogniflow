import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain,
  PenTool,
  MessageSquare,
  Search,
  GraduationCap,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Brain,
    name: 'Thinking Mode',
    description: 'Organise thoughts, build conceptual maps, and structure your research framework with AI guidance.',
    color: 'from-violet-500 to-purple-600',
    accent: 'violet',
  },
  {
    icon: PenTool,
    name: 'Writing Companion',
    description: 'Get real-time feedback, paraphrase suggestions, and style improvements for academic writing.',
    color: 'from-blue-500 to-cyan-600',
    accent: 'blue',
  },
  {
    icon: MessageSquare,
    name: 'Research Assistant',
    description: 'Ask any research question and get academically rigorous, context-aware answers.',
    color: 'from-emerald-500 to-teal-600',
    accent: 'emerald',
  },
  {
    icon: Search,
    name: 'Gap Analyzer',
    description: 'Upload literature and instantly surface research gaps, contradictions, and open questions.',
    color: 'from-amber-500 to-orange-600',
    accent: 'amber',
  },
  {
    icon: GraduationCap,
    name: 'Viva Prep',
    description: 'Simulate viva questions, practice answers, and get feedback to ace your defence.',
    color: 'from-rose-500 to-pink-600',
    accent: 'rose',
  },
  {
    icon: Clock,
    name: 'Memory',
    description: 'Capture fleeting insights and revisit your research history — nothing gets lost.',
    color: 'from-slate-500 to-gray-600',
    accent: 'slate',
  },
];

const benefits = [
  'No credit card required to start',
  'Works with any research discipline',
  'Privacy-first — your data stays yours',
  'Export to Word, PDF, and more',
];

const stats = [
  { value: '10x', label: 'Faster Literature Review' },
  { value: '85%', label: 'Time Saved on Writing' },
  { value: '6', label: 'Specialised Research Modes' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">CogniFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/Login">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
                Sign In
              </Button>
            </Link>
            <Link to="/Login?tab=register">
              <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ───────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-6">
        {/* ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-purple-500/8 rounded-full blur-3xl" />
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-500/8 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-8">
              <Sparkles size={13} />
              AI-Powered Research Platform
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
              Research Smarter,{' '}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                Not Harder
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              CogniFlow brings together six AI-powered research modes in one seamless workspace — from ideation to publication.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/Login?tab=register">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-base px-8 h-12 shadow-lg shadow-violet-500/20"
                >
                  Start for Free <ArrowRight size={17} className="ml-2" />
                </Button>
              </Link>
              <Link to="/Login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-base px-8 h-12"
                >
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Benefits list */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {benefits.map((b) => (
                <div key={b} className="flex items-center gap-1.5 text-sm text-slate-400">
                  <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                  {b}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats ──────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-y border-slate-800/50 bg-slate-900/20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
            >
              <div className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-slate-400 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Features Grid ──────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Six Modes.{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                One Platform.
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Every tool you need across your entire research journey, powered by the latest AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i }}
                className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/40 hover:border-slate-600/50 hover:bg-slate-800/50 transition-all duration-200 group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200`}>
                  <feature.icon size={22} className="text-white" />
                </div>
                <h3 className="font-semibold text-lg text-white mb-2">{feature.name}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="relative p-12 rounded-3xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/20 text-center overflow-hidden">
            {/* inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
            <Sparkles size={36} className="text-violet-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Research?
            </h2>
            <p className="text-slate-400 mb-8">
              Join researchers who use CogniFlow to think deeper, write faster, and publish with confidence.
            </p>
            <Link to="/Login?tab=register">
              <Button
                size="lg"
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-base px-10 h-12 shadow-lg shadow-violet-500/25"
              >
                Get Started Free <ArrowRight size={17} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-sm text-slate-400">CogniFlow &copy; {new Date().getFullYear()}</span>
          </div>
          <p className="text-sm text-slate-500">Your AI Research Companion</p>
        </div>
      </footer>
    </div>
  );
}
