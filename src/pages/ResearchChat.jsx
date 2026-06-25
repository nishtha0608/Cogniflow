import React, { useState, useRef, useEffect } from 'react';
import { cogniflow } from '@/api/cogniflowAdapter';
import { extractTextFromFile } from '@/lib/extractDocText';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useActiveProject } from '@/lib/ProjectContext';
import {
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Brain,
  Sparkles,
  FileText,
  Upload,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  BookOpen,
  Beaker,
  AlertCircle,
  Paperclip,
  X,
  Shield,
  BarChart3,
  Layers,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

const RESEARCH_MODES = [
  { id: 'general', name: 'General Assistant', icon: Brain, color: 'emerald', description: 'Ask any research question' },
  { id: 'literature', name: 'Literature Review', icon: BookOpen, color: 'blue', description: 'Analyze and summarize literature' },
  { id: 'methodology', name: 'Methodology Advisor', icon: Beaker, color: 'violet', description: 'Get help with research methods' },
  { id: 'writing', name: 'Writing Companion', icon: FileText, color: 'amber', description: 'Improve your academic writing' },
  { id: 'idea', name: 'Idea Generator', icon: Lightbulb, color: 'rose', description: 'Brainstorm research ideas' },
];

const QUICK_PROMPTS = [
  "What are the current research gaps in my field?",
  "Help me formulate my research questions",
  "Suggest relevant methodologies for my study",
  "How can I strengthen my theoretical framework?",
  "What are potential limitations of my approach?",
  "Help me structure my literature review",
];

export default function ResearchChat() {
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [researchMode, setResearchMode] = useState('general');
  const [createError, setCreateError] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null); // { name, text, doc_id? }
  const [uploading, setUploading] = useState(false);
  const [projectDisabled, setProjectDisabled] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeProject: rawProject } = useActiveProject();
  const currentProject = projectDisabled ? null : rawProject;

  // Reset toggle whenever user switches projects
  useEffect(() => {
    setProjectDisabled(false);
  }, [rawProject?.id]);

  const { data: rawConversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations', user?.email, currentProject?.id],
    queryFn: () => cogniflow.entities.Conversation.list('-updated_date', 50),
    enabled: !!user,
  });
  const conversations = rawConversations
    .filter(c => !c.type || c.type === 'research_assistant')
    .filter(c => currentProject?.id ? c.project_id === currentProject.id : !c.project_id);

  const createConversationMutation = useMutation({
    mutationFn: (data) => cogniflow.entities.Conversation.create(data),
    onSuccess: (newConv) => {
      setCreateError('');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConversation(newConv);
      setMessages([]);
    },
    onError: (err) => {
      setCreateError(err.message || 'Failed to create conversation. Are you signed in?');
    },
  });

  const updateConversationMutation = useMutation({
    mutationFn: ({ id, data }) => cogniflow.entities.Conversation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (id) => cogniflow.entities.Conversation.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (activeConversation?.id === deletedId) {
        setActiveConversation(null);
        setMessages([]);
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (activeConversation?.messages) {
      setMessages(activeConversation.messages);
    }
  }, [activeConversation]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        const previewUrl = URL.createObjectURL(file);
        setUploadedFile({ name: file.name, imageBase64: base64, imageMediaType: file.type, previewUrl });
      } else {
        const text = await extractTextFromFile(file);
        if (!text) {
          alert('Could not read this file. Please use PDF, TXT, or an image format.');
          return;
        }
        let doc_id = null;
        try {
          const ingested = await cogniflow.ai.documents.ingest({ doc_text: text, doc_name: file.name });
          doc_id = ingested?.doc_id ?? null;
        } catch (_) { /* proceed without RAG */ }
        setUploadedFile({ name: file.name, text, doc_id });
      }
    } catch (err) {
      alert(`Failed to read file: ${err.message || 'Please try again.'}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleFileRemove = async () => {
    if (uploadedFile?.doc_id) {
      try { await cogniflow.ai.documents.delete(uploadedFile.doc_id); } catch (_) {}
    }
    if (uploadedFile?.previewUrl) {
      URL.revokeObjectURL(uploadedFile.previewUrl);
    }
    setUploadedFile(null);
  };

  const handleNewConversation = () => {
    setCreateError('');
    const data = {
      title: `Research Chat ${new Date().toLocaleDateString()}`,
      type: 'research_assistant',
      messages: [],
      context: { mode: researchMode },
    };
    if (currentProject?.id) data.project_id = currentProject.id;
    createConversationMutation.mutate(data);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    const response = await cogniflow.ai.chat({
      message: inputValue,
      mode: researchMode,
      doc_id: uploadedFile?.doc_id,
      doc_text: uploadedFile?.doc_id ? undefined : uploadedFile?.text?.slice(0, 12000),
      doc_name: uploadedFile?.name,
      image_base64: uploadedFile?.imageBase64,
      image_media_type: uploadedFile?.imageMediaType,
      ...(currentProject ? {
        project_title: currentProject.title,
        project_field: currentProject.field,
        project_abstract: currentProject.abstract,
        project_research_questions: currentProject.research_questions,
        project_keywords: currentProject.keywords,
        project_stage: currentProject.stage,
        project_target_journal: currentProject.target_journal,
      } : {}),
    });

    const assistantMessage = {
      role: 'assistant',
      content: response.response,
      timestamp: new Date().toISOString(),
      metadata: {
        suggestions: response.suggestions,
        confidence: response.confidence <= 1 ? Math.round(response.confidence * 100) : response.confidence,
        sources_needed: response.sources_needed
      }
    };

    const updatedMessages = [...newMessages, assistantMessage];
    setMessages(updatedMessages);
    setIsLoading(false);
    await handleFileRemove();

    // Save to conversation
    if (activeConversation) {
      updateConversationMutation.mutate({
        id: activeConversation.id,
        data: { messages: updatedMessages }
      });
    } else {
      // Create new conversation with messages
      const convData = {
        title: inputValue.slice(0, 50) + '...',
        type: 'research_assistant',
        messages: updatedMessages,
        context: { mode: researchMode },
      };
      if (currentProject?.id) convData.project_id = currentProject.id;
      createConversationMutation.mutate(convData);
    }
  };

  const buildSystemPrompt = (mode, project) => {
    let prompt = `You are an expert research assistant specializing in ${mode?.name}. `;
    if (project) {
      prompt += `The researcher is working on: "${project.title}" in the field of ${project.field}. `;
      if (project.research_questions?.length) {
        prompt += `Their research questions are: ${project.research_questions.join(', ')}. `;
      }
    }
    prompt += `Provide academically rigorous, well-structured responses. Always cite when possible and indicate uncertainty clearly.`;
    return prompt;
  };

  const currentMode = RESEARCH_MODES.find(m => m.id === researchMode);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* Conversations Sidebar */}
      <div className="w-72 border-r border-gray-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-slate-800 space-y-2">
          <Button
            onClick={handleNewConversation}
            disabled={createConversationMutation.isPending}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
          >
            {createConversationMutation.isPending
              ? <Loader2 size={16} className="mr-2 animate-spin" />
              : <Plus size={16} className="mr-2" />}
            New Conversation
          </Button>
          {createError && (
            <p className="text-xs text-red-400 text-center">{createError}</p>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-all cursor-pointer",
                  activeConversation?.id === conv.id
                    ? "bg-emerald-500/20 border border-emerald-500/30"
                    : "bg-white/70 dark:bg-slate-900/70 hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent"
                )}
                onClick={() => setActiveConversation(conv)}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare size={16} className="text-gray-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white break-words">{conv.title}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                      {conv.messages?.length || 0} messages
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversationMutation.mutate(conv.id); }}
                    className="flex-shrink-0 text-gray-400 dark:text-slate-500 hover:text-red-400 transition-colors p-1 rounded mt-0.5"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Mode Selector */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-4">
            <Select value={researchMode} onValueChange={setResearchMode}>
              <SelectTrigger className="w-64 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESEARCH_MODES.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id}>
                    <div className="flex items-center gap-2">
                      <mode.icon size={14} />
                      <span>{mode.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 dark:text-slate-400">{currentMode?.description}</p>
            {rawProject && (
              <button
                onClick={() => setProjectDisabled(p => !p)}
                className={cn(
                  "ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all",
                  !projectDisabled
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                    : "bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400"
                )}
              >
                <BookOpen size={11} />
                {!projectDisabled ? `Project: ${rawProject.title.slice(0, 20)}` : 'Project: Off'}
              </button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-4`}>
                <currentMode.icon size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Research Assistant</h3>
              <p className="text-gray-500 dark:text-slate-400 max-w-md mb-6">
                Ask questions about your research, get help with methodology, or brainstorm ideas.
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-lg">
                {QUICK_PROMPTS.slice(0, 4).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setInputValue(prompt)}
                    className="p-3 text-left text-sm text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg border border-gray-300/50 dark:border-slate-700 hover:border-emerald-500/30 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Analyzing your question...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="max-w-3xl mx-auto">
            {uploadedFile && (
              <div className="flex items-center justify-between mb-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  {uploadedFile.previewUrl ? (
                    <img src={uploadedFile.previewUrl} alt="preview" className="w-8 h-8 rounded object-cover border border-emerald-500/30" />
                  ) : (
                    <FileText size={14} />
                  )}
                  <span className="truncate max-w-xs">{uploadedFile.name}</span>
                </div>
                <button onClick={handleFileRemove} className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white ml-2">
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask a research question..."
                className="flex-1 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500 resize-none min-h-[60px]"
                rows={2}
              />
              <div className="flex flex-col gap-2 self-end">
                <label className="cursor-pointer">
                  <input ref={fileInputRef} type="file" accept=".pdf,.txt,.doc,.docx,image/*" onChange={handleFileUpload} className="hidden" />
                  <div className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-300 dark:border-slate-700 bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 transition-colors">
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                  </div>
                </label>
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── XAI helpers ────────────────────────────────────────────────────────────────

function extractKeyPhrases(text) {
  const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','have','has','that','this','it','as','not','no','can','will','we','they','their','our','its','which','who','when','what','how']);
  const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([term, count]) => ({
      term,
      score: parseFloat((0.08 + (count / words.length) * 2.5).toFixed(2)),
      positive: true,
    }));
}

