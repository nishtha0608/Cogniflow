import React, { useState, useRef } from 'react';
import { cogniflow } from '@/api/cogniflowAdapter';
import { extractTextFromFile } from '@/lib/extractDocText';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useActiveProject } from '@/lib/ProjectContext';
import { 
  GraduationCap,
  Play,
  Pause,
  RotateCcw,
  MessageCircle,
  Clock,
  AlertTriangle,
  CheckCircle,
  Target,
  Loader2,
  ChevronRight,
  Volume2,
  VolumeX,
  Award,
  TrendingUp,
  Brain,
  FileText,
  Upload,
  X,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
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
import { cn } from '@/lib/utils';

const EXAMINER_TYPES = [
  { id: 'supportive', name: 'Supportive Examiner', description: 'Encouraging and constructive', stress: 1 },
  { id: 'neutral', name: 'Neutral Examiner', description: 'Fair and balanced approach', stress: 2 },
  { id: 'challenging', name: 'Challenging Examiner', description: 'Probing and rigorous', stress: 3 },
  { id: 'skeptical', name: 'Skeptical Examiner', description: 'Critical and questioning', stress: 4 },
];

const QUESTION_TYPES = [
  'Opening Questions',
  'Research Design',
  'Methodology',
  'Findings',
  'Contribution',
  'Limitations',
  'Future Work',
  'Defense Questions',
];

export default function VivaSimulator() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [examinerType, setExaminerType] = useState('neutral');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [questionHistory, setQuestionHistory] = useState([]);
  const [sessionStats, setSessionStats] = useState({
    questionsAnswered: 0,
    averageScore: 0,
    totalTime: 0,
    strengths: [],
    weaknesses: []
  });
  const [activeSessionConvId, setActiveSessionConvId] = useState(null);
  const [uploadedDoc, setUploadedDoc] = useState(null); // { name, text, doc_id? }
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef(null);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { activeProject: currentProject } = useActiveProject();

  const { data: allConversations = [] } = useQuery({
    queryKey: ['conversations', user?.email],
    queryFn: () => cogniflow.entities.Conversation.list('-updated_date', 50),
    enabled: !!user,
  });
  const vivaHistory = allConversations.filter(c => c.type === 'viva_session');
  const lastSession = vivaHistory[0];
  const lastSessionScore = lastSession?.context?.sessionStats?.averageScore;

  const saveSessionMutation = useMutation({
    mutationFn: ({ id, data }) => id
      ? cogniflow.entities.Conversation.update(id, data)
      : cogniflow.entities.Conversation.create(data),
    onSuccess: (created, variables) => {
      if (!variables.id && created?.id) setActiveSessionConvId(created.id);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const currentExaminer = EXAMINER_TYPES.find(e => e.id === examinerType);

  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
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
      setUploadedDoc({ name: file.name, text, doc_id });
    } catch (err) {
      alert(`Failed to read document: ${err.message || 'Please try again.'}`);
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleDocRemove = async () => {
    if (uploadedDoc?.doc_id) {
      try { await cogniflow.ai.documents.delete(uploadedDoc.doc_id); } catch (_) {}
    }
    setUploadedDoc(null);
  };

  const startSession = async () => {
    setSessionStarted(true);
    setActiveSessionConvId(null);
    setQuestionHistory([]);
    setSessionStats({
      questionsAnswered: 0,
      averageScore: 0,
      totalTime: 0,
      strengths: [],
      weaknesses: []
    });
    await generateQuestion();
  };

  const generateQuestion = async () => {
    setIsLoading(true);
    setFeedback(null);
    setUserAnswer('');

    const response = await cogniflow.ai.viva.question({
      examiner_type: examinerType,
      question_history: questionHistory.map(q => q.question),
      doc_id: uploadedDoc?.doc_id,
      doc_text: uploadedDoc?.doc_id ? undefined : uploadedDoc?.text?.slice(0, 12000),
      doc_name: uploadedDoc?.name,
      project_title: currentProject?.title,
      project_field: currentProject?.field,
      project_abstract: currentProject?.abstract,
      project_research_questions: currentProject?.research_questions,
      project_keywords: currentProject?.keywords,
    });

    setCurrentQuestion(response);
    setIsLoading(false);
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim() || !currentQuestion) return;
    setIsLoading(true);

    const response = await cogniflow.ai.viva.evaluate({
      examiner_type: examinerType,
      question: currentQuestion.question,
      question_type: currentQuestion.question_type,
      expected_topics: currentQuestion.expected_topics,
      answer: userAnswer,
      doc_id: uploadedDoc?.doc_id,
      doc_text: uploadedDoc?.doc_id ? undefined : uploadedDoc?.text?.slice(0, 8000),
      doc_name: uploadedDoc?.name,
    });

    setFeedback(response);
    
    // Update history and stats
    const newHistory = [...questionHistory, {
      question: currentQuestion.question,
      answer: userAnswer,
      score: response.overall_score
    }];
    setQuestionHistory(newHistory);

    const avgScore = newHistory.reduce((sum, q) => sum + q.score, 0) / newHistory.length;
    const updatedStats = {
      ...sessionStats,
      questionsAnswered: newHistory.length,
      averageScore: Math.round(avgScore),
      strengths: [...new Set([...sessionStats.strengths, ...(response.strengths || [])])].slice(0, 5),
      weaknesses: [...new Set([...sessionStats.weaknesses, ...(response.improvements || [])])].slice(0, 5),
    };
    setSessionStats(updatedStats);

    // Save session to memory
    if (user) {
      const sessionData = {
        title: `Viva Session – ${new Date().toLocaleDateString()}`,
        type: 'viva_session',
        messages: newHistory.map(q => ({
          role: 'user',
          content: q.question,
          answer: q.answer,
          score: q.score,
          timestamp: new Date().toISOString(),
        })),
        context: { sessionStats: updatedStats, examinerType },
      };
      if (currentProject?.id) sessionData.project_id = currentProject.id;
      saveSessionMutation.mutate({ id: activeSessionConvId, data: sessionData });
    }

    setIsLoading(false);
  };

  if (!sessionStarted) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-6">
            <GraduationCap size={40} className="text-rose-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Viva Voce Simulator</h1>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Practice your PhD defense with AI-powered examination. Choose your examiner personality and receive detailed feedback on your responses.
          </p>

          <Card className="bg-slate-900/50 border-slate-800 mb-6">
            <CardContent className="p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Select Examiner Type</h3>
              <div className="grid grid-cols-2 gap-3">
                {EXAMINER_TYPES.map((examiner) => (
                  <button
                    key={examiner.id}
                    onClick={() => setExaminerType(examiner.id)}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      examinerType === examiner.id
                        ? "bg-rose-500/20 border-rose-500/30"
                        : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{examiner.name}</span>
                      <div className="flex gap-0.5">
                        {Array(4).fill(0).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-2 h-2 rounded-full",
                              i < examiner.stress ? "bg-rose-400" : "bg-slate-700"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">{examiner.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {vivaHistory.length > 0 && (
            <Card className="bg-slate-900/50 border-slate-800 mb-6">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-rose-400" />
                  <h3 className="text-sm font-semibold text-white">Your Progress</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{vivaHistory.length}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Sessions</p>
                  </div>
                  <div className="text-center">
                    <p className={cn(
                      "text-2xl font-bold",
                      lastSessionScore >= 70 ? "text-emerald-400" :
                      lastSessionScore >= 50 ? "text-amber-400" : "text-red-400"
                    )}>{lastSessionScore ?? '—'}%</p>
                    <p className="text-xs text-slate-500 mt-0.5">Last session</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">
                      {vivaHistory.length > 0
                        ? Math.round(vivaHistory.reduce((sum, s) => sum + (s.context?.sessionStats?.averageScore || 0), 0) / vivaHistory.length)
                        : '—'}%
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">All-time avg</p>
                  </div>
                </div>
                {vivaHistory.length >= 2 && (() => {
                  const prev = vivaHistory[1]?.context?.sessionStats?.averageScore;
                  if (prev != null && lastSessionScore != null) {
                    const diff = lastSessionScore - prev;
                    return (
                      <p className={cn(
                        "text-xs text-center font-medium",
                        diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-slate-400"
                      )}>
                        {diff > 0 ? `↑ ${diff}% improvement` : diff < 0 ? `↓ ${Math.abs(diff)}% from previous` : 'Same as previous session'} — keep it up!
                      </p>
                    );
                  }
                  return null;
                })()}
              </CardContent>
            </Card>
          )}

          {/* Optional document upload */}
          <Card className="bg-slate-900/50 border-slate-800 mb-6 w-full">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-white mb-3">Upload your thesis / paper (optional)</p>
              {uploadedDoc ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-emerald-400" />
                    <span className="text-sm text-white truncate max-w-xs">{uploadedDoc.name}</span>
                  </div>
                  <button onClick={handleDocRemove} className="text-slate-400 hover:text-white ml-2">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input type="file" accept=".pdf,.txt,.doc,.docx" onChange={handleDocUpload} className="hidden" disabled={uploadingDoc} />
                  <div className="p-3 rounded-lg border-2 border-dashed border-slate-700 hover:border-rose-500/50 transition-colors text-center">
                    {uploadingDoc
                      ? <span className="text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Processing...</span>
                      : <span className="text-sm text-slate-400 flex items-center justify-center gap-2"><Upload size={14} /> Upload PDF or TXT for document-specific questions</span>
                    }
                  </div>
                </label>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={startSession}
            size="lg"
            className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700"
          >
            <Play size={18} className="mr-2" />
            Begin Examination
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* Main Examination Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white">{currentExaminer?.name}</h2>
              <p className="text-xs text-slate-400">Question {sessionStats.questionsAnswered + 1}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-rose-500/20 text-rose-300">
              Avg Score: {sessionStats.averageScore}%
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSessionStarted(false)}
              className="border-slate-700"
            >
              <RotateCcw size={14} className="mr-2" />
              End Session
            </Button>
          </div>
        </div>

        {/* Question Area */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Current Question */}
            {currentQuestion && !feedback && (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-slate-700">
                      {currentQuestion.question_type}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {Array(5).fill(0).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-2 h-2 rounded-full",
                            i < (currentQuestion.difficulty || 3) ? "bg-amber-400" : "bg-slate-700"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-lg text-white leading-relaxed mb-6">
                    {currentQuestion.question}
                  </p>
                  
                  <Textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer here... Be thorough and demonstrate your understanding."
                    className="min-h-[200px] bg-slate-800 border-slate-700 mb-4"
                  />

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      {userAnswer.split(/\s+/).filter(Boolean).length} words
                    </p>
                    <Button
                      onClick={submitAnswer}
                      disabled={!userAnswer.trim() || isLoading}
                      className="bg-rose-500 hover:bg-rose-600"
                    >
                      {isLoading ? (
                        <Loader2 size={16} className="animate-spin mr-2" />
                      ) : (
                        <CheckCircle size={16} className="mr-2" />
                      )}
                      Submit Answer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feedback */}
            {feedback && (
              <div className="space-y-4">
                {/* Score Overview */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-white">Evaluation</h3>
                      <div className="text-right">
                        <span className="text-4xl font-bold text-white">{feedback.overall_score}</span>
                        <span className="text-slate-400 text-lg">/100</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <ScoreBar label="Content" score={feedback.content_score} />
                      <ScoreBar label="Critical Thinking" score={feedback.critical_thinking_score} />
                      <ScoreBar label="Communication" score={feedback.communication_score} />
                    </div>

                    <p className="text-slate-300 text-sm bg-slate-800/50 p-4 rounded-lg">
                      {feedback.feedback_summary}
                    </p>
                  </CardContent>
                </Card>

                {/* Strengths & Improvements */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="bg-emerald-500/10 border-emerald-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-emerald-300">
                        <CheckCircle size={14} />
                        Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {feedback.strengths?.map((s, i) => (
                          <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                            <ChevronRight size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-amber-500/10 border-amber-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-amber-300">
                        <Target size={14} />
                        Areas to Improve
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {feedback.improvements?.map((s, i) => (
                          <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                            <ChevronRight size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Model Answer */}
                {feedback.model_answer_points?.length > 0 && (
                  <Card className="bg-blue-500/10 border-blue-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-blue-300">
                        <Brain size={14} />
                        Key Points to Include
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {feedback.model_answer_points.map((point, i) => (
                          <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                            <span className="text-blue-400 font-medium">{i + 1}.</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={generateQuestion}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-rose-500 to-pink-600"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <ChevronRight size={16} className="mr-2" />
                  )}
                  Next Question
                </Button>
              </div>
            )}

            {/* Loading State */}
            {isLoading && !currentQuestion && (
              <div className="text-center py-12">
                <Loader2 size={32} className="animate-spin mx-auto text-rose-400 mb-4" />
                <p className="text-slate-400">Preparing your question...</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Session Stats Sidebar */}
      <div className="w-80 border-l border-slate-800 bg-slate-900/30 p-4">
        <h3 className="font-semibold text-white mb-4">Session Progress</h3>
        
        <div className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Questions Answered</span>
                <span className="text-2xl font-bold text-white">{sessionStats.questionsAnswered}</span>
              </div>
              <Progress value={(sessionStats.questionsAnswered / 10) * 100} className="h-1" />
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Average Score</span>
                <span className={cn(
                  "text-2xl font-bold",
                  sessionStats.averageScore >= 70 ? "text-emerald-400" :
                  sessionStats.averageScore >= 50 ? "text-amber-400" : "text-red-400"
                )}>
                  {sessionStats.averageScore}%
                </span>
              </div>
              <Progress value={sessionStats.averageScore} className="h-1" />
              {lastSessionScore != null && sessionStats.questionsAnswered > 0 && (() => {
                const diff = sessionStats.averageScore - lastSessionScore;
                return (
                  <p className={cn(
                    "text-xs mt-2",
                    diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-slate-500"
                  )}>
                    {diff > 0 ? `↑ +${diff}%` : diff < 0 ? `↓ ${diff}%` : '='} vs last session ({lastSessionScore}%)
                  </p>
                );
              })()}
            </CardContent>
          </Card>

          {/* Question History */}
          {questionHistory.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-slate-400 mb-3">History</h4>
              <div className="space-y-2">
                {questionHistory.slice(-5).map((q, i) => (
                  <div key={i} className="p-2 rounded bg-slate-800/30 border border-slate-700/50">
                    <p className="text-xs text-slate-400 truncate">{q.question}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={cn(
                        "text-xs font-medium",
                        q.score >= 70 ? "text-emerald-400" :
                        q.score >= 50 ? "text-amber-400" : "text-red-400"
                      )}>
                        {q.score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, score }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-medium text-white">{score}%</span>
      </div>
      <Progress value={score} className="h-1.5" />
    </div>
  );
}
