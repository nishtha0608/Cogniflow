import React, { createContext, useContext, useState, useEffect } from 'react';
import { cogniflow } from '@/api/cogniflowClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const { user } = useAuth();
  const [activeProjectId, setActiveProjectId] = useState(() =>
    localStorage.getItem('activeProjectId') || null
  );

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', user?.email],
    queryFn: () => cogniflow.entities.ResearchProject.list('-updated_date', 20),
    enabled: !!user,
    staleTime: 60_000,
  });

  // Auto-select first project if stored id no longer exists or nothing stored
  useEffect(() => {
    if (!projects.length) return;
    const exists = projects.find(p => p.id === activeProjectId);
    if (!exists) {
      const id = projects[0].id;
      setActiveProjectId(id);
      localStorage.setItem('activeProjectId', id);
    }
  }, [projects, activeProjectId]);

  const activeProject = projects.find(p => p.id === activeProjectId) ?? projects[0] ?? null;

  const selectProject = (id) => {
    setActiveProjectId(id);
    localStorage.setItem('activeProjectId', id);
  };

  return (
    <ProjectContext.Provider value={{ projects, activeProject, selectProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useActiveProject() {
  return useContext(ProjectContext);
}
