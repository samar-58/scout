"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { listProjects, type ProjectSummary } from "@/lib/scout-api";

interface ProjectsState {
  projects: ProjectSummary[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
}

const ProjectsContext = createContext<ProjectsState | undefined>(undefined);

/**
 * One projects fetch for the whole workspace.
 *
 * The sidebar is present on every signed-in route, so it cannot re-fetch per
 * navigation. This provider lives in the workspace layout — above the router
 * outlet — which means moving between the composer, the list, and a project
 * keeps the same data and the same scroll position in the nav.
 */
export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!isSignedIn) return;
    setError(undefined);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      setProjects(await listProjects(token));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load projects.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [isLoaded, isSignedIn, refresh]);

  const value = useMemo(
    () => ({ projects, loading, error, refresh }),
    [projects, loading, error, refresh],
  );

  return (
    <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
  );
}

export function useProjects(): ProjectsState {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used inside the workspace layout.");
  }
  return context;
}
