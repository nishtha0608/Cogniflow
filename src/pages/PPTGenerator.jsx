import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Download, Loader2, ChevronUp, ChevronDown,
  Sparkles, FileText, Eye, LayoutTemplate, X,
  Edit3, Brain, FolderOpen, BookOpen, Lightbulb,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useActiveProject } from '@/lib/ProjectContext';
import { cogniflow } from '@/api/cogniflowClient';
import { cn } from '@/lib/utils';

// ─── Themes ──────────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'academic', label: 'Academic', bg: '#1e1b4b', accent: '#7c3aed', text: '#ffffff', preview: 'from-indigo-900 to-violet-900' },
  { id: 'modern',   label: 'Modern',   bg: '#0f172a', accent: '#06b6d4', text: '#f1f5f9', preview: 'from-slate-900 to-cyan-900' },
  { id: 'light',    label: 'Light',    bg: '#ffffff', accent: '#7c3aed', text: '#1e1b4b', preview: 'from-gray-100 to-violet-100' },
  { id: 'nature',   label: 'Nature',   bg: '#052e16', accent: '#16a34a', text: '#f0fdf4', preview: 'from-emerald-950 to-green-900' },
];

const SLIDE_TYPES = ['title', 'content', 'section', 'quote'];

let _uid = 0;
const uid  = () => ++_uid;
const make = (title = '', body = '', type = 'content') => ({ id: uid(), type, title, body });

function getDefaultDeck(title) {
  return [
    make(title || 'Research Presentation', '', 'title'),
    make('Introduction',     '• Background and motivation\n• Problem statement\n• Research objectives'),
    make('Literature Review','• Key prior work\n• Identified gaps\n• Theoretical framework'),
    make('Methodology',      '• Research design\n• Data collection\n• Analysis methods'),
    make('Results',          '• Key finding 1\n• Key finding 2\n• Supporting evidence'),
    make('Discussion',       '• Interpretation\n• Implications\n• Limitations'),
    make('Conclusion',       '• Summary of contributions\n• Future work\n• Acknowledgements'),
  ];
}

// ─── PPTX export ─────────────────────────────────────────────────────────────
async function exportPPTX(presTitle, author, slides, theme) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const prs = new PptxGenJS();
  prs.layout = 'LAYOUT_WIDE';
  prs.author = author || 'CogniFlow';
  prs.title  = presTitle || 'Presentation';

  const isBgDark  = theme.bg !== '#ffffff';
  const textHex   = isBgDark ? 'FFFFFF' : '1e1b4b';
  const accentHex = theme.accent.replace('#', '');
  const bgHex     = theme.bg.replace('#', '');
  const mutedHex  = isBgDark ? 'cbd5e1' : '6b7280';

  slides.forEach((slide, idx) => {
    const sld = prs.addSlide();
    sld.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: bgHex } });
    sld.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.1,   fill: { color: accentHex } });

    if (idx > 0) sld.addText(`${idx}`, { x: 11.8, y: 6.8, w: 0.5, h: 0.2, fontSize: 9, color: mutedHex, align: 'right' });

    if (slide.type === 'title') {
      sld.addText(slide.title || prs.title, { x: 1, y: 2, w: 11, h: 1.2, fontSize: 40, bold: true, color: textHex, align: 'center' });
      if (author) sld.addText(author, { x: 1, y: 3.5, w: 11, h: 0.5, fontSize: 18, color: mutedHex, align: 'center' });
      sld.addShape(prs.ShapeType.rect, { x: 4.5, y: 4.3, w: 4, h: 0.05, fill: { color: accentHex } });
    } else if (slide.type === 'section') {
      sld.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: accentHex } });
      sld.addText(slide.title, { x: 1, y: 2.5, w: 11, h: 1.2, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center' });
    } else if (slide.type === 'quote') {
      sld.addText('"', { x: 0.5, y: 0.8, w: 1.5, h: 1.5, fontSize: 80, color: accentHex });
      sld.addText(slide.body || '', { x: 1, y: 1.8, w: 11, h: 2.5, fontSize: 22, italic: true, color: textHex, align: 'center' });
      if (slide.title) sld.addText(`— ${slide.title}`, { x: 1, y: 4.5, w: 11, h: 0.4, fontSize: 14, color: mutedHex, align: 'center' });
    } else {
      sld.addText(slide.title, { x: 0.5, y: 0.25, w: 12, h: 0.7, fontSize: 26, bold: true, color: textHex });
      sld.addShape(prs.ShapeType.rect, { x: 0.5, y: 1.0, w: 12, h: 0.03, fill: { color: accentHex } });
      const lines = (slide.body || '').split('\n').filter(Boolean);
      if (lines.length) {
        sld.addText(
          lines.map(l => ({ text: l.replace(/^[•\-*]\s*/, ''), options: { bullet: true, fontSize: 18, color: textHex, paraSpaceAfter: 6 } })),
          { x: 0.5, y: 1.2, w: 12, h: 5, valign: 'top' }
        );
      }
    }
  });

  prs.writeFile({ fileName: `${(presTitle || 'presentation').replace(/\s+/g, '_')}.pptx` });
}

