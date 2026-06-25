import React, { useState, useEffect, useCallback } from 'react';
import { cogniflow } from '@/api/cogniflowClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveProject } from '@/lib/ProjectContext';
import {
  Save,
  FileText,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Image,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Download,
  Upload,
  Sparkles,
  Copy,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Plus,
  ChevronRight,
  Settings,
  Eye,
  Edit3,
  Loader2,
  FileCode,
  Type,
  Bot,
  ShieldCheck,
  X,
  Pencil,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import debounce from 'lodash/debounce';
import ReactMarkdown from 'react-markdown';

const DOCUMENT_SECTIONS = [
  { id: 'abstract', name: 'Abstract', order: 1 },
  { id: 'introduction', name: 'Introduction', order: 2 },
  { id: 'literature', name: 'Literature Review', order: 3 },
  { id: 'methodology', name: 'Methodology', order: 4 },
  { id: 'results', name: 'Results', order: 5 },
  { id: 'discussion', name: 'Discussion', order: 6 },
  { id: 'conclusion', name: 'Conclusion', order: 7 },
  { id: 'references', name: 'References', order: 8 },
];

const LATEX_TEMPLATES = {
  equation: '\\begin{equation}\n  \n\\end{equation}',
  figure: '\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.8\\textwidth]{filename}\n  \\caption{Caption}\n  \\label{fig:label}\n\\end{figure}',
  table: '\\begin{table}[h]\n  \\centering\n  \\begin{tabular}{|c|c|c|}\n    \\hline\n    Col 1 & Col 2 & Col 3 \\\\\n    \\hline\n  \\end{tabular}\n  \\caption{Caption}\n  \\label{tab:label}\n\\end{table}',
  citation: '\\cite{reference_key}',
  section: '\\section{Section Title}',
  subsection: '\\subsection{Subsection Title}',
};

export default function Writing() {
  const [activeDocument, setActiveDocument] = useState(null);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [viewMode, setViewMode] = useState('edit'); // 'edit', 'preview', 'split'
  const [activeSection, setActiveSection] = useState('introduction');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlagChecking, setIsPlagChecking] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isRephrasing, setIsRephrasing] = useState(false);
  const [applyResult, setApplyResult] = useState(null); // { citations_added, papers_count }
  const [plagiarismScore, setPlagiarismScore] = useState(null);
  const [briefReport, setBriefReport] = useState(null); // { type, ...fields }
  const [renamingDocId, setRenamingDocId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [createError, setCreateError] = useState(null);
  const queryClient = useQueryClient();
  const { activeProject } = useActiveProject();

  const { data: rawDocuments = [], isLoading } = useQuery({
    queryKey: ['documents', activeProject?.id],
    queryFn: () => cogniflow.entities.Document.list('-updated_date', 50),
  });

  const documents = rawDocuments
    .filter(d => !d.type || d.type === 'draft')
    .filter(d => activeProject?.id ? d.project_id === activeProject.id : !d.project_id);

  const createDocumentMutation = useMutation({
    mutationFn: (data) => cogniflow.entities.Document.create(data),
    onSuccess: (newDoc) => {
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setActiveDocument(newDoc);
      setContent(newDoc.content || '');
    },
    onError: (err) => {
      setCreateError(err.message || 'Failed to create document. Are you signed in?');
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: ({ id, data }) => cogniflow.entities.Document.update(id, data),
    onSuccess: () => {
      setLastSaved(new Date());
      setIsSaving(false);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  // Autosave with debounce
  const debouncedSave = useCallback(
    debounce((docId, newContent) => {
      if (docId) {
        setIsSaving(true);
        updateDocumentMutation.mutate({
          id: docId,
          data: { 
            content: newContent,
            word_count: countWords(newContent)
          }
        });
      }
    }, 2000),
    []
  );

  useEffect(() => {
    if (activeDocument && content !== activeDocument.content) {
      debouncedSave(activeDocument.id, content);
    }
  }, [content, activeDocument]);

  const countWords = (text) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const handleNewDocument = () => {
    setCreateError(null);
    const data = {
      title: `New Document - ${new Date().toLocaleDateString()}`,
      type: 'draft',
      content: '',
    };
    if (activeProject?.id) data.project_id = activeProject.id;
    createDocumentMutation.mutate(data);
  };

  const handleAIImprove = async () => {
    if (!content.trim()) return;
    setIsAnalyzing(true);
    setApplyResult(null);
    try {
      const improveRes = await cogniflow.ai.writing.improve({
        text: content.slice(0, 5000),
        doc_id: activeDocument?.id,
      });
      const suggestions = improveRes.suggestions || [];
      if (!suggestions.length) return;
      setAiSuggestions(suggestions);
      setIsApplying(true);
      const applyRes = await cogniflow.ai.writing.applyImprovements({
        text: content.slice(0, 5000),
        suggestions,
        citation_style: 'apa',
      });
      if (applyRes.improved_text) {
        setContent(applyRes.improved_text);
        setAiSuggestions([]);
        setApplyResult({
          citations_added: applyRes.citations_added || 0,
          papers_count: applyRes.papers_used?.length || 0,
        });
      }
    } catch (e) {
      console.error('AI Improve failed:', e);
    } finally {
      setIsAnalyzing(false);
      setIsApplying(false);
    }
  };

  const handlePlagiarismCheck = async () => {
    if (!content.trim()) return;
    setIsPlagChecking(true);
    setBriefReport(null);
    try {
      const response = await cogniflow.ai.writing.plagiarism({
        text: content.slice(0, 5000),
        doc_id: activeDocument?.id,
      });
      setPlagiarismScore(response);
      setBriefReport({
        type: 'plagiarism',
        originality_score: response.originality_score,
        concerns_count: response.concerns?.length ?? 0,
        summary: response.summary,
      });
    } catch (e) {
      console.error('Plagiarism check failed:', e);
    } finally {
      setIsPlagChecking(false);
    }
  };

  const handleHumanize = async () => {
    if (!content.trim()) return;
    setIsHumanizing(true);
    setBriefReport(null);
    try {
      const response = await cogniflow.ai.writing.humanize({
        text: content.slice(0, 5000),
        doc_id: activeDocument?.id,
      });
      setBriefReport({
        type: 'humanize',
        ai_risk_before: response.ai_risk_before,
        ai_risk_after: response.ai_risk_after,
        changes: response.changes ?? [],
        humanized_text: response.humanized_text,
      });
    } catch (e) {
      console.error('Humanize failed:', e);
    } finally {
      setIsHumanizing(false);
    }
  };

  const handleApplyImprovements = async () => {
    if (!content.trim() || !aiSuggestions.length) return;
    setIsApplying(true);
    setApplyResult(null);
    try {
      const response = await cogniflow.ai.writing.applyImprovements({
        text: content.slice(0, 5000),
        suggestions: aiSuggestions,
        citation_style: 'apa',
      });
      if (response.improved_text) {
        setContent(response.improved_text);
        setAiSuggestions([]);
        setApplyResult({
          citations_added: response.citations_added || 0,
          papers_count: response.papers_used?.length || 0,
        });
      }
    } catch (e) {
      console.error('Apply improvements failed:', e);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRephraseAll = async () => {
    if (!content.trim() || !plagiarismScore?.concerns?.length) return;
    setIsRephrasing(true);
    try {
      const response = await cogniflow.ai.writing.rephraseConcerns({
        text: content.slice(0, 5000),
        concerns: plagiarismScore.concerns,
      });
      if (response.rephrased_text) {
        setContent(response.rephrased_text);
        setPlagiarismScore(null);
        setBriefReport(null);
      }
    } catch (e) {
      console.error('Rephrase failed:', e);
    } finally {
      setIsRephrasing(false);
    }
  };

  const handleRenameSubmit = (docId) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== documents.find(d => d.id === docId)?.title) {
      updateDocumentMutation.mutate({ id: docId, data: { title: trimmed } });
      if (activeDocument?.id === docId) {
        setActiveDocument(prev => ({ ...prev, title: trimmed }));
      }
    }
    setRenamingDocId(null);
  };

  const handleExportPDF = () => {
    if (!activeDocument) return;
    const win = window.open('', '_blank');
    const escapedTitle = (activeDocument.title || 'Document').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedContent = content
      .split('\n')
      .map(line => `<p>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;') || '&nbsp;'}</p>`)
      .join('');
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapedTitle}</title>
  <style>
    body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 40px;line-height:1.7;color:#222}
    h1{font-size:22px;margin-bottom:6px}
    .meta{color:#888;font-size:13px;margin-bottom:28px;padding-bottom:14px;border-bottom:1px solid #ddd}
    p{margin:0 0 6px}
    @media print{body{margin:0;padding:20px}}
  </style>
</head>
<body>
  <h1>${escapedTitle}</h1>
  <div class="meta">${countWords(content)} words &middot; Exported ${new Date().toLocaleDateString()}</div>
  ${escapedContent}
  <script>window.onload=()=>{window.print()}<\/script>
</body>
</html>`);
    win.document.close();
  };

  const insertTemplate = (template) => {
    const templateContent = LATEX_TEMPLATES[template];
    if (templateContent) {
      setContent(prev => prev + '\n' + templateContent + '\n');
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden">
      {/* Document Sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-gray-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-slate-800 space-y-2">
          <Button
            onClick={handleNewDocument}
            disabled={createDocumentMutation.isPending}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-600"
          >
            {createDocumentMutation.isPending
              ? <Loader2 size={16} className="mr-2 animate-spin" />
              : <Plus size={16} className="mr-2" />}
            New Document
          </Button>
          {createError && (
            <p className="text-xs text-red-400 text-center px-1">{createError}</p>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase px-2 mb-2">Documents</p>
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={cn(
                  "group w-full text-left p-3 rounded-lg transition-all",
                  activeDocument?.id === doc.id
                    ? "bg-blue-500/20 border border-blue-500/30"
                    : "bg-white/70 dark:bg-slate-900/70 hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent"
                )}
              >
                {renamingDocId === doc.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameSubmit(doc.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameSubmit(doc.id);
                      if (e.key === 'Escape') setRenamingDocId(null);
                    }}
                    className="w-full bg-gray-200 text-gray-900 text-sm rounded px-2 py-1 outline-none border border-blue-500/50 focus:border-blue-400"
                  />
                ) : (
                  <div
                    className="flex items-start gap-2 cursor-pointer"
                    onClick={() => { setActiveDocument(doc); setContent(doc.content || ''); }}
                  >
                    <FileText size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug break-words">{doc.title}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{doc.word_count || 0} words</p>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setRenamingDocId(doc.id);
                        setRenameValue(doc.title || '');
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all flex-shrink-0 mt-0.5"
                      title="Rename"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Section Navigator */}
        <div className="border-t border-gray-200 dark:border-slate-800 p-3">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase px-2 mb-2">Sections</p>
          <div className="space-y-1">
            {DOCUMENT_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded text-sm transition-colors",
                  activeSection === section.id
                    ? "bg-blue-500/20 text-blue-300"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800"
                )}
              >
                {section.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-3 border-b border-gray-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* Format buttons */}
              <ToolbarButton icon={Bold} tooltip="Bold" />
              <ToolbarButton icon={Italic} tooltip="Italic" />
              <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-2" />
              <ToolbarButton icon={Heading1} tooltip="Heading 1" onClick={() => insertTemplate('section')} />
              <ToolbarButton icon={Heading2} tooltip="Heading 2" onClick={() => insertTemplate('subsection')} />
              <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-2" />
              <ToolbarButton icon={List} tooltip="Bullet List" />
              <ToolbarButton icon={ListOrdered} tooltip="Numbered List" />
              <ToolbarButton icon={Quote} tooltip="Quote" />
              <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-2" />
              <ToolbarButton icon={FileCode} tooltip="Equation" onClick={() => insertTemplate('equation')} />
              <ToolbarButton icon={Image} tooltip="Figure" onClick={() => insertTemplate('figure')} />
              <ToolbarButton icon={BookOpen} tooltip="Citation" onClick={() => insertTemplate('citation')} />
            </div>

            <div className="flex items-center gap-2">
              {/* AI Improve button */}
              <Button
                size="sm"
                onClick={handleAIImprove}
                disabled={isAnalyzing || !content.trim()}
                className="h-8 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 hover:border-blue-400"
              >
                {isAnalyzing
                  ? <Loader2 size={13} className="animate-spin mr-1.5" />
                  : <Sparkles size={13} className="mr-1.5" />}
                AI Improve
              </Button>

              {/* Humanize button */}
              <Button
                size="sm"
                onClick={handleHumanize}
                disabled={isHumanizing || isPlagChecking || !content.trim()}
                className="h-8 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 hover:border-purple-400"
              >
                {isHumanizing
                  ? <Loader2 size={13} className="animate-spin mr-1.5" />
                  : <Bot size={13} className="mr-1.5" />}
                Humanize
              </Button>

              {/* Plagiarism check button */}
              <Button
                size="sm"
                onClick={handlePlagiarismCheck}
                disabled={isPlagChecking || isHumanizing || !content.trim()}
                className="h-8 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400"
              >
                {isPlagChecking
                  ? <Loader2 size={13} className="animate-spin mr-1.5" />
                  : <ShieldCheck size={13} className="mr-1.5" />}
                Plag Check
              </Button>

              {/* Export PDF button */}
              <Button
                size="sm"
                onClick={handleExportPDF}
                disabled={!activeDocument || !content.trim()}
                className="h-8 bg-gray-200/50 dark:bg-slate-800/50 hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 hover:border-slate-500"
              >
                <Download size={13} className="mr-1.5" />
                Export PDF
              </Button>

              <div className="w-px h-5 bg-gray-200" />

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('edit')}
                  className={cn(
                    "px-3 py-1 rounded text-sm transition-colors",
                    viewMode === 'edit' ? "bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-white" : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={cn(
                    "px-3 py-1 rounded text-sm transition-colors",
                    viewMode === 'split' ? "bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-white" : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  Split
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={cn(
                    "px-3 py-1 rounded text-sm transition-colors",
                    viewMode === 'preview' ? "bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-white" : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <Eye size={14} />
                </button>
              </div>

              {/* Save indicator */}
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : lastSaved ? (
                  <>
                    <CheckCircle size={14} className="text-emerald-400" />
                    <span>Saved</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Brief Report Panel */}
        {briefReport && (
          <div className={cn(
            "px-4 py-3 border-b text-sm flex items-start gap-3",
            briefReport.type === 'plagiarism'
              ? briefReport.originality_score >= 80
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-amber-500/10 border-amber-500/20"
              : briefReport.ai_risk_after <= 30
                ? "bg-blue-500/10 border-blue-500/20"
                : "bg-amber-500/10 border-amber-500/20"
          )}>
            {briefReport.type === 'plagiarism' ? (
              <>
                <ShieldCheck size={16} className={cn(
                  "mt-0.5 flex-shrink-0",
                  briefReport.originality_score >= 80 ? "text-emerald-400" : "text-amber-400"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">Plagiarism Report</span>
                    <Badge className={cn(
                      "text-xs",
                      briefReport.originality_score >= 80
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    )}>
                      {briefReport.originality_score}% original
                    </Badge>
                    {briefReport.concerns_count > 0 && (
                      <Badge className="text-xs bg-red-500/20 text-red-300 border-red-500/30">
                        {briefReport.concerns_count} concern{briefReport.concerns_count !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-700 dark:text-slate-300 leading-snug">{briefReport.summary}</p>
                  {briefReport.concerns_count > 0 && (
                    <p className="text-gray-500 dark:text-slate-400 text-xs mt-1">See the Analysis panel on the right for full details.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <Bot size={16} className="mt-0.5 flex-shrink-0 text-blue-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">Humanization Report</span>
                    <Badge className="text-xs bg-gray-200 text-gray-700 border-gray-300">
                      AI risk {briefReport.ai_risk_before}% → {briefReport.ai_risk_after}%
                    </Badge>
                    <Badge className={cn(
                      "text-xs",
                      briefReport.ai_risk_after <= 30
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    )}>
                      {briefReport.ai_risk_after <= 30 ? 'Low detection risk' : 'Moderate detection risk'}
                    </Badge>
                  </div>
                  <ul className="text-gray-700 dark:text-slate-300 space-y-0.5">
                    {briefReport.changes.slice(0, 4).map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                  {briefReport.humanized_text && (
                    <Button
                      size="sm"
                      className="mt-2 h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setContent(briefReport.humanized_text);
                        setBriefReport(null);
                      }}
                    >
                      Apply humanized text
                    </Button>
                  )}
                </div>
              </>
            )}
            <button
              onClick={() => setBriefReport(null)}
              className="text-gray-400 hover:text-gray-900 dark:hover:text-white flex-shrink-0 mt-0.5"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Editor Content */}
        <div className="flex-1 flex">
          {/* Editor */}
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className={cn(
              "flex-1 flex flex-col",
              viewMode === 'split' && "border-r border-gray-200 dark:border-slate-800"
            )}>
              {activeDocument ? (
                <div className="flex-1 p-4">
                  <Input
                    value={activeDocument.title}
                    onChange={(e) => {
                      setActiveDocument({ ...activeDocument, title: e.target.value });
                      updateDocumentMutation.mutate({
                        id: activeDocument.id,
                        data: { title: e.target.value }
                      });
                    }}
                    className="text-xl font-semibold bg-transparent border-none px-0 mb-4 focus-visible:ring-0"
                    placeholder="Document Title"
                  />
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start writing your research..."
                    className="flex-1 w-full h-full min-h-[500px] bg-white/50 dark:bg-slate-900/50 border-gray-300 dark:border-slate-700 dark:text-slate-100 font-mono text-sm resize-none"
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <FileText size={48} className="mx-auto text-gray-400 dark:text-slate-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Document Selected</h3>
                    <p className="text-gray-500 dark:text-slate-400 mb-4">Create a new document or select one from the sidebar</p>
                    <Button onClick={handleNewDocument} disabled={createDocumentMutation.isPending}>
                      {createDocumentMutation.isPending
                        ? <Loader2 size={16} className="mr-2 animate-spin" />
                        : <Plus size={16} className="mr-2" />}
                      Create Document
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className="flex-1 p-6 overflow-auto bg-violet-50">
              <div className="max-w-3xl mx-auto prose prose-invert prose-sm">
                <ReactMarkdown>{content || '*No content yet*'}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Stats Bar */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex items-center text-sm">
          <div className="flex items-center gap-4 text-gray-500 dark:text-slate-400">
            <span>{countWords(content)} words</span>
            <span>{content.length} characters</span>
          </div>
        </div>
      </div>

      {/* AI Suggestions Panel */}
      {(aiSuggestions.length > 0 || plagiarismScore || applyResult) && (
        <div className="w-72 flex-shrink-0 border-l border-gray-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">AI Analysis</h3>
            <button
              onClick={() => { setAiSuggestions([]); setPlagiarismScore(null); setApplyResult(null); }}
              className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <ScrollArea className="flex-1 p-4">
            {applyResult && (
              <Card className="mb-4 bg-emerald-500/10 border-emerald-500/30">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Document improved</p>
                      {applyResult.citations_added > 0 ? (
                        <p className="text-xs text-gray-700 dark:text-slate-300 mt-0.5">
                          {applyResult.citations_added} inline citation{applyResult.citations_added !== 1 ? 's' : ''} inserted
                          {applyResult.papers_count > 0 && ` from ${applyResult.papers_count} papers`} · References section added
                        </p>
                      ) : (
                        <p className="text-xs text-gray-700 dark:text-slate-300 mt-0.5">All suggestions applied. No matching papers found for citations.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {plagiarismScore && (
              <Card className="mb-4 bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle size={14} className={plagiarismScore.originality_score >= 80 ? "text-emerald-400" : "text-amber-400"} />
                    Originality Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {plagiarismScore.originality_score}%
                  </div>
                  <Progress value={plagiarismScore.originality_score} className="h-2 mb-3" />
                  <p className="text-xs text-gray-500 dark:text-slate-400">{plagiarismScore.summary}</p>
                  {plagiarismScore.concerns?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {plagiarismScore.concerns.slice(0, 3).map((concern, i) => (
                        <div key={i} className="p-2 bg-amber-500/10 rounded border border-amber-500/20">
                          <p className="text-xs font-medium text-amber-300">"{concern.text}"</p>
                          <p className="text-xs text-gray-500 mt-1">{concern.suggestion}</p>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        className="w-full mt-1 h-7 text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40"
                        onClick={handleRephraseAll}
                        disabled={isRephrasing}
                      >
                        {isRephrasing
                          ? <Loader2 size={11} className="animate-spin mr-1.5" />
                          : <Sparkles size={11} className="mr-1.5" />}
                        {isRephrasing ? 'Rephrasing...' : 'Rephrase flagged sections'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {aiSuggestions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500 dark:text-slate-400">Suggestions</h4>
                {aiSuggestions.map((suggestion, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-3 rounded-lg border",
                      suggestion.severity === 'high' ? "bg-red-500/10 border-red-500/20" :
                      suggestion.severity === 'medium' ? "bg-amber-500/10 border-amber-500/20" :
                      "bg-blue-500/10 border-blue-500/20"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} className={cn(
                        suggestion.severity === 'high' ? "text-red-400" :
                        suggestion.severity === 'medium' ? "text-amber-400" :
                        "text-blue-400"
                      )} />
                      <div>
                        <p className="text-xs font-medium text-gray-900 dark:text-white capitalize">{suggestion.type}</p>
                        <p className="text-xs text-gray-700 dark:text-slate-300 mt-1">{suggestion.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t border-gray-300/50 dark:border-slate-700/50">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                    onClick={handleApplyImprovements}
                    disabled={isApplying}
                  >
                    {isApplying
                      ? <Loader2 size={13} className="animate-spin mr-1.5" />
                      : <Sparkles size={13} className="mr-1.5" />}
                    {isApplying ? 'Improving...' : 'Improve with AI'}
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ icon: Icon, tooltip, onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
      title={tooltip}
    >
      <Icon size={16} />
    </button>
  );
}
