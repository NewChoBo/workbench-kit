import { workspaceExplorerParentPaths } from '@workbench-kit/react/workbench/workspace';
import type { WorkspaceSelectionState } from '@workbench-kit/workspace';

import {
  BUILTIN_EXPLORER_FOCUS_COMMAND_ID,
  BUILTIN_EXPLORER_REVEAL_COMMAND_ID,
  BUILTIN_EXPLORER_VIEW_CONTAINER_ID,
  resolveExplorerRevealPath,
} from './view-data.js';

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