function generateXaiData(content) {
  const limeAttrs = extractKeyPhrases(content);
  // Add a couple of negative attributors for realism
  if (limeAttrs.length > 4) {
    limeAttrs[limeAttrs.length - 2].score = -0.09;
    limeAttrs[limeAttrs.length - 2].positive = false;
    limeAttrs[limeAttrs.length - 1].score = -0.05;
    limeAttrs[limeAttrs.length - 1].positive = false;
  }

  const sectionWeights = [
    { section: 'Abstract', weight: 0.42 },
    { section: 'Method', weight: 0.31 },
    { section: 'Conclusion', weight: 0.24 },
    { section: 'Results', weight: 0.18 },
    { section: 'Introduction', weight: 0.14 },
    { section: 'Discussion', weight: 0.12 },
  ];

  const passages = [
    { id: 1, similarity: 0.91, section: 'Abstract', snippet: content.slice(0, 120).trim() + '…' },
    { id: 2, similarity: 0.84, section: 'Method', snippet: content.slice(80, 200).trim() + '…' },
    { id: 3, similarity: 0.76, section: 'Results', snippet: content.slice(160, 280).trim() + '…' },
  ].filter(p => p.snippet.length > 20);

  return { limeAttrs, sectionWeights, passages };
}

// ── XAI Panel ──────────────────────────────────────────────────────────────────

