import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Video, Plus, Trash2, Clock, Download, Play, Link as LinkIcon, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

const STARTER_VIDEOS = [
  {
    id: 1,
    url: 'https://www.youtube.com/watch?v=aircAruvnKk',
    title: 'Neural Networks — 3Blue1Brown',
    notes: [
      { id: 11, text: 'Introduces the concept of layers and neurons', timestamp: 45, createdAt: '10:02 AM' },
      { id: 12, text: 'Activation functions explained visually', timestamp: 210, createdAt: '10:05 AM' },
    ],
  },
];

export default function VideoNotes() {
  const [videoUrl, setVideoUrl] = useState('');
  const [videos, setVideos] = useState(STARTER_VIDEOS);
  const [activeVideo, setActiveVideo] = useState(STARTER_VIDEOS[0]);
  const [notes, setNotes] = useState(STARTER_VIDEOS[0].notes);
  const [newNote, setNewNote] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const counterRef = useRef(null);

  const simulateTick = () => {
    setCurrentTimestamp(t => t + 1);
  };

  const startTimer = () => {
    if (!counterRef.current) {
      counterRef.current = setInterval(simulateTick, 1000);
    }
  };

  const stopTimer = () => {
    clearInterval(counterRef.current);
    counterRef.current = null;
  };

  const loadVideo = (e) => {
    e.preventDefault();
    const ytId = getYouTubeId(videoUrl);
    if (!ytId) return;
    const newVid = {
      id: Date.now(),
      url: videoUrl,
      title: `Video ${videos.length + 1}`,
      notes: [],
    };
    setVideos(v => [...v, newVid]);
    setActiveVideo(newVid);
    setNotes([]);
    setVideoUrl('');
    setCurrentTimestamp(0);
    stopTimer();
  };

  const selectVideo = (v) => {
    setActiveVideo(v);
    setNotes(v.notes || []);
    setCurrentTimestamp(0);
    stopTimer();
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const note = {
      id: Date.now(),
      text: newNote.trim(),
      timestamp: currentTimestamp,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [...notes, note];
    setNotes(updated);
    setVideos(vs => vs.map(v =>
      v.id === activeVideo?.id ? { ...v, notes: updated } : v
    ));
    setNewNote('');
  };

  const deleteNote = (id) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    setVideos(vs => vs.map(v =>
      v.id === activeVideo?.id ? { ...v, notes: updated } : v
    ));
  };

  const exportNotes = () => {
    if (!notes.length) return;
    const text = `Video Notes: ${activeVideo?.title || 'Untitled'}\n\n` +
      notes.map(n => `[${formatTime(n.timestamp)}] ${n.text}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'video-notes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeYoutubeId = activeVideo ? getYouTubeId(activeVideo.url) : null;

  return (
    <div className="min-h-screen bg-violet-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
              <Video size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Video Notes</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">Watch lectures and take timestamped notes</p>
            </div>
          </div>
        </motion.div>

        {/* Add video */}
        <form onSubmit={loadVideo} className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <LinkIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="Paste a YouTube URL..."
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
            />
          </div>
          <Button type="submit" disabled={!videoUrl.trim()} className="bg-gradient-to-r from-red-500 to-rose-600 text-white hover:opacity-90 rounded-xl px-5">
            <Plus size={15} className="mr-1.5" /> Add Video
          </Button>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video list */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-3">Saved Videos</h3>
            <div className="space-y-2">
              {videos.map(v => {
                const ytId = getYouTubeId(v.url);
                return (
                  <button
                    key={v.id}
                    onClick={() => selectVideo(v)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all',
                      activeVideo?.id === v.id
                        ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-red-200 dark:hover:border-red-800'
                    )}
                  >
                    {ytId && (
                      <img
                        src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                        alt=""
                        className="w-full aspect-video object-cover rounded-lg mb-2"
                      />
                    )}
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{v.title}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{(v.notes || []).length} notes</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player + notes */}
          <div className="lg:col-span-2 space-y-4">
            {activeYoutubeId ? (
              <div className="bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${activeYoutubeId}?enablejsapi=1`}
                  className="w-full h-full"
                  allowFullScreen
                  title={activeVideo?.title || 'Video'}
                />
              </div>
            ) : (
              <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
                <div className="text-center text-gray-400 dark:text-slate-500">
                  <Play size={40} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Select or add a video to begin</p>
                </div>
              </div>
            )}

            {/* Timestamp controls */}
            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono text-gray-500 dark:text-slate-400 text-sm">
                <Clock size={13} className="inline mr-1" />
                {formatTime(currentTimestamp)}
              </span>
              <button onClick={startTimer} className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs hover:opacity-90">Play</button>
              <button onClick={stopTimer} className="px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 text-xs hover:border-red-300 transition-colors">Pause</button>
              <button onClick={() => { setCurrentTimestamp(0); stopTimer(); }} className="px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 text-xs hover:border-red-300 transition-colors">Reset</button>
              <span className="text-xs text-gray-400 dark:text-slate-500">(Use Play/Pause to sync with video)</span>
            </div>

            {/* Notes panel */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-white flex items-center gap-2">
                  <FileText size={14} /> Notes ({notes.length})
                </h3>
                {notes.length > 0 && (
                  <button
                    onClick={exportNotes}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                  >
                    <Download size={12} /> Export
                  </button>
                )}
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addNote()}
                  placeholder={`Note at ${formatTime(currentTimestamp)}... (Enter to add)`}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-red-400"
                />
                <Button onClick={addNote} disabled={!newNote.trim()} size="sm" className="bg-gradient-to-r from-red-500 to-rose-600 text-white hover:opacity-90 rounded-lg">
                  Add
                </Button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-6">
                    No notes yet. Start the timer and add notes as you watch!
                  </p>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800 group">
                      <span className="flex items-center gap-1 text-xs text-red-500 font-mono mt-0.5 shrink-0 min-w-[40px]">
                        {formatTime(note.timestamp)}
                      </span>
                      <p className="flex-1 text-sm text-gray-700 dark:text-slate-300">{note.text}</p>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
