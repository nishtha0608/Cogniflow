import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, BookOpen, ExternalLink, Copy, Check, FileText,
  Quote, Star, Loader2, AlertCircle, Download, ChevronLeft, ChevronRight,
  FolderPlus, CheckCircle2,
} from 'lucide-react';
import { firestoreEntities } from '@/api/firestoreEntities';

const API_BASE = 'http://localhost:8000';

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('cogniflow_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers };
  const r = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function CopyButton({ text, small }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size={small ? 'sm' : 'default'} onClick={copy} className="gap-1 text-gray-500 hover:text-gray-900">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

function CitationModal({ paper, onClose }) {
  const [style, setStyle] = useState('apa');
  const [citation, setCitation] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async (s) => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/papers/cite', {
        method: 'POST',
        body: JSON.stringify({ paper, style: s }),
      });
      setCitation(data.citation);
    } catch {
      setCitation('Failed to generate citation.');
    } finally {
      setLoading(false);
    }
  }, [paper]);

  const handleStyle = (s) => { setStyle(s); generate(s); };

  // Generate on mount
  useState(() => { generate('apa'); });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-white border-gray-300 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <Quote className="w-4 h-4 text-violet-400" /> Cite Paper
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 line-clamp-2">{paper.title}</p>
        <div className="flex gap-2 mt-2">
          {['apa', 'mla', 'bibtex'].map(s => (
            <Button key={s} size="sm" variant={style === s ? 'default' : 'outline'}
              className={style === s ? 'bg-violet-600 hover:bg-violet-700' : 'border-gray-300 text-gray-700'}
              onClick={() => handleStyle(s)}>
              {s.toUpperCase()}
            </Button>
          ))}
        </div>
        <div className="relative">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            </div>
          ) : (
            <pre className="bg-gray-100 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
              {citation}
            </pre>
          )}
          {citation && !loading && (
            <div className="flex justify-end mt-2">
              <CopyButton text={citation} small />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddToProjectModal({ paper, onClose }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState({});

  useEffect(() => {
    firestoreEntities.ResearchProject.list('-updated_date', 50)
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const addToProject = async (project) => {
    setSaving(project.id);
    try {
      await firestoreEntities.Citation.create({
        project_id: project.id,
        openalex_id: paper.id,
        doi: paper.doi || '',
        title: paper.title,
        authors: paper.authors || [],
        year: paper.year || null,
        journal: paper.journal || '',
        abstract: paper.abstract || '',
        cited_by_count: paper.cited_by_count || 0,
        is_open_access: paper.is_open_access || false,
        pdf_url: paper.pdf_url || '',
        concepts: paper.concepts || [],
      });
      setSaved(s => ({ ...s, [project.id]: true }));
    } catch (e) {
      console.error('Failed to save citation', e);
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-white border-gray-300 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-violet-400" /> Add to Project
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{paper.title}</p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No projects yet. Create one first.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {projects.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-100 border border-gray-300">
                <span className="text-sm text-gray-800 truncate">{p.title}</span>
                {saved[p.id] ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Added
                  </span>
                ) : (
                  <Button size="sm" variant="outline"
                    className="border-violet-600 text-violet-400 hover:bg-violet-600 hover:text-gray-900 shrink-0 h-7 text-xs"
                    disabled={saving === p.id}
                    onClick={() => addToProject(p)}>
                    {saving === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaperCard({ paper, onCite, onSave, saved, onAddToProject }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="bg-gray-100 border-gray-300 hover:border-violet-500/40 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-gray-900 font-medium text-sm leading-snug line-clamp-2 mb-2">
              {paper.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2">
              {paper.authors?.length > 0 && (
                <span>{paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''}</span>
              )}
              {paper.year && <Badge variant="outline" className="border-gray-300 text-gray-500 text-xs py-0">{paper.year}</Badge>}
              {paper.journal && <span className="text-violet-400 truncate max-w-[200px]">{paper.journal}</span>}
              {paper.cited_by_count > 0 && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />{paper.cited_by_count.toLocaleString()} citations
                </span>
              )}
              {paper.is_open_access && <Badge className="bg-emerald-900/50 text-emerald-400 border-emerald-700 text-xs py-0">Open Access</Badge>}
            </div>

            {paper.abstract && (
              <p className={`text-xs text-gray-500 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
                {paper.abstract}
              </p>
            )}
            {paper.abstract && paper.abstract.length > 150 && (
              <button onClick={() => setExpanded(e => !e)} className="text-xs text-violet-400 hover:text-violet-300 mt-1">
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}

            {paper.concepts?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {paper.concepts.slice(0, 4).map(c => (
                  <Badge key={c} variant="outline" className="text-xs py-0 border-gray-300 text-gray-400">{c}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-300">
          <Button size="sm" variant="ghost" className="text-gray-500 hover:text-violet-300 gap-1 h-7 px-2"
            onClick={() => onCite(paper)}>
            <Quote className="w-3.5 h-3.5" /> Cite
          </Button>
          <Button size="sm" variant="ghost"
            className={`gap-1 h-7 px-2 ${saved ? 'text-amber-400' : 'text-gray-500 hover:text-amber-300'}`}
            onClick={() => onSave(paper)}>
            <Star className="w-3.5 h-3.5" fill={saved ? 'currentColor' : 'none'} />
            {saved ? 'Saved' : 'Save'}
          </Button>
          {paper.doi && (
            <Button size="sm" variant="ghost" className="text-gray-500 hover:text-blue-300 gap-1 h-7 px-2" asChild>
              <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3.5 h-3.5" /> DOI
              </a>
            </Button>
          )}
          {paper.pdf_url && (
            <Button size="sm" variant="ghost" className="text-gray-500 hover:text-emerald-300 gap-1 h-7 px-2" asChild>
              <a href={paper.pdf_url} target="_blank" rel="noreferrer">
                <Download className="w-3.5 h-3.5" /> PDF
              </a>
            </Button>
          )}
          {paper.doi && (
            <CopyButton text={`https://doi.org/${paper.doi}`} small />
          )}
          <Button size="sm" variant="ghost" className="text-gray-500 hover:text-violet-300 gap-1 h-7 px-2 ml-auto"
            onClick={() => onAddToProject(paper)}>
            <FolderPlus className="w-3.5 h-3.5" /> Add to Project
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PaperSearch() {
  const [query, setQuery] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [citingPaper, setCitingPaper] = useState(null);
  const [addingPaper, setAddingPaper] = useState(null);
  const [savedPapers, setSavedPapers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cogniflow_saved_papers') || '[]'); } catch { return []; }
  });
  const [activeTab, setActiveTab] = useState('search');
  const [doiInput, setDoiInput] = useState('');
  const [doiResult, setDoiResult] = useState(null);
  const [doiLoading, setDoiLoading] = useState(false);
  const [doiError, setDoiError] = useState('');

  const PER_PAGE = 20;
  const totalPages = Math.ceil(total / PER_PAGE);

  const runSearch = async (p = 1) => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ q: query, page: p, per_page: PER_PAGE });
      if (yearFrom && yearFrom !== 'any') params.set('year_from', yearFrom);
      if (yearTo && yearTo !== 'any') params.set('year_to', yearTo);
      const data = await apiFetch(`/api/papers/search?${params}`);
      setResults(data.results || []);
      setTotal(data.total || 0);
      setPage(p);
    } catch (e) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const lookupDoi = async () => {
    if (!doiInput.trim()) return;
    setDoiLoading(true);
    setDoiError('');
    setDoiResult(null);
    try {
      const data = await apiFetch(`/api/papers/doi?doi=${encodeURIComponent(doiInput.trim())}`);
      setDoiResult(data);
    } catch {
      setDoiError('Paper not found. Check the DOI and try again.');
    } finally {
      setDoiLoading(false);
    }
  };

  const savePaper = (paper) => {
    setSavedPapers(prev => {
      const exists = prev.find(p => p.id === paper.id);
      const updated = exists ? prev.filter(p => p.id !== paper.id) : [...prev, paper];
      localStorage.setItem('cogniflow_saved_papers', JSON.stringify(updated));
      return updated;
    });
  };

  const isSaved = (paper) => savedPapers.some(p => p.id === paper.id);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 35 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-violet-50 text-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Paper Search</h1>
              <p className="text-sm text-gray-500">250M+ papers via OpenAlex</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-100 border-gray-300 mb-6">
            <TabsTrigger value="search" className="data-[state=active]:bg-violet-600">Search</TabsTrigger>
            <TabsTrigger value="doi" className="data-[state=active]:bg-violet-600">DOI Lookup</TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-violet-600">
              Saved {savedPapers.length > 0 && <Badge className="ml-1.5 bg-violet-700 text-xs py-0">{savedPapers.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Search tab */}
          <TabsContent value="search">
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Search papers, topics, authors…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runSearch(1)}
                    className="pl-9 bg-gray-100 border-gray-300 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <Button onClick={() => runSearch(1)} disabled={loading || !query.trim()}
                  className="bg-violet-600 hover:bg-violet-700 gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </Button>
              </div>

              <div className="flex gap-2">
                <Select value={yearFrom} onValueChange={setYearFrom}>
                  <SelectTrigger className="w-36 bg-gray-100 border-gray-300 text-gray-700">
                    <SelectValue placeholder="From year" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-100 border-gray-300">
                    <SelectItem value="any">Any year</SelectItem>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={yearTo} onValueChange={setYearTo}>
                  <SelectTrigger className="w-36 bg-gray-100 border-gray-300 text-gray-700">
                    <SelectValue placeholder="To year" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-100 border-gray-300">
                    <SelectItem value="any">Any year</SelectItem>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            {total > 0 && (
              <p className="text-xs text-gray-400 mb-4">{total.toLocaleString()} results</p>
            )}

            <div className="space-y-3">
              {results.map(paper => (
                <PaperCard key={paper.id} paper={paper}
                  onCite={setCitingPaper} onSave={savePaper} saved={isSaved(paper)} onAddToProject={setAddingPaper} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button variant="outline" size="sm" disabled={page <= 1}
                  onClick={() => runSearch(page - 1)}
                  className="border-gray-300 text-gray-700 gap-1">
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages}
                  onClick={() => runSearch(page + 1)}
                  className="border-gray-300 text-gray-700 gap-1">
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {results.length === 0 && !loading && !error && (
              <div className="text-center py-20 text-gray-400">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Search 250M+ academic papers</p>
                <p className="text-xs mt-1">Try a topic, author name, or journal</p>
              </div>
            )}
          </TabsContent>

          {/* DOI tab */}
          <TabsContent value="doi">
            <div className="flex gap-2 mb-6">
              <Input
                placeholder="e.g. 10.1038/s41586-021-03819-2"
                value={doiInput}
                onChange={e => setDoiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookupDoi()}
                className="bg-gray-100 border-gray-300 text-gray-900 placeholder:text-gray-400"
              />
              <Button onClick={lookupDoi} disabled={doiLoading || !doiInput.trim()}
                className="bg-violet-600 hover:bg-violet-700 gap-2">
                {doiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Lookup
              </Button>
            </div>
            {doiError && (
              <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
                <AlertCircle className="w-4 h-4" /> {doiError}
              </div>
            )}
            {doiResult && (
              <PaperCard paper={doiResult} onCite={setCitingPaper} onSave={savePaper} saved={isSaved(doiResult)} />
            )}
            {!doiResult && !doiLoading && !doiError && (
              <div className="text-center py-20 text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Enter a DOI to fetch paper details</p>
              </div>
            )}
          </TabsContent>

          {/* Saved tab */}
          <TabsContent value="saved">
            {savedPapers.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No saved papers yet</p>
                <p className="text-xs mt-1">Star papers from search results to save them here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedPapers.map(paper => (
                  <PaperCard key={paper.id} paper={paper}
                    onCite={setCitingPaper} onSave={savePaper} saved />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {citingPaper && <CitationModal paper={citingPaper} onClose={() => setCitingPaper(null)} />}
      {addingPaper && <AddToProjectModal paper={addingPaper} onClose={() => setAddingPaper(null)} />}
    </div>
  );
}
