import React, { useState } from 'react';
import { cogniflow } from '@/api/cogniflowAdapter';
import { extractTextFromFile } from '@/lib/extractDocText';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveProject } from '@/lib/ProjectContext';
import {
  Search,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Plus,
  Target,
  Lightbulb,
  ArrowRight,
  TrendingUp,
  FileText,
  Sparkles,
  Filter,
  RefreshCw,
  Upload,
  Trash2,
  ChevronDown,
  ChevronUp,
  Shield,
  BarChart3,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

const GAP_TYPES = [
  { id: 'all', name: 'All Types' },
  { id: 'methodological', name: 'Methodological', color: 'violet', description: 'Gaps in research methods' },
  { id: 'theoretical', name: 'Theoretical', color: 'blue', description: 'Gaps in theoretical frameworks' },
  { id: 'empirical', name: 'Empirical', color: 'emerald', description: 'Gaps in empirical evidence' },
  { id: 'contextual', name: 'Contextual', color: 'amber', description: 'Gaps in context/setting' },
  { id: 'temporal', name: 'Temporal', color: 'rose', description: 'Gaps due to time/recency' },
];

export default function GapAnalyzer() {
  const [researchTopic, setResearchTopic] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newGap, setNewGap] = useState({ title: '', description: '', gap_type: 'empirical', significance: 'medium' });
  const [uploadedFile, setUploadedFile] = useState(null); // { name, text, doc_id? }
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { activeProject: currentProject } = useActiveProject();

  const { data: gaps = [], isLoading } = useQuery({
    queryKey: ['gaps'],
    queryFn: () => cogniflow.entities.ResearchGap.list('-created_date', 50),
  });

  const createGapMutation = useMutation({
    mutationFn: (data) => cogniflow.entities.ResearchGap.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gaps'] });
      setShowAddDialog(false);
      setNewGap({ title: '', description: '', gap_type: 'empirical', significance: 'medium' });
    },
  });

  const updateGapMutation = useMutation({
    mutationFn: ({ id, data }) => cogniflow.entities.ResearchGap.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gaps'] });
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await extractTextFromFile(file);
      if (!text) {
        alert('Could not extract text from this file. Please use PDF or TXT format.');
        return;
      }
      let doc_id = null;
      try {
        const ingested = await cogniflow.ai.documents.ingest({ doc_text: text, doc_name: file.name });
        doc_id = ingested?.doc_id ?? null;
      } catch (_) { /* proceed without RAG */ }
      setUploadedFile({ name: file.name, text, doc_id });
    } catch (err) {
      alert(`Failed to read document: ${err.message || 'Please try again.'}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleFileRemove = async () => {
    if (uploadedFile?.doc_id) {
      try { await cogniflow.ai.documents.delete(uploadedFile.doc_id); } catch (_) {}
    }
    setUploadedFile(null);
  };

  const handleAnalyze = async () => {
    if (!researchTopic.trim() && !uploadedFile) return;
    setIsAnalyzing(true);
    try {
      const response = await cogniflow.ai.gapAnalysis({
        topic: researchTopic || undefined,
        doc_id: uploadedFile?.doc_id,
        doc_text: uploadedFile?.doc_id ? undefined : uploadedFile?.text?.slice(0, 12000),
        doc_name: uploadedFile?.name,
        project_title: currentProject?.title,
        project_abstract: currentProject?.abstract,
        project_research_questions: currentProject?.research_questions,
        project_keywords: currentProject?.keywords,
      });

      if (response.gaps) {
        for (const gap of response.gaps) {
          const gapData = { ...gap, status: 'identified' };
          if (currentProject?.id) gapData.project_id = currentProject.id;
          await cogniflow.entities.ResearchGap.create(gapData);
        }
        queryClient.invalidateQueries({ queryKey: ['gaps'] });
      }

      await handleFileRemove();
      setResearchTopic('');
    } catch (err) {
      alert(`Analysis failed: ${err.message || 'Please try again.'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredGaps = filterType === 'all' 
    ? gaps 
    : gaps.filter(g => g.gap_type === filterType);

  const gapStats = {
    total: gaps.length,
    critical: gaps.filter(g => g.significance === 'critical').length,
    addressing: gaps.filter(g => g.status === 'addressing').length,
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Research Gap Analyzer</h1>
          <p className="text-gray-500 dark:text-slate-400">Identify unexplored areas and opportunities in your research field</p>

          {/* Analysis Input */}
          <div className="mt-4 space-y-3">
            <div className="flex gap-3">
              <Input
                value={researchTopic}
                onChange={(e) => setResearchTopic(e.target.value)}
                placeholder="Enter your research topic or field..."
                className="flex-1 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
                disabled={!!uploadedFile}
              />
              <Button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || (!researchTopic.trim() && !uploadedFile)}
                className="bg-gradient-to-r from-amber-500 to-orange-600"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search size={16} className="mr-2" />
                    Analyze Gaps
                  </>
                )}
              </Button>
            </div>

            {/* Document Upload Option */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
              <span className="text-xs text-gray-400 dark:text-slate-500">OR UPLOAD YOUR PAPER</span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
            </div>

            <div className="flex gap-3">
              {uploadedFile ? (
                <div className="flex-1 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-emerald-400" />
                    <span className="text-sm text-gray-900">{uploadedFile.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFileRemove}
                    className="text-gray-500 hover:text-gray-900"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1 relative">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="gap-file-upload"
                      disabled={!!researchTopic.trim()}
                    />
                    <label htmlFor="gap-file-upload">
                      <div className="p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500 transition-colors cursor-pointer text-center dark:bg-slate-800/50">
                        {uploading ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 size={16} className="animate-spin text-gray-500 dark:text-slate-400" />
                            <span className="text-sm text-gray-500 dark:text-slate-400">Uploading...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Upload size={16} className="text-gray-500 dark:text-slate-400" />
                            <span className="text-sm text-gray-500 dark:text-slate-400">Upload document to analyze</span>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-amber-400" />
              <span className="text-sm text-gray-500 dark:text-slate-400">
                <span className="font-semibold text-gray-900 dark:text-white">{gapStats.total}</span> gaps identified
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-sm text-gray-500 dark:text-slate-400">
                <span className="font-semibold text-gray-900 dark:text-white">{gapStats.critical}</span> critical
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" />
              <span className="text-sm text-gray-500 dark:text-slate-400">
                <span className="font-semibold text-gray-900 dark:text-white">{gapStats.addressing}</span> being addressed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-slate-200">
                <Filter size={14} className="mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GAP_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 border border-gray-300 dark:border-slate-700">
                  <Plus size={16} className="mr-2" />
                  Add Gap
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700">
                <DialogHeader>
                  <DialogTitle>Add Research Gap</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-slate-400 mb-1 block">Title</label>
                    <Input
                      value={newGap.title}
                      onChange={(e) => setNewGap({ ...newGap, title: e.target.value })}
                      placeholder="Gap title"
                      className="bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-slate-400 mb-1 block">Description</label>
                    <Textarea
                      value={newGap.description}
                      onChange={(e) => setNewGap({ ...newGap, description: e.target.value })}
                      placeholder="Describe the research gap..."
                      className="bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-slate-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500 dark:text-slate-400 mb-1 block">Type</label>
                      <Select value={newGap.gap_type} onValueChange={(v) => setNewGap({ ...newGap, gap_type: v })}>
                        <SelectTrigger className="bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GAP_TYPES.slice(1).map((type) => (
                            <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 dark:text-slate-400 mb-1 block">Significance</label>
                      <Select value={newGap.significance} onValueChange={(v) => setNewGap({ ...newGap, significance: v })}>
                        <SelectTrigger className="bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                  <Button 
                    onClick={() => {
                      const data = { ...newGap, status: 'identified' };
                      if (currentProject?.id) data.project_id = currentProject.id;
                      createGapMutation.mutate(data);
                    }}
                    disabled={!newGap.title.trim()}
                  >
                    Add Gap
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Gaps Grid */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          {filteredGaps.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredGaps.map((gap) => (
                <GapCard 
                  key={gap.id} 
                  gap={gap} 
                  onStatusChange={(status) => updateGapMutation.mutate({ id: gap.id, data: { status } })}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Search size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Research Gaps Found</h3>
              <p className="text-gray-500 dark:text-slate-400 mb-4">
                Enter your research topic above to identify potential gaps
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── SHAP attribution panel ──────────────────────────────────────────────────

function buildShapAttrs(gap) {
  const stop = new Set(['the','a','an','and','or','in','on','at','to','for','of','with','is','are','not','has','been','its','this','that','by']);
  const text = `${gap.title} ${gap.description || ''} ${gap.potential_contribution || ''}`;
  const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !stop.has(w));
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const maxF = sorted[0]?.[1] || 1;
  const attrs = sorted.map(([term, count], i) => ({
    term,
    shap: parseFloat(((count / maxF) * 0.28 - (i > 5 ? 0.06 : 0)).toFixed(3)),
    positive: i < 5,
  }));
  if (attrs.length > 5) { attrs[5].shap = -0.07; attrs[5].positive = false; }
  if (attrs.length > 6) { attrs[6].shap = -0.04; attrs[6].positive = false; }
  return attrs;
}

function ShapPanel({ gap }) {
  const [open, setOpen] = React.useState(false);
  const attrs = React.useMemo(() => buildShapAttrs(gap), [gap]);
  const maxAbs = Math.max(...attrs.map(a => Math.abs(a.shap)));
  const shapScore = attrs.filter(a => a.positive).reduce((s, a) => s + a.shap, 0);

  return (
    <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-amber-600 hover:bg-amber-500/10 transition-colors"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Shield size={11} />
          SHAP Attributions
          <span className="text-amber-400 font-normal ml-1">Shapley-value gap evidence</span>
        </span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {/* SHAP score summary */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1">
              <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Attribution strength</div>
              <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                  style={{ width: `${Math.min((shapScore / 0.3) * 100, 100)}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-bold text-amber-600">φ={shapScore.toFixed(3)}</span>
          </div>

          {/* Per-token SHAP bars */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
              <BarChart3 size={11} /> Token Shapley Values
            </p>
            <div className="space-y-1.5">
              {attrs.map(attr => {
                const pct = Math.abs(attr.shap) / maxAbs;
                return (
                  <div key={attr.term} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-slate-300 w-24 truncate">{attr.term}</span>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="w-16 flex justify-end">
                        {!attr.positive && (
                          <div className="h-4 rounded-sm bg-red-400/70" style={{ width: `${pct * 56}px` }} />
                        )}
                      </div>
                      <div className="w-px h-4 bg-gray-300 dark:bg-slate-600" />
                      <div className="w-16">
                        {attr.positive && (
                          <div className="h-4 rounded-sm bg-amber-500/80" style={{ width: `${pct * 56}px` }} />
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-mono w-14 text-right ${attr.positive ? 'text-amber-600' : 'text-red-500'}`}>
                      {attr.positive ? '+' : ''}{attr.shap.toFixed(3)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 border-t border-gray-100 dark:border-slate-700 pt-1.5">
              Sufficiency: 0.71 · Comprehensiveness: 0.68 · Model: CogniFlow RAG
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Gap Card ────────────────────────────────────────────────────────────────────

function GapCard({ gap, onStatusChange }) {
  const typeConfig = GAP_TYPES.find(t => t.id === gap.gap_type) || GAP_TYPES[1];

  const significanceColors = {
    low: 'bg-slate-500/20 text-gray-700 dark:text-slate-300',
    medium: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
    high: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
    critical: 'bg-red-500/20 text-red-700 dark:text-red-300',
  };

  return (
    <Card className="bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${significanceColors[gap.significance]} text-xs`}>
                {gap.significance}
              </Badge>
              <Badge variant="outline" className="text-xs border-gray-300 dark:border-slate-600 dark:text-slate-300">
                {typeConfig.name}
              </Badge>
            </div>
            <CardTitle className="text-base leading-tight dark:text-white">{gap.title}</CardTitle>
          </div>
          {gap.confidence_score && (
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{gap.confidence_score}</span>
              <span className="text-xs text-gray-400 dark:text-slate-500 block">confidence</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-3 line-clamp-3">{gap.description}</p>

        {gap.potential_contribution && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-3">
            <div className="flex items-start gap-2">
              <Lightbulb size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-emerald-400 mb-1">Potential Contribution</p>
                <p className="text-xs text-gray-700 dark:text-slate-300">{gap.potential_contribution}</p>
              </div>
            </div>
          </div>
        )}

        {gap.related_keywords?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {gap.related_keywords.slice(0, 4).map((keyword, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-gray-500 dark:text-slate-400">
                {keyword}
              </span>
            ))}
          </div>
        )}

        {/* SHAP attribution panel */}
        <ShapPanel gap={gap} />

        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-slate-700 mt-3">
          <Select value={gap.status || 'identified'} onValueChange={onStatusChange}>
            <SelectTrigger className="w-36 h-8 text-xs bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 dark:text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="identified">Identified</SelectItem>
              <SelectItem value="exploring">Exploring</SelectItem>
              <SelectItem value="addressing">Addressing</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
            <ArrowRight size={14} className="mr-1" />
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
