import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plus, Trash2, Calendar, Globe, X, Navigation } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

const LOCATION_TYPES = ['Conference', 'Field Site', 'University', 'Lab', 'Library', 'Other'];

const TYPE_COLORS = {
  Conference:   'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  'Field Site': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  University:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  Lab:          'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  Library:      'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
  Other:        'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400',
};

const SAMPLE_LOCATIONS = [
  { id: 1, name: 'NeurIPS 2024', type: 'Conference', place: 'Vancouver, Canada', date: '2024-12-09', notes: 'Presented paper on LLM evaluation benchmarks.' },
  { id: 2, name: 'Oxford Bodleian Library', type: 'Library', place: 'Oxford, UK', date: '2024-09-15', notes: 'Historical manuscript research for Chapter 3.' },
  { id: 3, name: 'Stanford HAI', type: 'University', place: 'Stanford, CA, USA', date: '2025-01-20', notes: 'Collaboration with Prof. Johnson on AI safety.' },
  { id: 4, name: 'Amazon Rainforest Site A', type: 'Field Site', place: 'Manaus, Brazil', date: '2024-07-03', notes: 'Biodiversity sampling for climate study.' },
];

const BLANK_FORM = { name: '', type: 'Conference', place: '', date: '', notes: '' };

export default function GeoResearch() {
  const [locations, setLocations] = useState(SAMPLE_LOCATIONS);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('All');
  const [form, setForm] = useState(BLANK_FORM);
  const [expanded, setExpanded] = useState(null);

  const addLocation = () => {
    if (!form.name.trim() || !form.place.trim()) return;
    setLocations(prev => [...prev, { id: Date.now(), ...form }]);
    setForm(BLANK_FORM);
    setShowAdd(false);
  };

  const filtered = filter === 'All' ? locations : locations.filter(l => l.type === filter);

  const thisYear = new Date().getFullYear().toString();

  return (
    <div className="min-h-screen bg-violet-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <MapPin size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Geo Research</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">Track your global research locations</p>
            </div>
          </div>
          <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 rounded-xl">
            <Plus size={14} className="mr-1.5" /> Add Location
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm" style={{ height: 400 }}>
              <iframe
                src="https://www.openstreetmap.org/export/embed.html?bbox=-180,-85,180,85&layer=mapnik"
                width="100%"
                height="100%"
                title="Research Locations"
                className="border-0"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Locations', value: locations.length, icon: MapPin, color: 'text-emerald-500' },
                { label: 'Countries', value: new Set(locations.map(l => l.place.split(',').pop().trim())).size, icon: Globe, color: 'text-blue-500' },
                { label: 'This Year', value: locations.filter(l => (l.date || '').startsWith(thisYear)).length, icon: Calendar, color: 'text-violet-500' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 text-center shadow-sm">
                  <Icon size={18} className={cn('mx-auto mb-1', color)} />
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Location list */}
          <div>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {['All', ...LOCATION_TYPES].map(t => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-full border transition-colors',
                    filter === t
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-emerald-300'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filtered.map((loc, i) => (
                <motion.div
                  key={loc.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    'p-3 rounded-xl border bg-white dark:bg-slate-900 cursor-pointer transition-all',
                    expanded === loc.id
                      ? 'border-emerald-300 dark:border-emerald-700'
                      : 'border-gray-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800'
                  )}
                  onClick={() => setExpanded(expanded === loc.id ? null : loc.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <MapPin size={11} className="text-emerald-500 shrink-0" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{loc.name}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-1.5">{loc.place}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-xs border-0', TYPE_COLORS[loc.type] || TYPE_COLORS.Other)}>
                          {loc.type}
                        </Badge>
                        {loc.date && <span className="text-xs text-gray-400 dark:text-slate-500">{loc.date}</span>}
                      </div>
                      {expanded === loc.id && loc.notes && (
                        <p className="text-xs text-gray-600 dark:text-slate-300 mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                          {loc.notes}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setLocations(prev => prev.filter(l => l.id !== loc.id)); }}
                      className="text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors shrink-0 p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.div>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-10 text-gray-400 dark:text-slate-500">
                  <MapPin size={30} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No locations for this filter.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Research Location</h3>
                <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white"><X size={18} /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. ICML 2025" className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-400">
                      {LOCATION_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Date</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-400" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Location</label>
                  <div className="relative">
                    <Navigation size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={form.place} onChange={e => setForm(f => ({ ...f, place: e.target.value }))} placeholder="City, Country" className="w-full pl-8 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-400" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="What did you do here?" rows={2} className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-400 resize-none" />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <Button onClick={() => setShowAdd(false)} variant="outline" className="flex-1 rounded-xl border-gray-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</Button>
                <Button onClick={addLocation} disabled={!form.name.trim() || !form.place.trim()} className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90">Add Location</Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
