import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Download, Loader2, ChevronUp, ChevronDown,
  Sparkles, FileText, Eye, LayoutTemplate, X,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

const THEMES = [
  { id: 'academic', label: 'Academic',  desc: 'Conference-ready',  bg: '#1e1b4b', accent: '#7c3aed', text: '#ffffff', preview: 'from-indigo-900 to-violet-900' },
  { id: 'modern',   label: 'Modern',    desc: 'Bold & sleek',      bg: '#0f172a', accent: '#06b6d4', text: '#f1f5f9', preview: 'from-slate-900 to-cyan-900' },
  { id: 'light',    label: 'Light',     desc: 'Clean & minimal',   bg: '#ffffff', accent: '#7c3aed', text: '#1e1b4b', preview: 'from-gray-50 to-violet-100' },
  { id: 'nature',   label: 'Nature',    desc: 'Science & ecology', bg: '#052e16', accent: '#16a34a', text: '#f0fdf4', preview: 'from-emerald-950 to-green-900' },
];

const SLIDE_TYPES = [
  { id: 'title',   label: 'Title Slide' },
  { id: 'content', label: 'Content' },
  { id: 'section', label: 'Section Break' },
  { id: 'quote',   label: 'Quote' },
];

let _uid = 0;
const makeSlide = (title, body, type) => ({ id: ++_uid, type: type || 'content', title: title || '', body: body || '' });

const DEFAULT_SLIDES = [
  makeSlide('Title Slide', '', 'title'),
  makeSlide('Introduction', '• Background and motivation\n• Problem statement\n• Research objectives'),
  makeSlide('Literature Review', '• Key prior work\n• Identified gaps\n• Theoretical framework'),
  makeSlide('Methodology', '• Research design\n• Data collection approach\n• Analysis methods'),
  makeSlide('Results', '• Key finding 1\n• Key finding 2\n• Supporting evidence'),
  makeSlide('Discussion', '• Interpretation of results\n• Implications\n• Limitations'),
  makeSlide('Conclusion', '• Summary of contributions\n• Future work\n• Acknowledgements'),
];

async function buildPPTX(title, author, slides, theme) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const prs = new PptxGenJS();
  prs.layout = 'LAYOUT_WIDE';
  prs.author = author || 'CogniFlow';
  prs.title  = title  || 'Research Presentation';

  const isDark    = theme.bg !== '#ffffff';
  const textHex   = isDark ? 'FFFFFF' : '1e1b4b';
  const accentHex = theme.accent.replace('#', '');
  const bgHex     = theme.bg.replace('#', '');
  const subtleHex = isDark ? 'cbd5e1' : '6b7280';

  slides.forEach((slide, idx) => {
    const sld = prs.addSlide();
    sld.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: bgHex } });
    sld.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.12, fill: { color: accentHex } });

    if (slide.type !== 'title' && idx > 0) {
      sld.addText(String(idx), { x: 11.8, y: 6.8, w: 0.5, h: 0.2, fontSize: 9, color: subtleHex, align: 'right' });
    }

    if (slide.type === 'title') {
      sld.addText(slide.title || prs.title, { x: 1, y: 2, w: 11, h: 1.2, fontSize: 40, bold: true, color: textHex, align: 'center' });
      if (author) sld.addText(author, { x: 1, y: 3.5, w: 11, h: 0.5, fontSize: 18, color: subtleHex, align: 'center' });
      sld.addShape(prs.ShapeType.rect, { x: 4.5, y: 4.2, w: 4, h: 0.05, fill: { color: accentHex } });

    } else if (slide.type === 'section') {
      sld.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: accentHex } });
      sld.addText(slide.title, { x: 1, y: 2.5, w: 11, h: 1.2, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center' });

    } else if (slide.type === 'quote') {
      sld.addText('"', { x: 0.5, y: 1, w: 1.5, h: 1.5, fontSize: 80, color: accentHex });
      sld.addText(slide.body || slide.title, { x: 1, y: 1.8, w: 11, h: 2.5, fontSize: 22, italic: true, color: textHex, align: 'center' });
      if (slide.title && slide.body) {
        sld.addText('— ' + slide.title, { x: 1, y: 4.5, w: 11, h: 0.4, fontSize: 14, color: subtleHex, align: 'center' });
      }

    } else {
      sld.addText(slide.title, { x: 0.5, y: 0.3, w: 12, h: 0.7, fontSize: 26, bold: true, color: textHex });
      sld.addShape(prs.ShapeType.rect, { x: 0.5, y: 1.1, w: 12, h: 0.03, fill: { color: accentHex } });
      const lines = (slide.body || '').split('\n').filter(Boolean);
      if (lines.length) {
        const bulletText = lines.map(l => ({
          text: l.replace(/^[•\-*]\s*/, ''),
          options: { bullet: true, fontSize: 18, color: textHex, paraSpaceAfter: 6 },
        }));
        sld.addText(bulletText, { x: 0.5, y: 1.3, w: 12, h: 4.8, valign: 'top' });
      }
    }
  });

  prs.writeFile({ fileName: (title || 'presentation').replace(/\s+/g, '_') + '.pptx' });
}

