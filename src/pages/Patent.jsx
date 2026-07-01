import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, ScrollText, ExternalLink, Calendar, Users, Tag,
  Loader2, BookMarked, Share2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

const PATENT_DOMAINS = ['All', 'AI/ML', 'Biotechnology', 'Chemistry', 'Electronics', 'Mechanical', 'Medical', 'Software'];

const SAMPLE_PATENTS = [
  {
    id: 'US11847623',
    title: 'Deep Learning System for Protein Structure Prediction',
    inventors: ['Sarah Chen', 'Michael Park'],
    assignee: 'BioTech Research Inc.',
    filed: '2021-06-12',
    granted: '2023-04-18',
    abstract: 'A deep learning based system and method for predicting three-dimensional protein structures from amino acid sequences with high accuracy. The system uses transformer-based attention mechanisms combined with evolutionary information from multiple sequence alignments to achieve state-of-the-art prediction accuracy.',
    classification: 'G16B 15/30',
    status: 'Granted',
    domain: 'Biotechnology',
    citations: 142,
  },
  {
    id: 'US11923456',
    title: 'Quantum Error Correction Method Using Topological Qubits',
    inventors: ['Dr. Lisa Wang', 'Prof. James Mitchell'],
    assignee: 'Quantum Computing Corp.',
    filed: '2022-01-30',
    granted: '2023-09-05',
    abstract: 'A novel approach to quantum error correction employing topological qubits to maintain coherence. The method significantly reduces decoherence errors in quantum computing systems through a lattice-based error correction scheme.',
    classification: 'H10N 60/12',
    status: 'Granted',
    domain: 'Electronics',
    citations: 89,
  },
  {
    id: 'US20230287654',
    title: 'CRISPR-Based Gene Editing with Enhanced Specificity',
    inventors: ['Emma Rodriguez', 'Dr. Arun Patel', 'Dr. Kenji Yamamoto'],
    assignee: 'GenEdit Laboratories',
    filed: '2022-11-14',
    granted: null,
    abstract: 'An improved CRISPR-Cas9 system featuring modified guide RNAs and protein variants that minimize off-target editing events while maintaining high on-target efficiency across diverse genomic contexts.',
    classification: 'C12N 15/11',
    status: 'Pending',
    domain: 'Biotechnology',
    citations: 23,
  },
  {
    id: 'US11756890',
    title: 'Federated Learning Architecture for Privacy-Preserving AI',
    inventors: ['Dr. Raj Sharma', 'Alice Johnson'],
    assignee: 'PrivacyAI Systems Ltd.',
    filed: '2021-08-22',
    granted: '2023-07-11',
    abstract: 'A federated learning framework enabling collaborative model training across distributed data sources without centralizing sensitive data. Differential privacy mechanisms are integrated at each node to provide formal privacy guarantees.',
    classification: 'G06N 20/00',
    status: 'Granted',
    domain: 'AI/ML',
    citations: 201,
  },
  {
    id: 'US20230198765',
    title: 'Biodegradable Polymer Nanoparticles for Targeted Drug Delivery',
    inventors: ['Prof. Maria Gonzalez', 'Dr. Taichi Sato'],
    assignee: 'NanoMed Therapeutics',
    filed: '2023-02-05',
    granted: null,
    abstract: 'Novel biodegradable polymer nanoparticles functionalized with tumor-specific ligands for targeted delivery of chemotherapeutic agents. The particles exhibit pH-responsive drug release behavior in the tumor microenvironment.',
    classification: 'A61K 9/51',
    status: 'Pending',
    domain: 'Medical',
    citations: 8,
  },
  {
    id: 'US11634521',
    title: 'Neural Architecture Search via Evolutionary Algorithms',
    inventors: ['Dr. Yuki Tanaka', 'Prof. Elena Kovacs'],
    assignee: 'AutoML Research Group',
    filed: '2021-03-10',
    granted: '2023-01-25',
    abstract: 'An automated neural architecture search method combining evolutionary algorithms with gradient-based optimization to efficiently discover high-performing deep learning architectures for diverse tasks.',
    classification: 'G06N 3/04',
    status: 'Granted',
    domain: 'AI/ML',
    citations: 156,
  },
];

