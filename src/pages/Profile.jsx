import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, Building2, BookOpen, Save,
  Edit3, Check, Globe, MapPin, MessageCircle,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

const GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
];

export default function Profile() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    whatsapp: '',
    institution: '',
    department: '',
    researchField: '',
    bio: '',
    website: '',
    location: '',
    notifyEmail: true,
    notifyWhatsApp: false,
  });

  const gradient = GRADIENTS[(form.email?.length || 0) % GRADIENTS.length];
  const initials = (form.fullName || form.email || '?').substring(0, 2).toUpperCase();

  const handleSave = () => {
    setJustSaved(true);
    setEditing(false);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const Field = ({ icon: Icon, label, field, type = 'text', placeholder, readOnly = false }) => (
    <div>
      <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5 block">{label}</label>
      <div className="relative">
        <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type={type}
          value={form[field]}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          disabled={!editing || readOnly}
          placeholder={placeholder}
          className={cn(
            'w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border transition-colors',
            editing && !readOnly
              ? 'border-violet-300 dark:border-violet-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400/20'
              : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400',
            readOnly && 'opacity-60 cursor-not-allowed'
          )}
        />
      </div>
    </div>
  );

  const Toggle = ({ field, label, desc }) => (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-white">{label}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500">{desc}</p>
      </div>
      <button
        onClick={() => editing && setForm(f => ({ ...f, [field]: !f[field] }))}
        className={cn(
          'w-10 h-6 rounded-full transition-colors relative shrink-0',
          form[field] ? 'bg-violet-500' : 'bg-gray-200 dark:bg-slate-700',
          !editing && 'opacity-50 cursor-default'
        )}
      >
        <span className={cn(
          'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
          form[field] ? 'translate-x-5' : 'translate-x-1'
        )} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-violet-50 dark:bg-slate-950 p-6">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Manage your personal information and preferences</p>
        </motion.div>

        {/* Avatar card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 mb-4 shadow-sm">
          <div className="flex items-center gap-5">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{form.fullName || 'Researcher'}</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{form.email}</p>
              {form.institution && <p className="text-xs text-violet-500 mt-0.5 truncate">{form.institution}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {justSaved && (
                <span className="flex items-center gap-1 text-sm text-emerald-500 font-medium">
                  <Check size={14} /> Saved
                </span>
              )}
              {editing ? (
                <Button onClick={handleSave} className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90 rounded-xl">
                  <Save size={14} className="mr-1.5" /> Save
                </Button>
              ) : (
                <Button onClick={() => setEditing(true)} variant="outline" className="rounded-xl border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 dark:hover:bg-slate-800">
                  <Edit3 size={14} className="mr-1.5" /> Edit
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Fields */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 mb-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-white mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field icon={User} label="Full Name" field="fullName" placeholder="Dr. Jane Smith" />
            <Field icon={Mail} label="Email" field="email" readOnly />
            <Field icon={Phone} label="Phone Number" field="phone" type="tel" placeholder="+1 (555) 000-0000" />
            <Field icon={MessageCircle} label="WhatsApp Number" field="whatsapp" type="tel" placeholder="+1 (555) 000-0000" />
            <Field icon={Building2} label="Institution" field="institution" placeholder="MIT, Stanford..." />
            <Field icon={BookOpen} label="Department" field="department" placeholder="Computer Science..." />
            <Field icon={BookOpen} label="Research Field" field="researchField" placeholder="NLP, Bioinformatics..." />
            <Field icon={MapPin} label="Location" field="location" placeholder="Cambridge, MA" />
            <div className="sm:col-span-2">
              <Field icon={Globe} label="Website / ORCID" field="website" placeholder="https://orcid.org/0000-0000-0000-0000" />
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5 block">Research Bio</label>
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              disabled={!editing}
              placeholder="Brief description of your research interests..."
              rows={3}
              className={cn(
                'w-full px-4 py-2.5 text-sm rounded-xl border transition-colors resize-none',
                editing
                  ? 'border-violet-300 dark:border-violet-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400/20'
                  : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400'
              )}
            />
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-white mb-2">Notification Preferences</h3>
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            <Toggle field="notifyEmail" label="Email notifications" desc="Receive research updates and digests via email" />
            <Toggle field="notifyWhatsApp" label="WhatsApp notifications" desc="Get alerts and research summaries on WhatsApp" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
