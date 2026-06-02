import { normalizeWorkspacePath } from './path';
import type { WorkspaceFile } from './types';

export interface WorkspaceFileDraft {
  content: string;
  savedContent: string;
}

export type WorkspaceFileDraftMap = Record<string, WorkspaceFileDraft>;

export interface ResolveWorkspaceFileDraftInput {
  draft?: WorkspaceFileDraft;
  file: WorkspaceFile;
}

export interface UpdateWorkspaceFileDraftInput {
  content: string;
  drafts: WorkspaceFileDraftMap;
  fileContent: string;
  path: string;
}

export interface SaveWorkspaceFileDraftInput {
  content: string;
  drafts: WorkspaceFileDraftMap;
  path: string;
}

export interface DiscardWorkspaceFileDraftInput {
  drafts: WorkspaceFileDraftMap;
  file: WorkspaceFile;
}

export function createWorkspaceFileDraft(content: string): WorkspaceFileDraft {
  return {
    content,
    savedContent: content,
  };
}

export function resolveWorkspaceFileDraft({
  draft,
  file,
}: ResolveWorkspaceFileDraftInput): WorkspaceFileDraft {
  if (!draft) {
    return createWorkspaceFileDraft(file.content);
  }

  if (draft.savedContent !== file.content && draft.content === draft.savedContent) {
    return createWorkspaceFileDraft(file.content);
  }

  return draft;
}

export function isWorkspaceFileDraftDirty(file: WorkspaceFile, draft?: WorkspaceFileDraft) {
  return resolveWorkspaceFileDraft({ draft, file }).content !== file.content;
}

export function updateWorkspaceFileDraft({
  content,
  drafts,
  fileContent,
  path,
}: UpdateWorkspaceFileDraftInput): WorkspaceFileDraftMap {
  const normalizedPath = normalizeWorkspacePath(path);
  if (!normalizedPath) return drafts;

  const currentDraft = drafts[normalizedPath] ?? createWorkspaceFileDraft(fileContent);

  return {
    ...drafts,
    [normalizedPath]: {
      ...currentDraft,
      content,
    },
  };
}

export function saveWorkspaceFileDraft({
  content,
  drafts,
  path,
}: SaveWorkspaceFileDraftInput): WorkspaceFileDraftMap {
  const normalizedPath = normalizeWorkspacePath(path);
  if (!normalizedPath) return drafts;

  return {
    ...drafts,
    [normalizedPath]: createWorkspaceFileDraft(content),
  };
}

export function discardWorkspaceFileDraft({
  drafts,
  file,
}: DiscardWorkspaceFileDraftInput): WorkspaceFileDraftMap {
  const normalizedPath = normalizeWorkspacePath(file.path);
  if (!normalizedPath) return drafts;

  return {
    ...drafts,
    [normalizedPath]: createWorkspaceFileDraft(file.content),
  };
}
