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
  FileText,
  BookOpen,
  BarChart3,
  Shield,
  Cpu,
  TrendingUp,
  Database,
} from 'lucide-react';
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Brain,
    name: 'Thinking Mode',
    description: 'Organise thoughts, build conceptual maps, and structure your research framework with AI guidance.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: PenTool,
    name: 'Writing Companion',
    description: 'Get real-time feedback, paraphrase suggestions, and style improvements for academic writing.',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    icon: MessageSquare,
    name: 'Research Assistant',
    description: 'Ask any research question and get context-grounded answers via dense RAG retrieval.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Search,
    name: 'Gap Analyzer',
    description: 'Upload literature and instantly surface research gaps, contradictions, and open questions.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: GraduationCap,
    name: 'Viva Preparation',
    description: 'Simulate viva questions, practice answers, and get feedback to ace your defence.',
    color: 'from-rose-500 to-pink-600',
  },
  {
    icon: Clock,
    name: 'Research Memory',
    description: 'Capture fleeting insights and revisit your research history — nothing gets lost.',
    color: 'from-slate-500 to-gray-600',
  },
  {
    icon: BookOpen,
    name: 'Project Dashboard',
    description: 'Manage all your research projects in one place with progress tracking and insights.',
    color: 'from-indigo-500 to-blue-600',
  },
  {
    icon: FileText,
    name: 'Document Manager',
    description: 'Ingest PDFs and papers into the semantic index for RAG-powered retrieval.',
    color: 'from-fuchsia-500 to-violet-600',
  },
];

const benefits = [
  'Dense semantic retrieval (Precision@5 = 0.86)',
  'Explainable AI — LIME & SHAP attributions',
  'Retrieval-Augmented Generation (RAG)',
  'Privacy-first — your data stays yours',
];

const stats = [
  { value: '0.86', label: 'Precision@5', sublabel: 'Dense Retrieval' },
  { value: '0.89', label: 'MRR Score', sublabel: 'Mean Reciprocal Rank' },
  { value: '8', label: 'Research Modules', sublabel: 'All-in-one platform' },
];

const pipeline = [
  {
    icon: Database,
    title: 'Semantic Indexing',
    desc: 'Documents are encoded as 768-dim vectors via Sentence-BERT (all-mpnet-base-v2) and indexed with FAISS for sub-linear retrieval.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: Cpu,
    title: 'Dense RAG Retrieval',
    desc: 'At query time, the top-k passages are retrieved by maximum inner-product search and passed to a generative LLM as grounded context.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Shield,
    title: 'Explainability (XAI)',
    desc: 'LIME, SHAP, and gradient-based saliency show exactly which tokens and document sections drove each retrieval decision.',
    color: 'from-amber-500 to-orange-600',
  },
];

