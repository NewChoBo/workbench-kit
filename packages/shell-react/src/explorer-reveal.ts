import type { WorkspaceSelectionState } from '@workbench-kit/workspace';

import {
  BUILTIN_EXPLORER_FOCUS_COMMAND_ID,
  BUILTIN_EXPLORER_REVEAL_COMMAND_ID,
  BUILTIN_EXPLORER_VIEW_CONTAINER_ID,
  resolveExplorerRevealPath,
} from './explorer-view-data.js';

export {
  BUILTIN_EXPLORER_FOCUS_COMMAND_ID,
  BUILTIN_EXPLORER_REVEAL_COMMAND_ID,
  BUILTIN_EXPLORER_VIEW_CONTAINER_ID,
  resolveExplorerRevealPath,
};

type ExplorerRevealListener = (path: string) => void;

let pendingRevealPath: string | undefined;
let revealListener: ExplorerRevealListener | undefined;

export function publishExplorerRevealRequest(path: string): void {
  const normalizedPath = path.trim();
  if (!normalizedPath) {
    return;
  }

  pendingRevealPath = normalizedPath;
  revealListener?.(normalizedPath);
}

export function subscribeExplorerRevealRequest(listener: ExplorerRevealListener): () => void {
  revealListener = listener;

  if (pendingRevealPath) {
    listener(pendingRevealPath);
    pendingRevealPath = undefined;
  }

  return () => {
    if (revealListener === listener) {
      revealListener = undefined;
    }
  };
}

export function applyExplorerPathReveal(
  path: string,
  {
    revealFolder,
    setSelection,
  }: {
    revealFolder: (folderPath: string) => void;
    setSelection: (selection: WorkspaceSelectionState) => void;
  },
): void {
  const normalizedPath = path.trim();
  if (!normalizedPath) {
    return;
  }

  workspaceExplorerParentPaths(normalizedPath).forEach((folderPath) => {
    revealFolder(folderPath);
  });
  setSelection({
    anchorPath: normalizedPath,
    focusedPath: normalizedPath,
    paths: [normalizedPath],
  });
}

function workspaceExplorerParentPaths(path: string): string[] {
  const segments = path.split('/').filter(Boolean);
  return segments.slice(0, -1).map((_, index) => segments.slice(0, index + 1).join('/'));
}

export function isExplorerHostCommand(commandId: string): boolean {
  return (
    commandId === BUILTIN_EXPLORER_REVEAL_COMMAND_ID ||
    commandId === BUILTIN_EXPLORER_FOCUS_COMMAND_ID
  );
}

export async function runExplorerHostCommandSideEffects(
  commandId: string,
  args: readonly unknown[],
  result: unknown,
  {
    focusExplorerView,
    revealPath,
  }: {
    focusExplorerView: () => void;
    revealPath: (path: string) => void;
  },
): Promise<void> {
  if (commandId === BUILTIN_EXPLORER_FOCUS_COMMAND_ID) {
    focusExplorerView();
    return;
  }

  if (commandId !== BUILTIN_EXPLORER_REVEAL_COMMAND_ID) {
    return;
  }

  const path = resolveExplorerRevealPath(args[0], result);
  if (!path) {
    return;
  }

  focusExplorerView();
  revealPath(path);
}