export default function Patent() {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('All');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(SAMPLE_PATENTS);
  const [saved, setSaved] = useState(new Set());
  const [expanded, setExpanded] = useState(null);
  const [status, setStatus] = useState('All');

  const handleSearch = (e) => {
    e.preventDefault();
    setSearching(true);
    setTimeout(() => {
      const q = query.toLowerCase();
      const filtered = SAMPLE_PATENTS.filter(p => {
        const matchDomain = domain === 'All' || p.domain === domain;
        const matchStatus = status === 'All' || p.status === status;
        const matchQuery = !q
          || p.title.toLowerCase().includes(q)
          || p.abstract.toLowerCase().includes(q)
          || p.inventors.some(i => i.toLowerCase().includes(q));
        return matchDomain && matchStatus && matchQuery;
      });
      setResults(filtered);
      setSearching(false);
    }, 800);
  };

  const shareViaWhatsApp = (patent) => {
    const text = `📋 Patent: ${patent.title}\n🆔 ${patent.id}\n👥 ${patent.inventors.join(', ')}\n📅 Filed: ${patent.filed}\n\nView: https://patents.google.com/patent/${patent.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const toggleSave = (id) => {
    setSaved(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <div className="min-h-screen bg-violet-50 dark:bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
              <ScrollText size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patent Search</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">Search and analyse patents relevant to your research</p>
            </div>
          </div>
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 mb-6 shadow-sm"
        >
          <form onSubmit={handleSearch} className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search patents by title, inventor, technology..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                />
              </div>
              <Button type="submit" disabled={searching} className="bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:opacity-90 px-6 rounded-xl">
                {searching ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {PATENT_DOMAINS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDomain(d)}
                  className={cn(
                    'px-3 py-1 text-xs rounded-full border transition-colors',
                    domain === d
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-orange-300'
                  )}
                >
                  {d}
                </button>
              ))}
              <div className="ml-auto flex gap-1.5">
                {['All', 'Granted', 'Pending'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      'px-3 py-1 text-xs rounded-full border transition-colors',
                      status === s
                        ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-700 dark:border-slate-200'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </motion.div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500 dark:text-slate-400">
          <span>{results.length} patent{results.length !== 1 ? 's' : ''} found</span>
          {saved.size > 0 && <span className="text-orange-500 font-medium">{saved.size} saved</span>}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {results.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-slate-500">
              <ScrollText size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No patents match your search. Try different keywords.</p>
            </div>
          ) : (
            results.map((patent, i) => (
              <motion.div
                key={patent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono text-gray-400 dark:text-slate-500">{patent.id}</span>
                      <Badge className={cn(
                        'text-xs border-0',
                        patent.status === 'Granted'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                      )}>
                        {patent.status}
                      </Badge>
                      <Badge className="text-xs border-0 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                        {patent.domain}
                      </Badge>
                      <span className="text-xs text-gray-400 dark:text-slate-500">{patent.citations} citations</span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5">{patent.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Users size={11} /> {patent.inventors.join(', ')}</span>
                      <span className="flex items-center gap-1"><Calendar size={11} /> Filed {patent.filed}</span>
                      <span className="flex items-center gap-1"><Tag size={11} /> {patent.classification}</span>
                    </div>
                    {expanded === patent.id && (
                      <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                        {patent.abstract}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => toggleSave(patent.id)}
                      className={cn(
                        'p-2 rounded-lg border transition-colors',
                        saved.has(patent.id)
                          ? 'bg-orange-50 border-orange-200 text-orange-500 dark:bg-orange-900/30 dark:border-orange-800'
                          : 'border-gray-200 dark:border-slate-700 text-gray-400 hover:text-orange-500 hover:border-orange-200'
                      )}
                      title="Save patent"
                    >
                      <BookMarked size={14} />
                    </button>
                    <button
                      onClick={() => shareViaWhatsApp(patent)}
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-400 hover:text-green-500 hover:border-green-300 transition-colors"
                      title="Share via WhatsApp"
                    >
                      <Share2 size={14} />
                    </button>
                    <a
                      href={`https://patents.google.com/patent/${patent.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-400 hover:text-blue-500 hover:border-blue-200 transition-colors"
                      title="View on Google Patents"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => setExpanded(expanded === patent.id ? null : patent.id)}
                  className="mt-2 flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                >
                  {expanded === patent.id
                    ? <><ChevronUp size={12} /> Hide abstract</>
                    : <><ChevronDown size={12} /> Show abstract</>
                  }
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
