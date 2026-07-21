import { useCallback, useMemo, useState } from 'react';
import {
  pruneWorkspaceSelection,
  type WorkspaceSelectionState,
  type WorkspaceTreeNode,
} from '@workbench-kit/workspace';

import type {
  WorkspaceExplorerItemKeyboardActionMeta,
  WorkspaceExplorerSelectionChangeMeta,
} from '../workspace/WorkspaceExplorer';
import {
  applyVirtualWorkspaceRenameSelection,
  createVirtualWorkspaceExplorerPort,
} from '../workspace/createVirtualWorkspaceExplorerPort';
import { useWorkspaceExplorerController } from '../workspace/useWorkspaceExplorerController';
import type { VirtualWorkspaceApi } from '../workspace/useVirtualWorkspace';

export interface IntegratedShellPendingDelete {
  paths: string[];
  type: 'files' | 'folder';
}

export interface UseIntegratedShellWorkspaceOrchestrationOptions {
  defaultSelectionPath: string;
  onNotify: (message: string) => void;
  workspace: VirtualWorkspaceApi;
}

export interface IntegratedShellWorkspaceOrchestration {
  activateFile: (path: string) => void;
  deleteFile: (path: string) => void;
  deleteFiles: (paths: string[]) => void;
  confirmPendingDelete: () => void;
  explorerInlineEdit: ReturnType<typeof useWorkspaceExplorerController>['inlineEdit'];
  explorerSelection: WorkspaceSelectionState;
  handleExplorerInlineEditCommit: ReturnType<
    typeof useWorkspaceExplorerController
  >['handleInlineEditCommit'];
  handleExplorerInlineEditValueChange: ReturnType<
    typeof useWorkspaceExplorerController
  >['handleInlineEditValueChange'];
  handleExplorerRequestDelete: ReturnType<
    typeof useWorkspaceExplorerController
  >['handleRequestDelete'];
  handleExplorerRequestMove: ReturnType<typeof useWorkspaceExplorerController>['handleRequestMove'];
  handleExplorerRequestRename: ReturnType<
    typeof useWorkspaceExplorerController
  >['handleRequestRename'];
  handleExplorerSelectionChange: (
    selection: WorkspaceSelectionState,
    meta: WorkspaceExplorerSelectionChangeMeta,
  ) => void;
  pendingDelete: IntegratedShellPendingDelete | null;
  requestWorkspaceDelete: (node: WorkspaceTreeNode, actionPaths?: string[]) => void;
  requestWorkspaceRename: (node: WorkspaceTreeNode, actionPaths?: string[]) => void;
  setExplorerInlineEdit: ReturnType<typeof useWorkspaceExplorerController>['setInlineEdit'];
  setPendingDelete: (pending: IntegratedShellPendingDelete | null) => void;
  startWorkspaceCreate: ReturnType<typeof useWorkspaceExplorerController>['startCreate'];
}

