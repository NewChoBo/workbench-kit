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

export interface GetWorkspaceFileDraftInput {
  drafts: WorkspaceFileDraftMap;
  path: string;
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

export function getWorkspaceFileDraft({
  drafts,
  path,
}: GetWorkspaceFileDraftInput): WorkspaceFileDraft | undefined {
  const normalizedPath = normalizeWorkspacePath(path);
  return normalizedPath ? drafts[normalizedPath] : undefined;
}

export function getWorkspaceDirtyDraftPaths(drafts: WorkspaceFileDraftMap): readonly string[] {
  return Object.entries(drafts)
    .filter(([, draft]) => draft.content !== draft.savedContent)
    .map(([path]) => path)
    .sort((left, right) => left.localeCompare(right));
}

export function hasWorkspaceDirtyDrafts(drafts: WorkspaceFileDraftMap): boolean {
  return getWorkspaceDirtyDraftPaths(drafts).length > 0;
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

export interface DiscardWorkspaceDraftInput {
  drafts: WorkspaceFileDraftMap;
  path: string;
  fileContent: string;
}

export function discardWorkspaceDraft({
  drafts,
  path,
  fileContent,
}: DiscardWorkspaceDraftInput): WorkspaceFileDraftMap {
  const normalizedPath = normalizeWorkspacePath(path);
  if (!normalizedPath) return drafts;

  return {
    ...drafts,
    [normalizedPath]: createWorkspaceFileDraft(fileContent),
  };
}

export function discardWorkspaceFileDraft({
  drafts,
  file,
}: DiscardWorkspaceFileDraftInput): WorkspaceFileDraftMap {
  return discardWorkspaceDraft({
    drafts,
    path: file.path,
    fileContent: file.content,
  });
}
