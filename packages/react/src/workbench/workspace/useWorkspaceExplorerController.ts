import { useCallback, useEffect, useState } from 'react';
import {
  joinWorkspacePath,
  parentPathOf,
  pruneWorkspaceSelection,
  type WorkspaceSelectionState,
  type WorkspaceTreeNode,
} from '@workbench-kit/workspace';

import type {
  WorkspaceExplorerInlineEditCommitMeta,
  WorkspaceExplorerInlineEditKind,
  WorkspaceExplorerInlineEditState,
  WorkspaceExplorerItemKeyboardActionMeta,
  WorkspaceExplorerMoveRequestMeta,
  WorkspaceExplorerSelectionChangeMeta,
} from './WorkspaceExplorer';
import {
  applyWorkspaceExplorerMutationResult,
  createWorkspaceExplorerInlineEditDraft,
  createWorkspaceExplorerRenameDraft,
  isWorkspaceExplorerCreatePathAvailable,
  isWorkspaceExplorerRenamePathAvailable,
  validateWorkspaceExplorerInlineEditName,
  workspaceExplorerParentPaths,
  type WorkspaceExplorerControllerPort,
} from './workspaceExplorerController';

export interface UseWorkspaceExplorerControllerOptions {
  activePath?: string | undefined;
  expandedPaths?: Set<string> | undefined;
  initialExpandedPaths?: Iterable<string> | undefined;
  initialSelection?: WorkspaceSelectionState | undefined;
  mapRenameSelection?: (
    selection: WorkspaceSelectionState,
    input: { destinationPath: string; kind: 'file' | 'folder'; sourcePath: string },
  ) => WorkspaceSelectionState;
  onRequestDelete?: (meta: WorkspaceExplorerItemKeyboardActionMeta) => void;
  onSelectionChange?: (
    selection: WorkspaceSelectionState,
    meta: WorkspaceExplorerSelectionChangeMeta,
  ) => void;
  onToggleFolder?: (path: string) => void;
  port: WorkspaceExplorerControllerPort;
  syncSelectionFromActivePath?: boolean;
}

export interface WorkspaceExplorerController {
  cancelInlineEdit: () => void;
  expandedPaths: Set<string>;
  handleActivateFile: (path: string) => void;
  handleInlineEditCommit: (meta: WorkspaceExplorerInlineEditCommitMeta) => void;
  handleInlineEditValueChange: (value: string, edit: WorkspaceExplorerInlineEditState) => void;
  handleRequestDelete: (meta: WorkspaceExplorerItemKeyboardActionMeta) => void;
  handleRequestMove: (meta: WorkspaceExplorerMoveRequestMeta) => void;
  handleRequestRename: (meta: WorkspaceExplorerItemKeyboardActionMeta) => void;
  handleSelectionChange: (
    selection: WorkspaceSelectionState,
    meta: WorkspaceExplorerSelectionChangeMeta,
  ) => void;
  handleToggleFolder: (path: string) => void;
  inlineEdit: WorkspaceExplorerInlineEditState | undefined;
  revealFolder: (path: string) => void;
  selection: WorkspaceSelectionState;
  setInlineEdit: (edit: WorkspaceExplorerInlineEditState | undefined) => void;
  startCreate: (
    kind: Extract<WorkspaceExplorerInlineEditKind, 'create-file' | 'create-folder'>,
    parentPath?: string,
  ) => void;
  startRename: (node: WorkspaceTreeNode, actionPaths?: readonly string[]) => void;
}

