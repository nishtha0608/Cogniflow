import React from 'react';
import { cogniflow } from '@/api/cogniflowClient';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Target,
  Clock,
  Calendar,
  Activity,
  Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';

const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981'];

export default function Analytics() {
  const { data: documents = [] } = useQuery({
    queryKey: ['allDocuments'],
    queryFn: () => cogniflow.entities.Document.list('-created_date', 100),
  });

  const { data: gaps = [] } = useQuery({
    queryKey: ['allGaps'],
    queryFn: () => cogniflow.entities.ResearchGap.list('-created_date', 100),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['allConversations'],
    queryFn: () => cogniflow.entities.Conversation.list('-created_date', 100),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => cogniflow.entities.ResearchProject.list('-updated_date', 10),
  });

  // Calculate metrics
  const totalWords = documents.reduce((sum, d) => sum + (d.word_count || 0), 0);
  const avgWordsPerDoc = documents.length ? Math.round(totalWords / documents.length) : 0;

  // Gap type distribution
  const gapTypeData = ['methodological', 'theoretical', 'empirical', 'contextual', 'temporal']
    .map(type => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: gaps.filter(g => g.gap_type === type).length
    }))
    .filter(d => d.value > 0);

  // Activity over time (last 14 days)
  const last14Days = eachDayOfInterval({
    start: subDays(new Date(), 13),
    end: new Date()
  });

  const activityData = last14Days.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const docsCount = documents.filter(d => 
      format(new Date(d.created_date), 'yyyy-MM-dd') === dateStr
    ).length;
    const convsCount = conversations.filter(c => 
      format(new Date(c.created_date), 'yyyy-MM-dd') === dateStr
    ).length;
    
    return {
      date: format(date, 'MMM d'),
      documents: docsCount,
      conversations: convsCount
    };
  });

  // Document type distribution
  const docTypeData = ['draft', 'literature', 'notes', 'reference']
    .map(type => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: documents.filter(d => d.type === type).length
    }))
    .filter(d => d.value > 0);

  // Project progress
  const projectProgressData = projects.slice(0, 5).map(p => ({
    name: p.title.length > 20 ? p.title.slice(0, 20) + '...' : p.title,
    progress: p.progress || 0
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Research Analytics</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Track your research progress and productivity</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={FileText}
          label="Total Documents"
          value={documents.length}
          color="blue"
        />
        <MetricCard
          icon={Target}
          label="Gaps Identified"
          value={gaps.length}
          color="amber"
        />
        <MetricCard
          icon={Activity}
          label="Total Words"
          value={totalWords.toLocaleString()}
          color="emerald"
        />
        <MetricCard
          icon={Award}
          label="AI Sessions"
          value={conversations.length}
          color="violet"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Activity Over Time */}
        <Card className="bg-white/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-400" />
              Activity Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="documents" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="conversations" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gap Distribution */}
        <Card className="bg-white/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target size={16} className="text-amber-400" />
              Research Gap Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {gapTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gapTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {gapTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 dark:text-slate-500">No gaps identified yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Project Progress */}
        <Card className="bg-white/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 size={16} className="text-violet-400" />
              Project Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {projectProgressData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectProgressData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={100} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="progress" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-400 dark:text-slate-500">No projects yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Document Types */}
        <Card className="bg-white/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText size={16} className="text-emerald-400" />
              Document Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {docTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={docTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-400 dark:text-slate-500">No documents yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Writing Stats */}
      <Card className="bg-white/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base">Writing Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Average Words per Document</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{avgWordsPerDoc.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Total Writing Sessions</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{documents.filter(d => d.type === 'draft').length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Literature Reviewed</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{documents.filter(d => d.type === 'literature').length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    amber: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
    emerald: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
    violet: 'from-violet-500/20 to-purple-500/20 border-violet-500/30',
  };

  const iconColors = {
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    violet: 'text-violet-400',
  };

  return (
    <Card className={`bg-gradient-to-br ${colorClasses[color]} border`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Icon size={20} className={iconColors[color]} />
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