export function useIntegratedShellWorkspaceOrchestration({
  defaultSelectionPath,
  onNotify,
  workspace,
}: UseIntegratedShellWorkspaceOrchestrationOptions): IntegratedShellWorkspaceOrchestration {
  const {
    deleteFile: deleteWorkspaceFile,
    deleteFolder: deleteWorkspaceFolder,
    files,
    toggleFolder,
  } = workspace;
  const [pendingDelete, setPendingDelete] = useState<IntegratedShellPendingDelete | null>(null);

  const port = useMemo(
    () => createVirtualWorkspaceExplorerPort({ onNotify, workspace }),
    [onNotify, workspace],
  );

  const requestWorkspaceDelete = useCallback(
    (node: WorkspaceTreeNode, actionPaths: string[] = [node.path]) => {
      const targetPaths = actionPaths.length > 0 ? actionPaths : [node.path];
      if (node.type === 'folder') {
        setPendingDelete({ paths: [node.path], type: 'folder' });
        return;
      }

      const filePathSet = new Set(files.map((file) => file.path));
      const fileActionPaths = targetPaths.filter((path) => filePathSet.has(path));
      if (fileActionPaths.length === 0) {
        return;
      }

      setPendingDelete({ paths: fileActionPaths, type: 'files' });
    },
    [files],
  );

  const controller = useWorkspaceExplorerController({
    expandedPaths: workspace.expandedPaths,
    initialSelection: {
      anchorPath: defaultSelectionPath,
      focusedPath: defaultSelectionPath,
      paths: [defaultSelectionPath],
    },
    mapRenameSelection: (selection, { destinationPath, kind, sourcePath }) => {
      if (kind === 'file') {
        return {
          anchorPath: selection.anchorPath === sourcePath ? destinationPath : selection.anchorPath,
          focusedPath:
            selection.focusedPath === sourcePath ? destinationPath : selection.focusedPath,
          paths: selection.paths.map((path) => (path === sourcePath ? destinationPath : path)),
        };
      }

      return applyVirtualWorkspaceRenameSelection(selection, sourcePath, destinationPath);
    },
    onRequestDelete: (meta: WorkspaceExplorerItemKeyboardActionMeta) => {
      requestWorkspaceDelete(meta.node, meta.actionPaths);
    },
    onSelectionChange: (selection, meta) => {
      if (meta.mode !== 'single') {
        onNotify(`${selection.paths.length} files selected`);
      }
    },
    onToggleFolder: toggleFolder,
    port,
    syncSelectionFromActivePath: false,
  });

  const deleteFiles = useCallback(
    (paths: string[]) => {
      const pendingPathSet = new Set(paths);
      paths.forEach((path) => deleteWorkspaceFile(path));
      controller.handleSelectionChange(
        pruneWorkspaceSelection(
          controller.selection,
          files.filter((file) => !pendingPathSet.has(file.path)).map((file) => file.path),
        ),
        { mode: 'single', reason: 'click' },
      );
      onNotify(paths.length === 1 ? `Deleted ${paths[0]}` : `Deleted ${paths.length} files`);
    },
    [controller, deleteWorkspaceFile, files, onNotify],
  );

  const deleteFolder = useCallback(
    (path: string) => {
      if (!path) {
        return;
      }

      const folderPrefix = `${path}/`;
      const deletedFilePaths = new Set(
        files
          .filter((file) => file.path === path || file.path.startsWith(folderPrefix))
          .map((file) => file.path),
      );

      deleteWorkspaceFolder(path);
      controller.handleSelectionChange(
        pruneWorkspaceSelection(
          controller.selection,
          files.filter((file) => !deletedFilePaths.has(file.path)).map((file) => file.path),
        ),
        { mode: 'single', reason: 'click' },
      );
      onNotify(`Deleted folder ${path}`);
    },
    [controller, deleteWorkspaceFolder, files, onNotify],
  );

  const confirmPendingDelete = useCallback(() => {
    if (!pendingDelete) {
      return;
    }

    if (pendingDelete.type === 'folder') {
      deleteFolder(pendingDelete.paths[0] ?? '');
    } else {
      deleteFiles(pendingDelete.paths);
    }

    setPendingDelete(null);
  }, [deleteFiles, deleteFolder, pendingDelete]);

  const activateFile = useCallback(
    (path: string) => {
      controller.handleActivateFile(path);
    },
    [controller],
  );

  const deleteFile = useCallback(
    (path: string) => {
      deleteFiles([path]);
    },
    [deleteFiles],
  );

  const requestWorkspaceRename = useCallback(
    (node: WorkspaceTreeNode, actionPaths: string[] = [node.path]) => {
      controller.startRename(node, actionPaths);
      onNotify(`Rename queued for ${actionPaths[0] ?? node.path}`);
    },
    [controller, onNotify],
  );

  const startWorkspaceCreate = useCallback(
    (kind: Parameters<typeof controller.startCreate>[0], parentPath?: string) => {
      controller.startCreate(kind, parentPath);
      onNotify(kind === 'create-file' ? 'New file queued' : 'New folder queued');
    },
    [controller, onNotify],
  );

  return {
    activateFile,
    deleteFile,
    deleteFiles,
    confirmPendingDelete,
    explorerInlineEdit: controller.inlineEdit,
    explorerSelection: controller.selection,
    handleExplorerInlineEditCommit: controller.handleInlineEditCommit,
    handleExplorerInlineEditValueChange: controller.handleInlineEditValueChange,
    handleExplorerRequestDelete: controller.handleRequestDelete,
    handleExplorerRequestMove: controller.handleRequestMove,
    handleExplorerRequestRename: controller.handleRequestRename,
    handleExplorerSelectionChange: controller.handleSelectionChange,
    pendingDelete,
    requestWorkspaceDelete,
    requestWorkspaceRename,
    setExplorerInlineEdit: controller.setInlineEdit,
    setPendingDelete,
    startWorkspaceCreate,
  };
}
