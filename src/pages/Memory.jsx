import React, { useState } from 'react';
import { cogniflow } from '@/api/cogniflowClient';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useActiveProject } from '@/lib/ProjectContext';
import {
  Clock,
  FileText,
  MessageSquare,
  Target,
  Calendar,
  ChevronRight,
  Search,
  Filter,
  Brain,
  Edit3,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  FolderOpen,
  Layers,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isValid } from 'date-fns';

export default function Memory() {
  const [filterType, setFilterType] = useState('all');
  const [filterProject, setFilterProject] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const { projects, activeProject } = useActiveProject();

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', user?.email],
    queryFn: () => cogniflow.entities.Document.list('-updated_date', 50),
    enabled: !!user,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.email],
    queryFn: () => cogniflow.entities.Conversation.list('-updated_date', 50),
    enabled: !!user,
  });

  const { data: gaps = [] } = useQuery({
    queryKey: ['gaps', user?.email],
    queryFn: () => cogniflow.entities.ResearchGap.list('-created_date', 50),
    enabled: !!user,
  });

  const resolvedProjectId = filterProject === 'active' ? activeProject?.id : filterProject === 'all' ? null : filterProject;

  // Combine all activities into a timeline
  const activities = [
    ...documents.map(d => ({
      id: d.id,
      type: 'document',
      title: d.title,
      description: `${d.word_count || 0} words`,
      date: d.updated_date,
      project_id: d.project_id,
      icon: FileText,
      color: 'blue'
    })),
    ...conversations.map(c => ({
      id: c.id,
      type: 'conversation',
      title: c.title,
      description: `${c.messages?.length || 0} messages`,
      date: c.updated_date,
      project_id: c.project_id,
      icon: MessageSquare,
      color: 'emerald'
    })),
    ...gaps.map(g => ({
      id: g.id,
      type: 'gap',
      title: g.title,
      description: g.gap_type,
      date: g.created_date,
      project_id: g.project_id,
      icon: Target,
      color: 'amber'
    }))
  ]
    .filter(a => a.date && isValid(new Date(a.date)))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredActivities = activities
    .filter(a => filterType === 'all' || a.type === filterType)
    .filter(a => !resolvedProjectId || a.project_id === resolvedProjectId)
    .filter(a => !searchQuery || (a.title || '').toLowerCase().includes(searchQuery.toLowerCase()));

  // Group by date
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = format(new Date(activity.date), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(activity);
    return groups;
  }, {});

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Research Memory</h1>
          <p className="text-gray-500 dark:text-slate-400 mb-4">Track your research journey and revisit past insights</p>
          
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your research history..."
                className="pl-10 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>

            {/* Project filter */}
            {projects.length > 1 && (
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-52 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-slate-100">
                  <FolderOpen size={14} className="mr-2 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    {activeProject ? `${activeProject.title.slice(0, 22)}…` : 'Active project'}
                  </SelectItem>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.filter(p => p.id !== activeProject?.id).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title.slice(0, 28)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-44 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-slate-100">
                <Filter size={14} className="mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="conversation">Conversations</SelectItem>
                <SelectItem value="gap">Research Gaps</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-6">
          {Object.entries(groupedActivities).map(([date, items]) => (
            <div key={date} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Calendar size={16} className="text-gray-400 dark:text-slate-500" />
                <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400">
                  {isValid(new Date(date)) ? format(new Date(date), 'EEEE, MMMM d, yyyy') : date}
                </h3>
                <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
              </div>

              <div className="space-y-3 pl-6 border-l-2 border-gray-200 dark:border-slate-700">
                {items.map((activity) => (
                  <ActivityCard key={`${activity.type}-${activity.id}`} activity={activity} />
                ))}
              </div>
            </div>
          ))}

          {filteredActivities.length === 0 && (
            <div className="text-center py-16">
              <Clock size={48} className="mx-auto text-gray-400 dark:text-slate-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Activity Found</h3>
              <p className="text-gray-500 dark:text-slate-400">
                Your research activities will appear here
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Insights Panel */}
      <div className="border-t border-gray-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-4 gap-4">
            <InsightCard
              icon={FileText}
              label="Documents"
              value={documents.length}
              color="blue"
            />
            <InsightCard
              icon={MessageSquare}
              label="Conversations"
              value={conversations.length}
              color="emerald"
            />
            <InsightCard
              icon={Target}
              label="Gaps Identified"
              value={gaps.length}
              color="amber"
            />
            <InsightCard
              icon={Brain}
              label="Total Words"
              value={documents.reduce((sum, d) => sum + (d.word_count || 0), 0).toLocaleString()}
              color="violet"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityCard({ activity }) {
  const Icon = activity.icon;
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  };

  return (
    <Card className="bg-white/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 transition-all cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={cn("p-2 rounded-lg border", colorClasses[activity.color])}>
            <Icon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white truncate">{activity.title}</h4>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{activity.description}</p>
              </div>
              <span className="text-xs text-gray-400 dark:text-slate-500 flex-shrink-0">
                {isValid(new Date(activity.date))
                  ? formatDistanceToNow(new Date(activity.date), { addSuffix: true })
                  : ''}
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-400 dark:text-slate-500 group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    violet: 'text-violet-400',
  };

  return (
    <div className="p-4 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-gray-300/50 dark:border-slate-700/50">
      <div className="flex items-center gap-3">
        <Icon size={18} className={colorClasses[color]} />
        <div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
