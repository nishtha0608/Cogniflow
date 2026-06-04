import React, { createContext, useContext, useState, useEffect } from 'react';
import { cogniflow } from '@/api/cogniflowClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const { user } = useAuth();
  const [activeProjectId, setActiveProjectId] = useState(() => {
    const stored = localStorage.getItem('activeProjectId');
    return stored === 'null' ? null : (stored || null);
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', user?.email],
    queryFn: () => cogniflow.entities.ResearchProject.list('-updated_date', 20),
    enabled: !!user,
    staleTime: 60_000,
  });

  // Only auto-select if we have a stored ID that no longer exists (deleted project)
  useEffect(() => {
    if (!projects.length || activeProjectId === null) return;
    const exists = projects.find(p => p.id === activeProjectId);
    if (!exists) {
      setActiveProjectId(null);
      localStorage.setItem('activeProjectId', 'null');
    }
  }, [projects, activeProjectId]);

  const activeProject = activeProjectId
    ? (projects.find(p => p.id === activeProjectId) ?? null)
    : null;

  const selectProject = (id) => {
    setActiveProjectId(id);
    localStorage.setItem('activeProjectId', id ?? 'null');
  };

  const clearProject = () => {
    setActiveProjectId(null);
    localStorage.setItem('activeProjectId', 'null');
  };

  return (
    <ProjectContext.Provider value={{ projects, activeProject, selectProject, clearProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useActiveProject() {
  return useContext(ProjectContext);
}
