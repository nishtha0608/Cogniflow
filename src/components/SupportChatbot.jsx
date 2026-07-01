import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_REPLIES = [
  'How do I add a project?',
  'How does gap analysis work?',
  'How to export documents?',
  'How to prepare for viva?',
];

const FAQ = {
  'add a project': 'Go to **Projects** in the sidebar and click **+ New Project**. Fill in your project title, field, and research questions.',
  'gap analysis': 'The **Gap Analyzer** scans your documents and conversations to identify unexplored research areas using AI.',
  'export': 'In the **Document Manager**, open a document and click the **Download** icon. For writing, use the export button in the toolbar.',
  'viva': 'The **Viva Preparation** module simulates an exam. Pick your topic and difficulty, then practice answering AI-generated examiner questions.',
  'patent': 'Use the **Patent Search** page to search by title, inventor, or technology. Save patents and share them via WhatsApp.',
  'whatsapp': 'Go to the **WhatsApp** page to compose messages, manage research contacts, and share papers or findings.',
  'video': 'The **Video Notes** page lets you paste a YouTube URL and take timestamped notes as you watch.',
  'profile': 'Click **My Profile** in the sidebar to edit your name, institution, WhatsApp number, and notification preferences.',
  'billing': 'Visit the **Subscription** page to view plans and upgrade. Pro includes unlimited AI, patent search, and WhatsApp integration.',
  'geo': 'The **Geo Research** page tracks your research locations — conferences, field sites, universities — on a map.',
};

function getResponse(text) {
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(FAQ)) {
    if (lower.includes(key)) return val;
  }
  return "I'm here to help with CogniFlow! You can ask me about projects, gap analysis, viva prep, patent search, WhatsApp sharing, billing, or any other feature.";
}

export default function SupportChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'bot',
      text: "Hi! I'm your CogniFlow support assistant. How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: msg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const botMsg = {
        id: Date.now() + 1,
        role: 'bot',
        text: getResponse(msg),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(m => [...m, botMsg]);
      setTyping(false);
    }, 900 + Math.random() * 400);
  };

  const showQuickReplies = messages.length <= 2;

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl hover:shadow-violet-400/40 hover:shadow-2xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
        aria-label="Support chat"
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.span key="x" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}><X size={22} /></motion.span>
            : <motion.span key="msg" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><MessageCircle size={22} /></motion.span>
          }
        </AnimatePresence>
      </button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-24 right-6 z-50 w-80 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden"
            style={{ height: 460 }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3 flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white leading-tight">CogniFlow Support</p>
                <p className="text-xs text-violet-200">Always here to help</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-400 shadow shadow-green-400/50" />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={cn('flex gap-2 items-end', msg.role === 'user' ? 'flex-row-reverse' : '')}>
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                    msg.role === 'user' ? 'bg-violet-500' : 'bg-gray-100 dark:bg-slate-800'
                  )}>
                    {msg.role === 'user'
                      ? <User size={11} className="text-white" />
                      : <Bot size={11} className="text-violet-500" />
                    }
                  </div>
                  <div className={cn(
                    'max-w-[78%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-violet-500 text-white rounded-br-none'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-bl-none'
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex gap-2 items-end">
                  <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                    <Bot size={11} className="text-violet-500" />
                  </div>
                  <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl rounded-bl-none px-3 py-2.5 flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick replies */}
            {showQuickReplies && !typing && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {QUICK_REPLIES.map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-xs px-2.5 py-1 rounded-full border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-gray-100 dark:border-slate-800 px-3 py-2.5 flex gap-2 shrink-0">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Ask a question..."
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || typing}
                className="w-8 h-8 rounded-xl bg-violet-500 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <Send size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
