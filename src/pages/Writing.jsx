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
  ArrowRightLeft
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
  const [plagiarismScore, setPlagiarismScore] = useState(null);
  const [briefReport, setBriefReport] = useState(null); // { type, ...fields }
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

    const response = await cogniflow.ai.writing.improve({
      text: content.slice(0, 5000),
      doc_id: activeDocument?.id,
    });

    setAiSuggestions(response.suggestions || []);
    setIsAnalyzing(false);
  };

  const handlePlagiarismCheck = async () => {
    if (!content.trim()) return;
    setIsPlagChecking(true);
    setBriefReport(null);

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
    setIsPlagChecking(false);
  };

  const handleHumanize = async () => {
    if (!content.trim()) return;
    setIsHumanizing(true);
    setBriefReport(null);

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
    setIsHumanizing(false);
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
      <div className="w-56 flex-shrink-0 border-r border-slate-800 bg-slate-900/30 flex flex-col">
        <div className="p-4 border-b border-slate-800 space-y-2">
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
            <p className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2">Documents</p>
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => {
                  setActiveDocument(doc);
                  setContent(doc.content || '');
                }}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-all",
                  activeDocument?.id === doc.id
                    ? "bg-blue-500/20 border border-blue-500/30"
                    : "bg-slate-800/30 hover:bg-slate-800/50 border border-transparent"
                )}
              >
                <div className="flex items-start gap-2">
                  <FileText size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {doc.word_count || 0} words
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Section Navigator */}
        <div className="border-t border-slate-800 p-3">
          <p className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2">Sections</p>
          <div className="space-y-1">
            {DOCUMENT_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded text-sm transition-colors",
                  activeSection === section.id
                    ? "bg-blue-500/20 text-blue-300"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
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
        <div className="p-3 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* Format buttons */}
              <ToolbarButton icon={Bold} tooltip="Bold" />
              <ToolbarButton icon={Italic} tooltip="Italic" />
              <div className="w-px h-6 bg-slate-700 mx-2" />
              <ToolbarButton icon={Heading1} tooltip="Heading 1" onClick={() => insertTemplate('section')} />
              <ToolbarButton icon={Heading2} tooltip="Heading 2" onClick={() => insertTemplate('subsection')} />
              <div className="w-px h-6 bg-slate-700 mx-2" />
              <ToolbarButton icon={List} tooltip="Bullet List" />
              <ToolbarButton icon={ListOrdered} tooltip="Numbered List" />
              <ToolbarButton icon={Quote} tooltip="Quote" />
              <div className="w-px h-6 bg-slate-700 mx-2" />
              <ToolbarButton icon={FileCode} tooltip="Equation" onClick={() => insertTemplate('equation')} />
              <ToolbarButton icon={Image} tooltip="Figure" onClick={() => insertTemplate('figure')} />
              <ToolbarButton icon={BookOpen} tooltip="Citation" onClick={() => insertTemplate('citation')} />
            </div>

            <div className="flex items-center gap-2">
              {/* Humanize button */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleHumanize}
                disabled={isHumanizing || isPlagChecking || !content.trim()}
                className="h-8 border-purple-500/40 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 hover:border-purple-400"
              >
                {isHumanizing
                  ? <Loader2 size={13} className="animate-spin mr-1.5" />
                  : <Bot size={13} className="mr-1.5" />}
                Humanize
              </Button>

              {/* Plagiarism check button */}
              <Button
                size="sm"
                variant="outline"
                onClick={handlePlagiarismCheck}
                disabled={isPlagChecking || isHumanizing || !content.trim()}
                className="h-8 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200 hover:border-emerald-400"
              >
                {isPlagChecking
                  ? <Loader2 size={13} className="animate-spin mr-1.5" />
                  : <ShieldCheck size={13} className="mr-1.5" />}
                Plag Check
              </Button>

              <div className="w-px h-5 bg-slate-700" />

              {/* View Mode Toggle */}
              <div className="flex bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('edit')}
                  className={cn(
                    "px-3 py-1 rounded text-sm transition-colors",
                    viewMode === 'edit' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={cn(
                    "px-3 py-1 rounded text-sm transition-colors",
                    viewMode === 'split' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  Split
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={cn(
                    "px-3 py-1 rounded text-sm transition-colors",
                    viewMode === 'preview' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  <Eye size={14} />
                </button>
              </div>

              {/* Save indicator */}
              <div className="flex items-center gap-2 text-sm text-slate-400">
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
                    <span className="font-semibold text-white">Plagiarism Report</span>
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
                  <p className="text-slate-300 leading-snug">{briefReport.summary}</p>
                  {briefReport.concerns_count > 0 && (
                    <p className="text-slate-400 text-xs mt-1">See the Analysis panel on the right for full details.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <Bot size={16} className="mt-0.5 flex-shrink-0 text-blue-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">Humanization Report</span>
                    <Badge className="text-xs bg-slate-700 text-slate-300 border-slate-600">
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
                  <ul className="text-slate-300 space-y-0.5">
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
                      className="mt-2 h-7 text-xs bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setContent(briefReport.humanized_text);
                        setBriefReport(null);
                      }}
                    >
                      <ArrowRightLeft size={12} className="mr-1.5" />
                      Apply humanized text
                    </Button>
                  )}
                </div>
              </>
            )}
            <button
              onClick={() => setBriefReport(null)}
              className="text-slate-500 hover:text-white flex-shrink-0 mt-0.5"
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
              viewMode === 'split' && "border-r border-slate-800"
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
                    className="flex-1 w-full h-full min-h-[500px] bg-slate-900/50 border-slate-700 font-mono text-sm resize-none"
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <FileText size={48} className="mx-auto text-slate-600 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No Document Selected</h3>
                    <p className="text-slate-400 mb-4">Create a new document or select one from the sidebar</p>
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
            <div className="flex-1 p-6 overflow-auto bg-white">
              <div className="max-w-3xl mx-auto prose prose-slate">
                <ReactMarkdown>{content || '*No content yet*'}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Stats Bar */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-slate-400">
            <span>{countWords(content)} words</span>
            <span>{content.length} characters</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAIImprove}
              disabled={isAnalyzing || !content.trim()}
              className="text-blue-400"
            >
              {isAnalyzing ? <Loader2 size={14} className="animate-spin mr-2" /> : <Sparkles size={14} className="mr-2" />}
              AI Improve
            </Button>
          </div>
        </div>
      </div>

      {/* AI Suggestions Panel */}
      {(aiSuggestions.length > 0 || plagiarismScore) && (
        <div className="w-72 flex-shrink-0 border-l border-slate-800 bg-slate-900/30 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="font-semibold text-white">AI Analysis</h3>
          </div>
          <ScrollArea className="flex-1 p-4">
            {plagiarismScore && (
              <Card className="mb-4 bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle size={14} className={plagiarismScore.originality_score >= 80 ? "text-emerald-400" : "text-amber-400"} />
                    Originality Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-2">
                    {plagiarismScore.originality_score}%
                  </div>
                  <Progress value={plagiarismScore.originality_score} className="h-2 mb-3" />
                  <p className="text-xs text-slate-400">{plagiarismScore.summary}</p>
                  {plagiarismScore.concerns?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {plagiarismScore.concerns.slice(0, 3).map((concern, i) => (
                        <div key={i} className="p-2 bg-amber-500/10 rounded border border-amber-500/20">
                          <p className="text-xs text-amber-300">{concern.reason}</p>
                          <p className="text-xs text-slate-400 mt-1">{concern.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {aiSuggestions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-400">Suggestions</h4>
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
                        <p className="text-xs font-medium text-white capitalize">{suggestion.type}</p>
                        <p className="text-xs text-slate-300 mt-1">{suggestion.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
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
      className="p-2 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"
      title={tooltip}
    >
      <Icon size={16} />
    </button>
  );
}
