import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Send, Check, MessageCircle, Share2, Plus, Trash2, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

const TEMPLATES = [
  {
    id: 'paper',
    label: 'Share Paper',
    icon: '📄',
    build: (msg) => `📄 *Research Paper Share*\n\n${msg || 'Check out this paper I found!'}\n\n_Shared via CogniFlow_`,
  },
  {
    id: 'finding',
    label: 'Key Finding',
    icon: '💡',
    build: (msg) => `💡 *Key Research Finding*\n\n${msg || 'Interesting discovery...'}\n\n_Shared via CogniFlow_`,
  },
  {
    id: 'update',
    label: 'Research Update',
    icon: '📋',
    build: (msg) => `📋 *Research Update*\n\n${msg || 'Latest progress update...'}\n\n_Shared via CogniFlow_`,
  },
];

const DEFAULT_CONTACTS = [
  { id: 1, name: 'Dr. Sarah Chen', phone: '+12345678901', tag: 'Collaborator' },
  { id: 2, name: 'Prof. Ahmed Hassan', phone: '+9876543210', tag: 'Supervisor' },
];

export default function WhatsApp() {
  const [contacts, setContacts] = useState(DEFAULT_CONTACTS);
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [message, setMessage] = useState('');
  const [directPhone, setDirectPhone] = useState('');
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [recentShares, setRecentShares] = useState([]);

  const openWhatsApp = (phone, text) => {
    const clean = phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(text);
    window.open(
      clean ? `https://wa.me/${clean}?text=${encoded}` : `https://wa.me/?text=${encoded}`,
      '_blank'
    );
    setRecentShares(s => [
      { id: Date.now(), to: phone || 'anyone', snippet: text.slice(0, 70), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ...s.slice(0, 9),
    ]);
  };

  const shareGeneral = () => {
    const text = template.build(message);
    openWhatsApp(directPhone, text);
  };

  const shareToContact = (contact) => {
    const text = template.build(message || `Hello ${contact.name}, sharing this research content with you.`);
    openWhatsApp(contact.phone, text);
  };

  const addContact = () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) return;
    setContacts(c => [...c, { id: Date.now(), ...newContact, tag: 'Contact' }]);
    setNewContact({ name: '', phone: '' });
    setShowAdd(false);
  };

  return (
    <div className="min-h-screen bg-violet-50 dark:bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <MessageCircle size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WhatsApp</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">Share research content with colleagues via WhatsApp</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Compose */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-white mb-3">Compose Message</h3>

              {/* Templates */}
              <div className="flex gap-2 mb-4">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t)}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-all',
                      template.id === t.id
                        ? 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-green-300 dark:hover:border-green-700'
                    )}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your research content or message..."
                rows={5}
                className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-green-400 resize-none mb-3"
              />

              {/* Preview */}
              {message && (
                <div className="mb-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-xs text-gray-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                  {template.build(message)}
                </div>
              )}

              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={directPhone}
                    onChange={e => setDirectPhone(e.target.value)}
                    placeholder="+1 555 000 0000 (optional)"
                    className="w-full pl-8 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-400"
                  />
                </div>
                <Button onClick={shareGeneral} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90 rounded-xl px-5">
                  <Share2 size={14} className="mr-1.5" /> Share
                </Button>
              </div>
            </div>

            {/* Recent shares */}
            {recentShares.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-white mb-3">Recent Shares</h3>
                <div className="space-y-2">
                  {recentShares.map(s => (
                    <div key={s.id} className="flex items-center gap-3 text-xs py-1.5">
                      <Check size={12} className="text-green-500 shrink-0" />
                      <span className="text-gray-400 dark:text-slate-500 shrink-0">{s.time}</span>
                      <span className="text-gray-600 dark:text-slate-300 truncate">{s.snippet}…</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Contacts */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-white">Research Contacts</h3>
                <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-green-600 dark:text-green-400 font-medium hover:underline">
                  + Add
                </button>
              </div>

              {showAdd && (
                <div className="mb-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 space-y-2">
                  <input
                    value={newContact.name}
                    onChange={e => setNewContact(n => ({ ...n, name: e.target.value }))}
                    placeholder="Name"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:border-green-400"
                  />
                  <input
                    value={newContact.phone}
                    onChange={e => setNewContact(n => ({ ...n, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:border-green-400"
                  />
                  <Button onClick={addContact} size="sm" className="w-full bg-green-500 text-white hover:opacity-90 rounded-lg text-xs">
                    Save Contact
                  </Button>
                </div>
              )}

              <div className="space-y-1">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 group transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {c.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 dark:text-white truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{c.phone}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => shareToContact(c)}
                        className="p-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 transition-colors"
                        title="Send message"
                      >
                        <Send size={11} />
                      </button>
                      <button
                        onClick={() => setContacts(cs => cs.filter(x => x.id !== c.id))}
                        className="p-1.5 rounded-lg text-gray-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 p-4">
              <h3 className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Tips</h3>
              <ul className="space-y-1.5 text-xs text-green-700 dark:text-green-300">
                <li>• Leave the phone field empty to open WhatsApp and pick a contact yourself</li>
                <li>• Save frequent collaborators in Research Contacts for one-click sharing</li>
                <li>• Use the Paper template when sharing citations from Paper Search</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