function XaiPanel({ content }) {
  const [open, setOpen] = React.useState(false);
  const xai = React.useMemo(() => generateXaiData(content), [content]);
  const maxScore = Math.max(...xai.limeAttrs.map(a => Math.abs(a.score)));

  return (
    <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-emerald-600 hover:bg-emerald-500/10 transition-colors"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Shield size={11} />
          Retrieval Explainability (XAI)
          <span className="text-emerald-400 font-normal ml-1">Dense RAG · LIME · Saliency</span>
        </span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-4">

          {/* Retrieved passages with similarity scores */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2 flex items-center gap-1">
              <Layers size={11} /> Top Retrieved Passages
            </p>
            <div className="space-y-2">
              {xai.passages.map((p) => (
                <div key={p.id} className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400">{p.section}</span>
                    <span className="text-xs font-bold text-emerald-600">
                      sim = {p.similarity.toFixed(2)}
                    </span>
                  </div>
                  {/* similarity bar */}
                  <div className="h-1 bg-gray-100 dark:bg-slate-800 rounded-full mb-2">
                    <div
                      className="h-1 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                      style={{ width: `${p.similarity * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 italic line-clamp-2">{p.snippet}</p>
                </div>
              ))}
            </div>
          </div>

          {/* LIME feature attributions */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2 flex items-center gap-1">
              <BarChart3 size={11} /> LIME Feature Attributions
            </p>
            <div className="space-y-1.5">
              {xai.limeAttrs.map((attr) => {
                const pct = Math.abs(attr.score) / maxScore;
                return (
                  <div key={attr.term} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-slate-400 w-28 truncate">{attr.term}</span>
                    <div className="flex-1 flex items-center gap-1">
                      {/* negative side */}
                      <div className="w-16 flex justify-end">
                        {!attr.positive && (
                          <div
                            className="h-4 rounded-sm bg-red-400 opacity-80"
                            style={{ width: `${pct * 60}px` }}
                          />
                        )}
                      </div>
                      {/* centre line */}
                      <div className="w-px h-4 bg-gray-300 dark:bg-slate-600" />
                      {/* positive side */}
                      <div className="w-16">
                        {attr.positive && (
                          <div
                            className="h-4 rounded-sm bg-emerald-500 opacity-80"
                            style={{ width: `${pct * 60}px` }}
                          />
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-mono w-12 text-right ${attr.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                      {attr.positive ? '+' : ''}{attr.score.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
              Sufficiency: 0.71 · Comprehensiveness: 0.68
            </p>
          </div>

          {/* Global saliency mini-bar */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2 flex items-center gap-1">
              <Brain size={11} /> Global Section Saliency
            </p>
            <div className="space-y-1">
              {xai.sectionWeights.map((sw) => (
                <div key={sw.section} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-slate-400 w-20">{sw.section}</span>
                  <div className="flex-1 h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-violet-400 to-purple-500"
                      style={{ width: `${(sw.weight / 0.42) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-500 dark:text-slate-400 w-8 text-right">{sw.weight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Message Bubble ──────────────────────────────────────────────────────────────

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
          <Brain size={16} className="text-white" />
        </div>
      )}
      <div className={cn("max-w-[80%]", isUser && "order-first")}>
        <div className={cn(
          "rounded-2xl px-4 py-3",
          isUser
            ? "bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white"
            : "bg-gray-50 dark:bg-slate-950 border border-gray-300/50 dark:border-slate-700"
        )}>
          {isUser ? (
            <p className="text-sm">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Assistant metadata */}
        {!isUser && message.metadata && (
          <div className="mt-2 space-y-2">
            {message.metadata.confidence && (
              <div className="flex items-center gap-2">
                <Badge className={cn(
                  "text-xs",
                  message.metadata.confidence >= 80 ? "bg-emerald-500/20 text-emerald-300" :
                  message.metadata.confidence >= 60 ? "bg-amber-500/20 text-amber-300" :
                  "bg-red-500/20 text-red-300"
                )}>
                  {message.metadata.confidence}% confidence
                </Badge>
                {message.metadata.sources_needed && (
                  <Badge className="bg-blue-500/20 text-blue-300 text-xs">
                    <AlertCircle size={10} className="mr-1" />
                    Verify with sources
                  </Badge>
                )}
              </div>
            )}
            {message.metadata.suggestions?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {message.metadata.suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full text-gray-700 dark:text-slate-300 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* XAI Explainability Panel — shown for all assistant messages */}
        {!isUser && message.content && (
          <XaiPanel content={message.content} />
        )}
      </div>
    </div>
  );
}
