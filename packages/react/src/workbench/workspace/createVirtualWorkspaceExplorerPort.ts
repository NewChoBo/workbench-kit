import {
  getWorkspaceEntryMovePlan,
  joinWorkspacePath,
  parentPathOf,
  type WorkspaceSelectionState,
} from '@workbench-kit/workspace';

import type { VirtualWorkspaceApi } from './useVirtualWorkspace';
import type {
  WorkspaceExplorerControllerPort,
  WorkspaceExplorerMutationResult,
} from './workspaceExplorerController';

export function createVirtualWorkspaceExplorerPort({
  onNotify,
  workspace,
}: {
  onNotify?: (message: string) => void;
  workspace: VirtualWorkspaceApi;
}): WorkspaceExplorerControllerPort {
  const notify = onNotify ?? (() => undefined);

  return {
    snapshot: {
      files: workspace.files,
      folders: workspace.folders,
    },
    createFile({ name, parentPath }) {
      const path = joinWorkspacePath(parentPath, name);
      workspace.createFile({ content: '', path, source: 'user' });
      notify(`Created ${path}`);
      return { path };
    },
    createFolder({ name, parentPath }) {
      const path = joinWorkspacePath(parentPath, name);
      workspace.createFolder(path);
      notify(`Created folder ${path}`);
      return { path };
    },
    deleteEntries({ kind, paths }) {
      if (kind === 'folder') {
        paths.forEach((path) => workspace.deleteFolder(path));
        notify(`Deleted folder ${paths[0] ?? ''}`);
        return;
      }

      paths.forEach((path) => workspace.deleteFile(path));
      notify(
        paths.length === 1 ? `Deleted ${paths[0]}` : `Deleted ${paths.length} files`,
      );
    },
    moveEntries({ sourcePaths, targetFolderPath }) {
      const plan = getWorkspaceEntryMovePlan({
        files: workspace.files,
        folders: workspace.folders,
        sourcePaths,
        targetFolderPath,
      });

      plan.moves.forEach((move) => {
        if (move.kind === 'folder') {
          workspace.moveFolder(move.sourcePath, plan.targetFolderPath);
          return;
        }

        workspace.moveFile(move.sourcePath, plan.targetFolderPath);
      });

      const fileMoves = plan.moves.filter((move) => move.kind === 'file');
      const targetLabel = plan.targetFolderPath || 'workspace root';
      if (plan.moves.length === 0) {
        notify(`Move blocked for ${plan.blockedPaths.length} entries`);
        return undefined;
      }

      notify(
        plan.blockedPaths.length > 0
          ? `Moved ${plan.moves.length} entries to ${targetLabel}, blocked ${plan.blockedPaths.length}`
          : `Moved ${plan.moves.length} entries to ${targetLabel}`,
      );

      if (fileMoves.length === 0) {
        return undefined;
      }

      return {
        paths: fileMoves.map((move) => move.destinationPath),
      };
    },
    openFile(path) {
      workspace.openFile(path);
      notify(`Opened ${path}`);
    },
    renameEntry({ kind, name, path }) {
      const destinationPath = joinWorkspacePath(parentPathOf(path), name);
      if (kind === 'file') {
        workspace.renameFile(path, name);
        notify(`Renamed ${path} to ${destinationPath}`);
        return { path: destinationPath };
      }

      workspace.renameFolder(path, name);
      notify(`Renamed folder ${path} to ${destinationPath}`);
      return { path: destinationPath };
    },
    reportError(message) {
      notify(message);
    },
  };
}

export function applyVirtualWorkspaceRenameSelection(
  selection: WorkspaceSelectionState,
  sourcePath: string,
  destinationPath: string,
): WorkspaceSelectionState {
  const renameDescendantPath = (currentPath: string) =>
    currentPath === sourcePath
      ? destinationPath
      : currentPath.startsWith(`${sourcePath}/`)
        ? `${destinationPath}/${currentPath.slice(sourcePath.length + 1)}`
        : currentPath;

  return {
    anchorPath: selection.anchorPath ? renameDescendantPath(selection.anchorPath) : selection.anchorPath,
    focusedPath: selection.focusedPath
      ? renameDescendantPath(selection.focusedPath)
      : selection.focusedPath,
    paths: selection.paths.map(renameDescendantPath),
  };
}

export function toWorkspaceExplorerMutationResult(
  value: WorkspaceExplorerMutationResult | void | undefined,
): WorkspaceExplorerMutationResult | undefined {
  if (!value) {
    return undefined;
  }

  return value;
}
