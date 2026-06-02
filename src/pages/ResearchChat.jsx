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
  Lightbulb,
  BookOpen,
  Beaker,
  AlertCircle,
  Paperclip,
  X,
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
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeProject: currentProject } = useActiveProject();

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
      const text = await extractTextFromFile(file);
      if (!text) {
        alert('Could not read this file. Please use PDF or TXT format.');
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
      project_title: currentProject?.title,
      project_field: currentProject?.field,
      project_abstract: currentProject?.abstract,
      project_research_questions: currentProject?.research_questions,
      project_keywords: currentProject?.keywords,
      project_stage: currentProject?.stage,
      project_target_journal: currentProject?.target_journal,
    });

    const assistantMessage = {
      role: 'assistant',
      content: response.response,
      timestamp: new Date().toISOString(),
      metadata: {
        suggestions: response.suggestions,
        confidence: response.confidence,
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
      <div className="w-72 border-r border-slate-800 bg-slate-900/30 flex flex-col">
        <div className="p-4 border-b border-slate-800 space-y-2">
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
              <button
                key={conv.id}
                onClick={() => setActiveConversation(conv)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-all",
                  activeConversation?.id === conv.id
                    ? "bg-emerald-500/20 border border-emerald-500/30"
                    : "bg-slate-800/30 hover:bg-slate-800/50 border border-transparent"
                )}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{conv.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {conv.messages?.length || 0} messages
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Mode Selector */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <Select value={researchMode} onValueChange={setResearchMode}>
              <SelectTrigger className="w-64 bg-slate-800 border-slate-700">
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
            <p className="text-sm text-slate-400">{currentMode?.description}</p>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-4`}>
                <currentMode.icon size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Research Assistant</h3>
              <p className="text-slate-400 max-w-md mb-6">
                Ask questions about your research, get help with methodology, or brainstorm ideas.
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-lg">
                {QUICK_PROMPTS.slice(0, 4).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setInputValue(prompt)}
                    className="p-3 text-left text-sm bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700/50 hover:border-emerald-500/30 transition-all"
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
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Analyzing your question...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="max-w-3xl mx-auto">
            {uploadedFile && (
              <div className="flex items-center justify-between mb-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  <FileText size={14} />
                  <span className="truncate max-w-xs">{uploadedFile.name}</span>
                </div>
                <button onClick={handleFileRemove} className="text-slate-400 hover:text-white ml-2">
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
                className="flex-1 bg-slate-800 border-slate-700 resize-none min-h-[60px]"
                rows={2}
              />
              <div className="flex flex-col gap-2 self-end">
                <label className="cursor-pointer">
                  <input ref={fileInputRef} type="file" accept=".pdf,.txt,.doc,.docx" onChange={handleFileUpload} className="hidden" />
                  <Button variant="outline" size="icon" className="border-slate-700" asChild>
                    <span>{uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}</span>
                  </Button>
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
            <p className="text-xs text-slate-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

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
            ? "bg-slate-700 text-white" 
            : "bg-slate-800/50 border border-slate-700/50"
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
                    className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
