import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  type WorkspaceFileDraftMap,
  resolveWorkspaceFileDraft,
  updateWorkspaceFileDraft,
  saveWorkspaceFileDraft,
  discardWorkspaceDraft,
} from '@workbench-kit/workspace';

export interface WorkspaceDraftsContextValue {
  drafts: WorkspaceFileDraftMap;
  getDraft: (path: string, fileContent: string) => string;
  isDirty: (path: string, fileContent: string) => boolean;
  updateDraft: (path: string, content: string, fileContent: string) => void;
  saveDraft: (path: string, content: string) => void;
  discardDraft: (path: string, fileContent: string) => void;
}

export const WorkspaceDraftsContext = createContext<WorkspaceDraftsContextValue | null>(null);

export interface WorkspaceDraftsProviderProps {
  children: ReactNode;
}

export function WorkspaceDraftsProvider({ children }: WorkspaceDraftsProviderProps) {
  const [drafts, setDrafts] = useState<WorkspaceFileDraftMap>({});

  const updateDraft = (path: string, content: string, fileContent: string) => {
    setDrafts((prev) => updateWorkspaceFileDraft({ content, drafts: prev, fileContent, path }));
  };

  const saveDraft = (path: string, content: string) => {
    setDrafts((prev) => saveWorkspaceFileDraft({ content, drafts: prev, path }));
  };

  const discardDraft = (path: string, fileContent: string) => {
    setDrafts((prev) => discardWorkspaceDraft({ drafts: prev, fileContent, path }));
  };

  const getDraft = (path: string, fileContent: string): string => {
    const draft = drafts[path];
    return resolveWorkspaceFileDraft({ draft, file: { path, content: fileContent } }).content;
  };

  const isDirty = (path: string, fileContent: string): boolean => {
    const draft = drafts[path];
    return (
      resolveWorkspaceFileDraft({ draft, file: { path, content: fileContent } }).content !==
      fileContent
    );
  };

  return (
    <WorkspaceDraftsContext.Provider
      value={{
        drafts,
        getDraft,
        isDirty,
        updateDraft,
        saveDraft,
        discardDraft,
      }}
    >
      {children}
    </WorkspaceDraftsContext.Provider>
  );
}

export function useWorkspaceDrafts(): WorkspaceDraftsContextValue {
  const context = useContext(WorkspaceDraftsContext);
  if (context) return context;

  // Context fallback
  const [localDrafts, setLocalDrafts] = useState<WorkspaceFileDraftMap>({});

  const updateDraft = (path: string, content: string, fileContent: string) => {
    setLocalDrafts((prev) =>
      updateWorkspaceFileDraft({ content, drafts: prev, fileContent, path }),
    );
  };

  const saveDraft = (path: string, content: string) => {
    setLocalDrafts((prev) => saveWorkspaceFileDraft({ content, drafts: prev, path }));
  };

  const discardDraft = (path: string, fileContent: string) => {
    setLocalDrafts((prev) => discardWorkspaceDraft({ drafts: prev, fileContent, path }));
  };

  const getDraft = (path: string, fileContent: string): string => {
    const draft = localDrafts[path];
    return resolveWorkspaceFileDraft({ draft, file: { path, content: fileContent } }).content;
  };

  const isDirty = (path: string, fileContent: string): boolean => {
    const draft = localDrafts[path];
    return (
      resolveWorkspaceFileDraft({ draft, file: { path, content: fileContent } }).content !==
      fileContent
    );
  };

  return {
    drafts: localDrafts,
    getDraft,
    isDirty,
    updateDraft,
    saveDraft,
    discardDraft,
  };
}