export default function PPTGenerator() {
  const [title, setTitle]     = useState('');
  const [author, setAuthor]   = useState('');
  const [theme, setTheme]     = useState(THEMES[0]);
  const [slides, setSlides]   = useState(DEFAULT_SLIDES);
  const [editIdx, setEditIdx] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [aiLoading, setAiLoading]   = useState(false);
  const [preview, setPreview]       = useState(false);

  const addSlide = () => {
    const s = makeSlide('New Slide', '• Point 1\n• Point 2\n• Point 3');
    setSlides(ss => [...ss, s]);
    setEditIdx(slides.length);
  };

  const removeSlide = (idx) => {
    setSlides(ss => ss.filter((_, i) => i !== idx));
    if (editIdx === idx) setEditIdx(null);
  };

  const move = (idx, dir) => {
    const next = idx + dir;
    if (next < 0 || next >= slides.length) return;
    setSlides(ss => { const c = [...ss]; [c[idx], c[next]] = [c[next], c[idx]]; return c; });
    setEditIdx(next);
  };

  const updateSlide = (idx, field, val) =>
    setSlides(ss => ss.map((s, i) => i === idx ? { ...s, [field]: val } : s));

  const aiExpand = async () => {
    if (!title.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/research-chat/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Generate a concise academic presentation outline for the research topic: "' + title + '". Return exactly 7 slides as a JSON array: [{title, body}] where body has 3-4 bullet points each starting with "•". Return ONLY the JSON array.',
          mode: 'general',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const raw  = data.response || data.message || '';
        const match = raw.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          setSlides([
            makeSlide(title, '', 'title'),
            ...parsed.map(p => makeSlide(p.title, p.body, 'content')),
          ]);
        }
      }
    } catch (_) {
      setSlides(ss => ss.map((s, i) => i === 0 ? { ...s, title } : s));
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownload = async () => {
    setGenerating(true);
    try { await buildPPTX(title, author, slides, theme); }
    finally { setGenerating(false); }
  };

  const typeBadge = (type) => cn(
    'text-xs border-0',
    type === 'title'   ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' :
    type === 'section' ? 'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-400'  :
    type === 'quote'   ? 'bg-rose-100   text-rose-700   dark:bg-rose-900/40   dark:text-rose-400'   :
    'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
  );

  return (
    <div className="min-h-screen bg-violet-50 dark:bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PPT Generator</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">Build and download research presentations as .pptx</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setPreview(p => !p)} variant="outline"
              className="rounded-xl border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 dark:hover:bg-slate-800">
              <Eye size={14} className="mr-1.5" />{preview ? 'Edit' : 'Preview'}
            </Button>
            <Button onClick={handleDownload} disabled={generating || slides.length === 0}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white hover:opacity-90 rounded-xl">
              {generating ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Download size={14} className="mr-1.5" />}
              Download .pptx
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-white mb-3 flex items-center gap-2">
                <FileText size={14} />Presentation Details
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Title</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="My Research Presentation"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Author</label>
                  <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Dr. Jane Smith"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400" />
                </div>
                <Button onClick={aiExpand} disabled={!title.trim() || aiLoading} variant="outline"
                  className="w-full rounded-xl border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-sm">
                  {aiLoading ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <Sparkles size={13} className="mr-1.5" />}
                  AI Generate Slides
                </Button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-white mb-3 flex items-center gap-2">
                <LayoutTemplate size={14} />Theme
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map(t => (
                  <button key={t.id} onClick={() => setTheme(t)}
                    className={cn('rounded-xl border-2 overflow-hidden transition-all text-left',
                      theme.id === t.id ? 'border-violet-500 shadow-md' : 'border-gray-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700')}>
                    <div className={cn('h-10 bg-gradient-to-br', t.preview)} />
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-semibold text-gray-800 dark:text-white">{t.label}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 leading-tight">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

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
                  <p className="text-xs text-gray-500 dark:text-slate-400">Bullet Points</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {preview ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                  Preview · {slides.length} slides · {theme.label} theme
                </p>
                {slides.map((slide, idx) => (
                  <motion.div key={slide.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm"
                    style={{ background: theme.bg }}>
                    <div className="h-1" style={{ background: theme.accent }} />
                    <div className={cn('p-5', slide.type === 'section' ? 'text-center py-8' : '')}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono opacity-40" style={{ color: theme.text }}>
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <Badge className="text-xs border-0" style={{ background: theme.accent + '33', color: theme.accent }}>
                          {slide.type}
                        </Badge>
                      </div>
                      <h3 className="text-base font-bold mb-2" style={{ color: theme.text }}>{slide.title}</h3>
                      {slide.body && slide.body.split('\n').filter(Boolean).map((line, li) => (
                        <p key={li} className="text-xs opacity-75" style={{ color: theme.text }}>{line}</p>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                    Slide Editor — {slides.length} slides
                  </p>
                  <Button onClick={addSlide} size="sm" variant="outline"
                    className="rounded-xl border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 dark:hover:bg-slate-800 text-xs">
                    <Plus size={12} className="mr-1" />Add Slide
                  </Button>
                </div>

                {slides.map((slide, idx) => {
                  const isOpen = editIdx === idx;
                  return (
                    <motion.div key={slide.id} layout
                      className={cn('bg-white dark:bg-slate-900 rounded-2xl border transition-all shadow-sm',
                        isOpen ? 'border-violet-300 dark:border-violet-700' : 'border-gray-200 dark:border-slate-800')}>
                      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                        onClick={() => setEditIdx(isOpen ? null : idx)}>
                        <span className="text-xs font-mono text-gray-400 dark:text-slate-500 w-5 shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <Badge className={typeBadge(slide.type)}>{slide.type}</Badge>
                        <span className="flex-1 text-sm font-medium text-gray-800 dark:text-white truncate">
                          {slide.title || 'Untitled'}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                          <button onClick={() => move(idx, -1)} disabled={idx === 0}
                            className="p-1 text-gray-300 dark:text-slate-600 hover:text-gray-600 dark:hover:text-slate-300 disabled:opacity-30 transition-colors">
                            <ChevronUp size={14} />
                          </button>
                          <button onClick={() => move(idx, 1)} disabled={idx === slides.length - 1}
                            className="p-1 text-gray-300 dark:text-slate-600 hover:text-gray-600 dark:hover:text-slate-300 disabled:opacity-30 transition-colors">
                            <ChevronDown size={14} />
                          </button>
                          <button onClick={() => removeSlide(idx)}
                            className="p-1 text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                            <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-slate-800 pt-3">
                              <div className="flex gap-3">
                                <div className="flex-1">
                                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Slide Title</label>
                                  <input value={slide.title} onChange={e => updateSlide(idx, 'title', e.target.value)}
                                    placeholder="Slide title..."
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-violet-400" />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Type</label>
                                  <select value={slide.type} onChange={e => updateSlide(idx, 'type', e.target.value)}
                                    className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-violet-400">
                                    {SLIDE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                  </select>
                                </div>
                              </div>
                              {slide.type !== 'title' && (
                                <div>
                                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">
                                    Content{slide.type === 'content' ? ' — one bullet per line' : ''}
                                  </label>
                                  <textarea value={slide.body} onChange={e => updateSlide(idx, 'body', e.target.value)}
                                    placeholder={slide.type === 'content' ? '• Key point\n• Another point\n• Supporting detail' : 'Enter text...'}
                                    rows={5}
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-violet-400 resize-none font-mono" />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                <button onClick={addSlide}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-500 transition-colors text-sm flex items-center justify-center gap-2">
                  <Plus size={14} />Add Slide
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