const retrievalTable = [
  { model: 'TF-IDF + Cosine', p5: '0.62', r5: '0.58', mrr: '0.66', ndcg: '0.61', highlight: false },
  { model: 'DPR', p5: '0.76', r5: '0.73', mrr: '0.79', ndcg: '0.75', highlight: false },
  { model: 'Dense Embedding (SBERT)', p5: '0.81', r5: '0.78', mrr: '0.84', ndcg: '0.80', highlight: false },
  { model: 'ColBERT', p5: '0.83', r5: '0.80', mrr: '0.86', ndcg: '0.82', highlight: false },
  { model: 'CogniFlow (RAG)', p5: '0.86', r5: '0.83', mrr: '0.89', ndcg: '0.85', highlight: true },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 text-gray-900 overflow-x-hidden">

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">CogniFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/Login">
              <Button variant="ghost" className="text-gray-700 hover:text-gray-900 hover:bg-gray-100">
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
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-purple-500/8 rounded-full blur-3xl" />
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-500/8 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 text-sm mb-8">
              <Sparkles size={13} />
              Explainable RAG · Dense Semantic Retrieval · Academic Research
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
              Research Smarter,{' '}
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
                Not Harder
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
              CogniFlow combines Retrieval-Augmented Generation with dense semantic embeddings and Explainable AI — eight integrated research modules in one seamless workspace.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/Login?tab=register">
                <Button size="lg" className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-base px-8 h-12 shadow-lg shadow-violet-500/20">
                  Start for Free <ArrowRight size={17} className="ml-2" />
                </Button>
              </Link>
              <Link to="/Login">
                <Button size="lg" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 text-base px-8 h-12">
                  Sign In
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {benefits.map((b) => (
                <div key={b} className="flex items-center gap-1.5 text-sm text-gray-500">
                  <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                  {b}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats ──────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-y border-violet-100 bg-violet-50">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
              <div className="text-5xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-1">
                {stat.value}
              </div>
              <div className="text-gray-800 font-semibold text-sm">{stat.label}</div>
              <div className="text-gray-400 text-xs mt-0.5">{stat.sublabel}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Pipeline ───────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How CogniFlow{' '}
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Works
              </span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              A four-stage pipeline — data ingestion, semantic indexing, RAG generation, and XAI explainability.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pipeline.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="p-6 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-white hover:border-violet-200 transition-all"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4`}>
                  <step.icon size={20} className="text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Retrieval Performance Table ────────────────────────────── */}
      <section className="py-24 px-6 bg-gradient-to-br from-violet-50 to-purple-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Proven{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Performance
              </span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Systematically evaluated on a 5,000-passage academic corpus across Precision, Recall, MRR, and NDCG@5.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Model</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-600">P@5</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-600">R@5</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-600">MRR</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-600">NDCG@5</th>
                </tr>
              </thead>
              <tbody>
                {retrievalTable.map((row, i) => (
                  <tr
                    key={row.model}
                    className={`border-b border-gray-100 last:border-0 transition-colors ${
                      row.highlight
                        ? 'bg-violet-50 font-semibold'
                        : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="px-5 py-3 text-gray-900">
                      {row.highlight ? (
                        <span className="flex items-center gap-2">
                          {row.model}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500 text-white font-normal">Best</span>
                        </span>
                      ) : row.model}
                    </td>
                    <td className={`px-5 py-3 text-center ${row.highlight ? 'text-violet-700' : 'text-gray-700'}`}>{row.p5}</td>
                    <td className={`px-5 py-3 text-center ${row.highlight ? 'text-violet-700' : 'text-gray-700'}`}>{row.r5}</td>
                    <td className={`px-5 py-3 text-center ${row.highlight ? 'text-violet-700' : 'text-gray-700'}`}>{row.mrr}</td>
                    <td className={`px-5 py-3 text-center ${row.highlight ? 'text-violet-700' : 'text-gray-700'}`}>{row.ndcg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">
            All differences vs. TF-IDF baseline are statistically significant (p &lt; 0.05, paired t-test).
          </p>
        </div>
      </section>

      {/* ─── Features Grid ──────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Eight Modules.{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                One Platform.
              </span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Every tool you need across your entire research journey, powered by dense RAG and explainable AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * i }}
                className="p-6 rounded-2xl bg-gray-50 border border-gray-200 hover:border-violet-200 hover:bg-white transition-all duration-200 group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200`}>
                  <feature.icon size={22} className="text-white" />
                </div>
                <h3 className="font-semibold text-base text-gray-900 mb-2">{feature.name}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── XAI Highlight ──────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gradient-to-br from-slate-900 to-violet-950 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs mb-6">
              <Shield size={12} /> Explainable AI
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Transparent by Design</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Unlike black-box retrieval systems, CogniFlow shows <em>why</em> each passage was retrieved — using LIME, SHAP, and gradient-based saliency attributions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Global Feature Saliency',
                desc: 'Gradient-based attribution reveals that abstract and methodology sections carry the highest relevance weight (0.42 and 0.31).',
                icon: TrendingUp,
                color: 'from-violet-500 to-purple-600',
              },
              {
                title: 'LIME Instance Explanations',
                desc: 'For each query-document pair, a locally linear surrogate model identifies which phrases positively or negatively influenced the similarity score.',
                icon: BarChart3,
                color: 'from-emerald-500 to-teal-600',
              },
              {
                title: 'SHAP Attributions',
                desc: 'Shapley-value-based attributions provide theoretically grounded, consistent feature importance scores per token across the corpus.',
                icon: Shield,
                color: 'from-amber-500 to-orange-600',
              },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
                  <item.icon size={18} className="text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Sufficiency / Comprehensiveness mini-stats */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: '0.71', label: 'Sufficiency', desc: 'LIME faithfulness' },
              { value: '0.68', label: 'Comprehensiveness', desc: 'Attribution coverage' },
              { value: '0.42', label: 'Abstract weight', desc: 'Highest saliency section' },
              { value: '0.31', label: 'Method weight', desc: '2nd highest saliency' },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-2xl font-bold text-violet-300 mb-1">{s.value}</div>
                <div className="text-white text-xs font-medium">{s.label}</div>
                <div className="text-slate-500 text-xs mt-0.5">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="relative p-12 rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 border border-violet-600 text-center overflow-hidden text-white shadow-2xl shadow-violet-500/30">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
            <Sparkles size={36} className="text-violet-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Research?
            </h2>
            <p className="text-violet-100 mb-8">
              Join researchers using CogniFlow to think deeper, write faster, and publish with confidence — backed by explainable, dense semantic retrieval.
            </p>
            <Link to="/Login?tab=register">
              <Button size="lg" className="bg-white text-violet-700 hover:bg-violet-50 text-base px-10 h-12 shadow-lg font-semibold">
                Get Started Free <ArrowRight size={17} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-sm text-gray-500">CogniFlow &copy; {new Date().getFullYear()}</span>
          </div>
          <p className="text-sm text-gray-400">Explainable RAG · Dense Semantic Retrieval · Academic Research Assistant</p>
        </div>
      </footer>
    </div>
  );
}