export function useWorkspaceExplorerController({
  activePath,
  expandedPaths: expandedPathsProp,
  initialExpandedPaths,
  initialSelection,
  mapRenameSelection,
  onRequestDelete,
  onSelectionChange,
  onToggleFolder,
  port,
  syncSelectionFromActivePath = true,
}: UseWorkspaceExplorerControllerOptions): WorkspaceExplorerController {
  const { snapshot } = port;
  const [internalExpandedPaths, setInternalExpandedPaths] = useState<Set<string>>(
    () => new Set(initialExpandedPaths),
  );
  const expandedPaths = expandedPathsProp ?? internalExpandedPaths;
  const [inlineEdit, setInlineEdit] = useState<WorkspaceExplorerInlineEditState | undefined>();
  const [selection, setSelection] = useState<WorkspaceSelectionState>(
    initialSelection ?? { paths: [] },
  );

  const availableFilePathKey = snapshot.files.map((file) => file.path).join('\u0000');
  const availableFolderPathKey = snapshot.folders.join('\u0000');

  const updateExpandedPaths = useCallback(
    (updater: (currentPaths: Set<string>) => Set<string>) => {
      if (expandedPathsProp) {
        return;
      }

      setInternalExpandedPaths(updater);
    },
    [expandedPathsProp],
  );

  const revealFolder = useCallback((path: string) => {
    if (onToggleFolder && expandedPathsProp && !expandedPathsProp.has(path)) {
      onToggleFolder(path);
      return;
    }

    updateExpandedPaths((currentPaths) => {
      if (currentPaths.has(path)) {
        return currentPaths;
      }

      return new Set([...currentPaths, path]);
    });
  }, [expandedPathsProp, onToggleFolder, updateExpandedPaths]);

  useEffect(() => {
    const filePaths =
      availableFilePathKey.length === 0
        ? []
        : availableFilePathKey.split('\u0000');
    const folderPaths =
      availableFolderPathKey.length === 0
        ? []
        : availableFolderPathKey.split('\u0000');

    setSelection((currentSelection) => {
      const next = pruneWorkspaceSelection(currentSelection, filePaths, folderPaths);
      if (isWorkspaceSelectionEqual(next, currentSelection)) {
        return currentSelection;
      }

      return next;
    });
  }, [availableFilePathKey, availableFolderPathKey]);

  useEffect(() => {
    if (!syncSelectionFromActivePath || !activePath) {
      return;
    }

    setSelection({
      anchorPath: activePath,
      focusedPath: activePath,
      paths: [activePath],
    });
    workspaceExplorerParentPaths(activePath).forEach((path) => {
      revealFolder(path);
    });
  }, [activePath, revealFolder, syncSelectionFromActivePath]);

  const reportInlineEditError = useCallback(
    (edit: WorkspaceExplorerInlineEditState, error: string) => {
      setInlineEdit({ ...edit, error });
      port.reportError?.(error);
    },
    [port],
  );

  const startCreate = useCallback(
    (
      kind: Extract<WorkspaceExplorerInlineEditKind, 'create-file' | 'create-folder'>,
      parentPath = '',
    ) => {
      if (parentPath) {
        revealFolder(parentPath);
      }

      setInlineEdit(createWorkspaceExplorerInlineEditDraft(snapshot, kind, parentPath));
    },
    [revealFolder, snapshot],
  );

  const startRename = useCallback((node: WorkspaceTreeNode, actionPaths: readonly string[] = [node.path]) => {
    setInlineEdit(createWorkspaceExplorerRenameDraft(node, actionPaths));
  }, []);

  const handleInlineEditCommit = useCallback(
    ({ edit, value }: WorkspaceExplorerInlineEditCommitMeta) => {
      void (async () => {
        const name = value.trim();
        const nameError = validateWorkspaceExplorerInlineEditName(name);
        if (nameError) {
          reportInlineEditError(edit, nameError);
          return;
        }

        if (edit.kind === 'create-file' || edit.kind === 'create-folder') {
          const parentPath = edit.parentPath ?? '';
          if (!isWorkspaceExplorerCreatePathAvailable(snapshot, parentPath, name)) {
            reportInlineEditError(edit, `${name} already exists.`);
            return;
          }

          const result =
            edit.kind === 'create-file'
              ? await port.createFile({ name, parentPath })
              : await port.createFolder({ name, parentPath });
          setInlineEdit(undefined);
          applyWorkspaceExplorerMutationResult(result, setSelection);
          return;
        }

        const sourcePath = edit.path ?? '';
        if (!isWorkspaceExplorerRenamePathAvailable(snapshot, sourcePath, name)) {
          reportInlineEditError(edit, `${name} already exists.`);
          return;
        }

        const destinationPath = joinWorkspacePath(parentPathOf(sourcePath), name);
        if (sourcePath === destinationPath) {
          setInlineEdit(undefined);
          return;
        }

        const renameKind = edit.kind === 'rename-folder' ? 'folder' : 'file';
        const result = await port.renameEntry({
          kind: renameKind,
          name,
          path: sourcePath,
        });
        setInlineEdit(undefined);
        if (mapRenameSelection) {
          setSelection((currentSelection) =>
            mapRenameSelection(currentSelection, {
              destinationPath,
              kind: renameKind,
              sourcePath,
            }),
          );
          return;
        }

        applyWorkspaceExplorerMutationResult(result, setSelection);
      })();
    },
    [mapRenameSelection, port, reportInlineEditError, snapshot],
  );

  const handleInlineEditValueChange = useCallback(
    (value: string, edit: WorkspaceExplorerInlineEditState) => {
      setInlineEdit({ ...edit, error: undefined, value });
    },
    [],
  );

  const handleActivateFile = useCallback(
    (path: string) => {
      void port.openFile(path);
    },
    [port],
  );

  const handleToggleFolder = useCallback((path: string) => {
    if (onToggleFolder) {
      onToggleFolder(path);
      return;
    }

    updateExpandedPaths((currentPaths) => {
      const nextPaths = new Set(currentPaths);
      if (nextPaths.has(path)) {
        nextPaths.delete(path);
      } else {
        nextPaths.add(path);
      }
      return nextPaths;
    });
  }, [onToggleFolder, updateExpandedPaths]);

  const handleRequestDelete = useCallback(
    (meta: WorkspaceExplorerItemKeyboardActionMeta) => {
      if (onRequestDelete) {
        onRequestDelete(meta);
        return;
      }

      const paths = meta.node.type === 'folder' ? [meta.node.path] : meta.actionPaths;
      void port.deleteEntries({
        kind: meta.node.type,
        paths,
      });
    },
    [onRequestDelete, port],
  );

  const handleRequestMove = useCallback(
    (meta: WorkspaceExplorerMoveRequestMeta) => {
      if (!port.moveEntries) {
        return;
      }

      void (async () => {
        const result = await port.moveEntries?.({
          sourcePaths: meta.sourcePaths,
          targetFolderPath: meta.targetFolderPath,
        });
        applyWorkspaceExplorerMutationResult(result, setSelection);
      })();
    },
    [port],
  );

  const handleRequestRename = useCallback(
    (meta: WorkspaceExplorerItemKeyboardActionMeta) => {
      startRename(meta.node, meta.actionPaths);
    },
    [startRename],
  );

  const handleSelectionChange = useCallback(
    (nextSelection: WorkspaceSelectionState, meta: WorkspaceExplorerSelectionChangeMeta) => {
      setSelection(nextSelection);
      onSelectionChange?.(nextSelection, meta);
    },
    [onSelectionChange],
  );

  return {
    cancelInlineEdit: () => setInlineEdit(undefined),
    expandedPaths,
    handleActivateFile,
    handleInlineEditCommit,
    handleInlineEditValueChange,
    handleRequestDelete,
    handleRequestMove,
    handleRequestRename,
    handleSelectionChange,
    handleToggleFolder,
    inlineEdit,
    revealFolder,
    selection,
    setInlineEdit,
    startCreate,
    startRename,
  };
}

function isWorkspaceSelectionEqual(
  left: WorkspaceSelectionState,
  right: WorkspaceSelectionState,
): boolean {
  return (
    left.anchorPath === right.anchorPath &&
    left.focusedPath === right.focusedPath &&
    left.paths.length === right.paths.length &&
    left.paths.every((path, index) => path === right.paths[index])
  );
}
