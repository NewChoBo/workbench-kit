import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  getWorkspaceDirtyDraftPaths,
  getWorkspaceFileDraft,
  type WorkspaceFileDraftMap,
  resolveWorkspaceFileDraft,
  updateWorkspaceFileDraft,
  saveWorkspaceFileDraft,
  discardWorkspaceDraft,
} from '@workbench-kit/workspace';

export interface WorkspaceDraftsContextValue {
  drafts: WorkspaceFileDraftMap;
  dirtyCount: number;
  dirtyPaths: readonly string[];
  getDraft: (path: string, fileContent: string) => string;
  hasDirtyDrafts: boolean;
  isDirty: (path: string, fileContent: string) => boolean;
  updateDraft: (path: string, content: string, fileContent: string) => void;
  saveDraft: (path: string, content: string) => void;
  discardDraft: (path: string, fileContent: string) => void;
  resetDrafts: (drafts?: WorkspaceFileDraftMap) => void;
}

export const WorkspaceDraftsContext = createContext<WorkspaceDraftsContextValue | null>(null);

export interface WorkspaceDraftsProviderProps {
  children: ReactNode;
  initialDrafts?: WorkspaceFileDraftMap | undefined;
}

export function useWorkspaceDraftController(
  initialDrafts: WorkspaceFileDraftMap = {},
): WorkspaceDraftsContextValue {
  const [drafts, setDrafts] = useState<WorkspaceFileDraftMap>(initialDrafts);
  const dirtyPaths = useMemo(() => getWorkspaceDirtyDraftPaths(drafts), [drafts]);

  const updateDraft = useCallback((path: string, content: string, fileContent: string) => {
    setDrafts((prev) => updateWorkspaceFileDraft({ content, drafts: prev, fileContent, path }));
  }, []);

  const saveDraft = useCallback((path: string, content: string) => {
    setDrafts((prev) => saveWorkspaceFileDraft({ content, drafts: prev, path }));
  }, []);

  const discardDraft = useCallback((path: string, fileContent: string) => {
    setDrafts((prev) => discardWorkspaceDraft({ drafts: prev, fileContent, path }));
  }, []);

  const resetDrafts = useCallback((nextDrafts: WorkspaceFileDraftMap = {}) => {
    setDrafts(nextDrafts);
  }, []);

  const getDraft = useCallback(
    (path: string, fileContent: string): string => {
      const draft = getWorkspaceFileDraft({ drafts, path });
      return resolveWorkspaceFileDraft({ draft, file: { path, content: fileContent } }).content;
    },
    [drafts],
  );

  const isDirty = useCallback(
    (path: string, fileContent: string): boolean => {
      const draft = getWorkspaceFileDraft({ drafts, path });
      return (
        resolveWorkspaceFileDraft({ draft, file: { path, content: fileContent } }).content !==
        fileContent
      );
    },
    [drafts],
  );

  return {
    dirtyCount: dirtyPaths.length,
    dirtyPaths,
    drafts,
    getDraft,
    hasDirtyDrafts: dirtyPaths.length > 0,
    isDirty,
    updateDraft,
    saveDraft,
    discardDraft,
    resetDrafts,
  };
}

export function WorkspaceDraftsProvider({ children, initialDrafts }: WorkspaceDraftsProviderProps) {
  const controller = useWorkspaceDraftController(initialDrafts);

  return (
    <WorkspaceDraftsContext.Provider value={controller}>{children}</WorkspaceDraftsContext.Provider>
  );
}

export function useWorkspaceDrafts(): WorkspaceDraftsContextValue {
  const context = useContext(WorkspaceDraftsContext);
  const localController = useWorkspaceDraftController();
  return context ?? localController;
}
