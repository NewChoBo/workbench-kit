import {
  fileNameOfPath,
  getAvailableWorkspaceEntryName,
  isSimpleWorkspaceName,
  isWorkspaceEntryPathAvailable,
  joinWorkspacePath,
  parentPathOf,
  type WorkspaceFile,
  type WorkspaceSelectionState,
} from '@workbench-kit/workspace';

import type {
  WorkspaceExplorerInlineEditKind,
  WorkspaceExplorerInlineEditState,
} from './WorkspaceExplorer';

export interface WorkspaceExplorerWorkspaceSnapshot {
  readonly files: readonly WorkspaceFile[];
  readonly folders: readonly string[];
}

export interface WorkspaceExplorerMutationResult {
  readonly path?: string | undefined;
  readonly paths?: readonly string[] | undefined;
}

export type WorkspaceExplorerMutationAction = 'create' | 'rename' | 'delete' | 'move';

export interface WorkspaceExplorerControllerPort {
  readonly snapshot: WorkspaceExplorerWorkspaceSnapshot;
  /**
   * Optional host guard before create/rename/delete/move. Return `false` or a
   * reason string to deny the mutation; `true` allows it.
   */
  canMutatePath?(path: string, action: WorkspaceExplorerMutationAction): boolean | string;
  createFile(input: {
    name: string;
    parentPath: string;
  }): WorkspaceExplorerMutationResult | void | Promise<WorkspaceExplorerMutationResult | void>;
  createFolder(input: {
    name: string;
    parentPath: string;
  }): WorkspaceExplorerMutationResult | void | Promise<WorkspaceExplorerMutationResult | void>;
  deleteEntries(input: { kind: 'file' | 'folder'; paths: readonly string[] }): void | Promise<void>;
  moveEntries?(input: {
    sourcePaths: readonly string[];
    targetFolderPath: string;
  }): WorkspaceExplorerMutationResult | void | Promise<WorkspaceExplorerMutationResult | void>;
  openFile(path: string): void | Promise<void>;
  renameEntry(input: {
    kind: 'file' | 'folder';
    name: string;
    path: string;
  }): WorkspaceExplorerMutationResult | void | Promise<WorkspaceExplorerMutationResult | void>;
  reportError?(message: string): void;
}

export const DEFAULT_WORKSPACE_EXPLORER_MUTATION_DENIED_MESSAGE = 'This action is not allowed.';

/**
 * Normalize `canMutatePath` results. Returns an error message when denied, else
 * `undefined` when allowed (including when the guard is omitted).
 */
export function resolveWorkspaceExplorerMutationDeniedMessage(
  result: boolean | string | undefined,
): string | undefined {
  if (result === undefined || result === true) {
    return undefined;
  }

  if (typeof result === 'string') {
    return result;
  }

  return DEFAULT_WORKSPACE_EXPLORER_MUTATION_DENIED_MESSAGE;
}

export function workspaceExplorerParentPaths(path: string): string[] {
  const segments = path.split('/').filter(Boolean);
  return segments.slice(0, -1).map((_, index) => segments.slice(0, index + 1).join('/'));
}

export function applyWorkspaceExplorerMutationResult(
  result: WorkspaceExplorerMutationResult | void | undefined,
  setSelection: (selection: WorkspaceSelectionState) => void,
): void {
  const paths = result?.paths ?? (result?.path ? [result.path] : []);
  if (paths.length === 0) {
    return;
  }

  const focusedPath = paths[paths.length - 1];
  setSelection({
    anchorPath: focusedPath,
    focusedPath,
    paths: [...paths],
  });
}

/**
 * Folder clicks keep `paths` empty (file multi-select list). After renaming a
 * folder without a host `mapRenameSelection`, focus the folder the same way.
 */
export function applyWorkspaceExplorerFolderFocus(
  folderPath: string,
  setSelection: (selection: WorkspaceSelectionState) => void,
): void {
  if (!folderPath) {
    return;
  }

  setSelection({
    anchorPath: undefined,
    focusedPath: folderPath,
    paths: [],
  });
}

export function validateWorkspaceExplorerInlineEditName(
  name: string,
  invalidNameMessage = 'Use a simple file or folder name.',
): string | undefined {
  if (!isSimpleWorkspaceName(name)) {
    return invalidNameMessage;
  }

  return undefined;
}

export function isWorkspaceExplorerCreatePathAvailable(
  snapshot: WorkspaceExplorerWorkspaceSnapshot,
  parentPath: string,
  name: string,
): boolean {
  const path = joinWorkspacePath(parentPath, name);
  return isWorkspaceEntryPathAvailable({
    files: [...snapshot.files],
    folders: [...snapshot.folders],
    path,
  });
}

export function isWorkspaceExplorerRenamePathAvailable(
  snapshot: WorkspaceExplorerWorkspaceSnapshot,
  sourcePath: string,
  name: string,
): boolean {
  const destinationPath = joinWorkspacePath(parentPathOf(sourcePath), name);
  if (!sourcePath || !destinationPath || sourcePath === destinationPath) {
    return sourcePath === destinationPath;
  }

  return isWorkspaceEntryPathAvailable({
    excludedPaths: [sourcePath],
    files: [...snapshot.files],
    folders: [...snapshot.folders],
    path: destinationPath,
  });
}

export function createWorkspaceExplorerInlineEditDraft(
  snapshot: WorkspaceExplorerWorkspaceSnapshot,
  kind: Extract<WorkspaceExplorerInlineEditKind, 'create-file' | 'create-folder'>,
  parentPath = '',
): WorkspaceExplorerInlineEditState {
  const value = getAvailableWorkspaceEntryName({
    files: [...snapshot.files],
    folders: [...snapshot.folders],
    parentPath,
    preferredName: kind === 'create-file' ? 'untitled.md' : 'new-folder',
  });

  return {
    id: `${kind}:${parentPath}:${value}`,
    kind,
    parentPath,
    value,
  };
}

export function createWorkspaceExplorerRenameDraft(
  node: { path: string; type: 'file' | 'folder' },
  actionPaths: readonly string[] = [node.path],
): WorkspaceExplorerInlineEditState {
  const targetPath = actionPaths[0] ?? node.path;

  return {
    id: `rename:${targetPath}`,
    kind: node.type === 'folder' ? 'rename-folder' : 'rename-file',
    path: targetPath,
    value: fileNameOfPath(targetPath),
  };
}