// ─── Slide tile ───────────────────────────────────────────────────────────────
function SlideTile({ slide, theme, index, total, isEditing, onToggle, onUpdate, onMove, onDelete }) {
  const typeBadge = cn('text-xs border-0',
    slide.type === 'title'   ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' :
    slide.type === 'section' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
    slide.type === 'quote'   ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400' :
    'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
  );

  return (
    <motion.div layout className={cn(
      'rounded-2xl border transition-all shadow-sm overflow-hidden',
      isEditing ? 'border-violet-400 dark:border-violet-600' : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900'
    )}>
      {/* Mini preview strip — styled like the real slide */}
      <div className="flex items-center gap-2 px-3 py-1.5 cursor-pointer" style={{ background: theme.bg }} onClick={onToggle}>
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: theme.accent }} />
        <span className="text-xs font-mono opacity-30 shrink-0 w-5" style={{ color: theme.text }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="flex-1 text-xs font-semibold truncate" style={{ color: theme.text }}>
          {slide.title || 'Untitled'}
        </span>
        <span className="text-xs opacity-30 capitalize" style={{ color: theme.text }}>{slide.type}</span>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900">
        <Badge className={typeBadge}>{slide.type}</Badge>
        <span className="flex-1 text-sm text-gray-600 dark:text-slate-300 truncate cursor-pointer hover:text-violet-600 dark:hover:text-violet-400" onClick={onToggle}>
          {slide.title || 'Click to edit'}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="p-1 text-gray-300 dark:text-slate-600 hover:text-gray-600 dark:hover:text-slate-300 disabled:opacity-20 transition-colors"><ChevronUp size={14} /></button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="p-1 text-gray-300 dark:text-slate-600 hover:text-gray-600 dark:hover:text-slate-300 disabled:opacity-20 transition-colors"><ChevronDown size={14} /></button>
          <button onClick={onDelete} className="p-1 text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors"><X size={14} /></button>
        </div>
      </div>

      {/* Inline editor */}
      <AnimatePresence>
        {isEditing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-3 space-y-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Title</label>
                  <input value={slide.title} onChange={e => onUpdate('title', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Type</label>
                  <select value={slide.type} onChange={e => onUpdate('type', e.target.value)}
                    className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-violet-400">
                    {SLIDE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {slide.type !== 'title' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">
                    Content {slide.type === 'content' ? '— one bullet per line' : ''}
                  </label>
                  <textarea value={slide.body} onChange={e => onUpdate('body', e.target.value)}
                    rows={5} placeholder="• Key point&#10;• Another point&#10;• Detail"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-violet-400 resize-none font-mono" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Between-slide "+ Add" button ─────────────────────────────────────────────
function AddSlideButton({ onAddAI, onAddManual }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-center my-1.5">
      <button onClick={() => setOpen(o => !o)}
        className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 dark:border-slate-600 text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-colors flex items-center justify-center text-base leading-none">
        +
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }} transition={{ duration: 0.12 }}
              className="absolute top-9 z-20 flex gap-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-2 shadow-xl">
              <button onClick={() => { setOpen(false); onAddAI(); }}
                className="flex flex-col items-center gap-2 px-5 py-3 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors min-w-[100px]">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow">
                  <Sparkles size={16} className="text-white" />
                </div>
                <span className="text-xs font-bold text-violet-700 dark:text-violet-300">AI</span>
                <span className="text-xs text-gray-400 dark:text-slate-500 text-center leading-tight">Generate with AI</span>
              </button>
              <div className="w-px bg-gray-100 dark:bg-slate-800 self-stretch" />
              <button onClick={() => { setOpen(false); onAddManual(); }}
                className="flex flex-col items-center gap-2 px-5 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors min-w-[100px]">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-400 to-slate-500 flex items-center justify-center shadow">
                  <Edit3 size={16} className="text-white" />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-white">Manual</span>
                <span className="text-xs text-gray-400 dark:text-slate-500 text-center leading-tight">Write yourself</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PPTGenerator() {
  const { user } = useAuth();
  const { activeProject } = useActiveProject();

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', user?.email],
    queryFn: () => cogniflow.entities.Document.list('-updated_date', 10),
    enabled: !!user, staleTime: 60_000,
  });
  const { data: gaps = [] } = useQuery({
    queryKey: ['gaps', user?.email],
    queryFn: () => cogniflow.entities.ResearchGap.list('-created_date', 5),
    enabled: !!user, staleTime: 60_000,
  });

  const [phase, setPhase]         = useState('start');
  const [title, setTitle]         = useState('');
  const [author, setAuthor]       = useState(user?.full_name || '');
  const [theme, setTheme]         = useState(THEMES[0]);
  const [slides, setSlides]       = useState([]);
  const [editIdx, setEditIdx]     = useState(null);
  const [preview, setPreview]     = useState(false);
  const [exporting, setExporting] = useState(false);
  const [startLoading, setStartLoading] = useState(false);

  // AI add-slide modal
  const [aiModal, setAiModal]         = useState(null);
  const [aiPrompt, setAiPrompt]       = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const buildContext = useCallback(() => {
    const parts = [];
    if (activeProject) {
      parts.push(`Project: "${activeProject.title}" (${activeProject.field || 'General'})`);
      if (activeProject.research_questions?.length) {
        parts.push(`Research questions: ${activeProject.research_questions.slice(0, 3).join('; ')}`);
      }
    }
    if (documents.length) parts.push(`Papers: ${documents.slice(0, 5).map(d => d.title || d.name).join(', ')}`);
    if (gaps.length) parts.push(`Gaps: ${gaps.slice(0, 3).map(g => g.title || g.gap).join('; ')}`);
    return parts.join('\n');
  }, [activeProject, documents, gaps]);

  const callAI = async (prompt) => {
    const ctx = buildContext();
    const res = await fetch('/api/research-chat/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: ctx ? `Context:\n${ctx}\n\nTask: ${prompt}` : prompt, mode: 'general' }),
    });
    if (!res.ok) throw new Error('AI unavailable');
    const data = await res.json();
    return data.response || data.message || '';
  };

  const parseJSON = (raw) => {
    const arrMatch = raw.match(/\[[\s\S]*?\]/);
    if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch { /* ignored */ } }
    return null;
  };

  const startWithAI = async () => {
    if (!title.trim()) return;
    setStartLoading(true);
    try {
      const raw = await callAI(`Generate a 7-slide academic presentation outline for: "${title}". Return ONLY a JSON array of objects with keys "title" (string), "body" (3-4 bullets starting with "•"), "type" (title/content/section). First slide must be type "title".`);
      const parsed = parseJSON(raw);
      setSlides(parsed ? parsed.map(p => make(p.title, p.body || '', p.type || 'content')) : getDefaultDeck(title));
    } catch {
      setSlides(getDefaultDeck(title));
    } finally {
      setStartLoading(false);
      setPhase('editor');
    }
  };

  const addSlideAI = async (insertAt) => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const raw = await callAI(`Generate ONE slide about: "${aiPrompt}". Return ONLY a JSON object: {"title":"...","body":"• ...\n• ...\n• ...","type":"content"}.`);
      const objMatch = raw.match(/\{[\s\S]*?\}/);
      let parsed = null;
      if (objMatch) { try { parsed = JSON.parse(objMatch[0]); } catch { /* ignored */ } }
      const s = make(parsed?.title || aiPrompt, parsed?.body || `• ${aiPrompt}\n• Key detail\n• Evidence`, 'content');
      setSlides(ss => { const c = [...ss]; c.splice(insertAt, 0, s); return c; });
      setEditIdx(insertAt);
    } catch {
      const s = make(aiPrompt, `• ${aiPrompt}\n• Key point\n• Evidence`);
      setSlides(ss => { const c = [...ss]; c.splice(insertAt, 0, s); return c; });
    } finally {
      setAiGenerating(false);
      setAiModal(null);
      setAiPrompt('');
    }
  };

  const addSlideManual = (insertAt) => {
    const s = make('New Slide', '• Point 1\n• Point 2\n• Point 3');
    setSlides(ss => { const c = [...ss]; c.splice(insertAt, 0, s); return c; });
    setEditIdx(insertAt);
  };

  const updateSlide = (idx, field, val) =>
    setSlides(ss => ss.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  const deleteSlide = (idx) => { setSlides(ss => ss.filter((_, i) => i !== idx)); if (editIdx === idx) setEditIdx(null); };
  const moveSlide  = (idx, dir) => {
    const next = idx + dir;
    if (next < 0 || next >= slides.length) return;
    setSlides(ss => { const c = [...ss]; [c[idx], c[next]] = [c[next], c[idx]]; return c; });
    setEditIdx(next);
  };

  const handleExport = async () => {
    setExporting(true);
    try { await exportPPTX(title, author, slides, theme); }
    finally { setExporting(false); }
  };

  // ── START PHASE ─────────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <div className="min-h-screen bg-violet-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25">
              <FileText size={26} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">PPT Generator</h1>
            <p className="text-gray-500 dark:text-slate-400">Create research presentations in seconds</p>
          </div>

          {activeProject && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800">
              <FolderOpen size={13} className="text-violet-500 shrink-0" />
              <span className="text-xs text-violet-700 dark:text-violet-300 font-medium">Project context:</span>
              <span className="text-xs text-violet-600 dark:text-violet-400 truncate">{activeProject.title}</span>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm mb-4">
            <label className="text-sm font-medium text-gray-700 dark:text-white mb-2 block">Presentation topic or title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startWithAI()}
              placeholder="e.g. Impact of LLMs on Scientific Literature Review"
              autoFocus
              className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 mb-5"
            />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={startWithAI} disabled={!title.trim() || startLoading}
                className="group flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all disabled:opacity-50">
                {startLoading
                  ? <Loader2 size={28} className="text-violet-500 animate-spin" />
                  : <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                      <Sparkles size={22} className="text-white" />
                    </div>
                }
                <div className="text-center">
                  <p className="text-sm font-bold text-violet-700 dark:text-violet-300">Generate with AI</p>
                  <p className="text-xs text-violet-500 dark:text-violet-400 mt-0.5">Full deck from your topic</p>
                </div>
              </button>

              <button onClick={() => { setSlides(getDefaultDeck(title)); setPhase('editor'); }} disabled={!title.trim()}
                className="group flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600 transition-all disabled:opacity-50">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-400 to-slate-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Edit3 size={22} className="text-white" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-700 dark:text-white">Build Manually</p>
                  <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">Start with a template</p>
                </div>
              </button>
            </div>
          </div>

          {(documents.length > 0 || gaps.length > 0) && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Brain size={11} /> AI will use your research data
              </p>
              <div className="space-y-1.5">
                {documents.slice(0, 3).map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                    <BookOpen size={11} className="text-blue-400 shrink-0" />
                    <span className="truncate">{d.title || d.name}</span>
                  </div>
                ))}
                {gaps.slice(0, 2).map(g => (
                  <div key={g.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                    <Lightbulb size={11} className="text-amber-400 shrink-0" />
                    <span className="truncate">{g.title || g.gap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ── EDITOR PHASE ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-violet-50 dark:bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header bar */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setPhase('start')}
            className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors">
            <ChevronUp size={14} style={{ transform: 'rotate(-90deg)' }} />
          </button>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Presentation title..."
            className="flex-1 text-xl font-bold text-gray-900 dark:text-white bg-transparent border-0 outline-none placeholder-gray-300 dark:placeholder-slate-600" />
          <div className="flex gap-2 shrink-0">
            <Button onClick={() => setPreview(p => !p)} variant="outline"
              className="rounded-xl border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 dark:hover:bg-slate-800">
              <Eye size={14} className="mr-1.5" /> {preview ? 'Edit' : 'Preview'}
            </Button>
            <Button onClick={handleExport} disabled={exporting || slides.length === 0}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white hover:opacity-90 rounded-xl">
              {exporting ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Download size={14} className="mr-1.5" />}
              Download .pptx
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 shadow-sm">
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Author</label>
              <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Your name"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-violet-400" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <LayoutTemplate size={12} /> Theme
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map(t => (
                  <button key={t.id} onClick={() => setTheme(t)}
                    className={cn('rounded-xl border-2 overflow-hidden text-left transition-all',
                      theme.id === t.id ? 'border-violet-500 shadow-sm' : 'border-gray-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700')}>
                    <div className={`h-8 bg-gradient-to-br ${t.preview}`} />
                    <p className="text-xs font-semibold text-gray-800 dark:text-white px-2 py-1">{t.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {activeProject && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Brain size={12} /> AI Context
                </h3>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-slate-200">
                    <FolderOpen size={11} className="text-violet-400 shrink-0" />
                    <span className="truncate">{activeProject.title}</span>
                  </div>
                  {documents.slice(0, 3).map(d => (
                    <div key={d.id} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                      <BookOpen size={10} className="text-blue-400 shrink-0" />
                      <span className="truncate">{d.title || d.name}</span>
                    </div>
                  ))}
                  {gaps.slice(0, 2).map(g => (
                    <div key={g.id} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                      <Lightbulb size={10} className="text-amber-400 shrink-0" />
                      <span className="truncate">{g.title || g.gap}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-violet-500">{slides.length}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Slides</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-fuchsia-500">
                    {slides.reduce((a, s) => a + (s.body?.split('\n').filter(Boolean).length || 0), 0)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Bullets</p>
                </div>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="lg:col-span-2">
            {preview ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                  Preview · {slides.length} slides · {theme.label} theme
                </p>
                {slides.map((slide, idx) => (
                  <motion.div key={slide.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    className="rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm" style={{ background: theme.bg }}>
                    <div className="h-1" style={{ background: theme.accent }} />
                    <div className={cn('p-5', slide.type === 'section' ? 'text-center py-10' : '')}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono opacity-25" style={{ color: theme.text }}>{String(idx + 1).padStart(2, '0')}</span>
                        <Badge className="text-xs border-0" style={{ background: `${theme.accent}33`, color: theme.accent }}>{slide.type}</Badge>
                      </div>
                      <h3 className={cn('font-bold mb-2', slide.type === 'title' ? 'text-2xl text-center' : 'text-base')} style={{ color: theme.text }}>{slide.title}</h3>
                      {slide.body && <div className="space-y-1">{slide.body.split('\n').filter(Boolean).map((l, li) => <p key={li} className="text-xs opacity-75" style={{ color: theme.text }}>{l}</p>)}</div>}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div>
                <AddSlideButton
                  onAddAI={() => { setAiModal({ insertAt: 0 }); setAiPrompt(''); }}
                  onAddManual={() => addSlideManual(0)}
                />
                {slides.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 dark:text-slate-500">
                    <FileText size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No slides yet — click + above to add your first slide</p>
                  </div>
                ) : (
                  slides.map((slide, idx) => (
                    <div key={slide.id}>
                      <SlideTile
                        slide={slide} theme={theme} index={idx} total={slides.length}
                        isEditing={editIdx === idx}
                        onToggle={() => setEditIdx(editIdx === idx ? null : idx)}
                        onUpdate={(f, v) => updateSlide(idx, f, v)}
                        onMove={dir => moveSlide(idx, dir)}
                        onDelete={() => deleteSlide(idx)}
                      />
                      <AddSlideButton
                        onAddAI={() => { setAiModal({ insertAt: idx + 1 }); setAiPrompt(''); }}
                        onAddManual={() => addSlideManual(idx + 1)}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI generate slide modal */}
      <AnimatePresence>
        {aiModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Generate slide with AI</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Describe what you want on this slide</p>
                  </div>
                </div>
                <button onClick={() => { setAiModal(null); setAiPrompt(''); }} className="text-gray-400 hover:text-gray-700 dark:hover:text-white"><X size={18} /></button>
              </div>

              {activeProject && (
                <div className="mb-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 text-xs text-violet-600 dark:text-violet-400">
                  <Brain size={11} /> Using context from <strong className="ml-0.5">{activeProject.title}</strong>
                </div>
              )}

              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addSlideAI(aiModal.insertAt)}
                placeholder="e.g. Key findings from my methodology, or limitations of the study..."
                rows={4} autoFocus
                className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400 resize-none mb-4" />

              <div className="flex gap-3">
                <Button onClick={() => { setAiModal(null); setAiPrompt(''); }} variant="outline"
                  className="flex-1 rounded-xl border-gray-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  Cancel
                </Button>
                <Button onClick={() => addSlideAI(aiModal.insertAt)} disabled={!aiPrompt.trim() || aiGenerating}
                  className="flex-1 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white hover:opacity-90 rounded-xl">
                  {aiGenerating ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Sparkles size={14} className="mr-1.5" />}
                  Generate Slide
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
