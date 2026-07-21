import { useCallback, useEffect, useRef, useState } from 'react';
import {
  joinWorkspacePath,
  parentPathOf,
  pruneWorkspaceSelection,
  resolveExplorerActionPaths,
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
  applyWorkspaceExplorerFolderFocus,
  applyWorkspaceExplorerMutationResult,
  createWorkspaceExplorerInlineEditDraft,
  createWorkspaceExplorerRenameDraft,
  isWorkspaceExplorerCreatePathAvailable,
  isWorkspaceExplorerRenamePathAvailable,
  resolveWorkspaceExplorerMutationDeniedMessage,
  validateWorkspaceExplorerInlineEditName,
  workspaceExplorerParentPaths,
  type WorkspaceExplorerControllerPort,
  type WorkspaceExplorerMutationAction,
} from './workspaceExplorerController';

export interface WorkspaceExplorerInlineEditMessages {
  alreadyExists?: (name: string) => string;
  createFailed?: string;
  invalidName?: string;
  renameFailed?: string;
}

export interface UseWorkspaceExplorerControllerOptions {
  activePath?: string | undefined;
  expandedPaths?: Set<string> | undefined;
  initialExpandedPaths?: Iterable<string> | undefined;
  initialSelection?: WorkspaceSelectionState | undefined;
  inlineEditMessages?: WorkspaceExplorerInlineEditMessages | undefined;
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
  /**
   * When true, explorer selection follows the active editor tab path (VS Code-style
   * optional reveal). Off by default so manual explorer selection is preserved.
   */
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

const DEFAULT_ALREADY_EXISTS = (name: string) => `${name} already exists.`;
const DEFAULT_CREATE_FAILED = 'Could not create the workspace item.';
const DEFAULT_INVALID_NAME = 'Use a simple file or folder name.';
const DEFAULT_RENAME_FAILED = 'Could not rename the workspace item.';

export function useWorkspaceExplorerController({
  activePath,
  expandedPaths: expandedPathsProp,
  initialExpandedPaths,
  initialSelection,
  inlineEditMessages,
  mapRenameSelection,
  onRequestDelete,
  onSelectionChange,
  onToggleFolder,
  port,
  syncSelectionFromActivePath = false,
}: UseWorkspaceExplorerControllerOptions): WorkspaceExplorerController {
  const { snapshot } = port;
  const [internalExpandedPaths, setInternalExpandedPaths] = useState<Set<string>>(
    () => new Set(initialExpandedPaths),
  );
  const expandedPaths = expandedPathsProp ?? internalExpandedPaths;
  const [inlineEdit, setInlineEditState] = useState<WorkspaceExplorerInlineEditState | undefined>();
  const inlineEditCommitInFlightRef = useRef(false);
  const [selection, setSelection] = useState<WorkspaceSelectionState>(
    initialSelection ?? { paths: [] },
  );

  const invalidNameMessage = inlineEditMessages?.invalidName ?? DEFAULT_INVALID_NAME;
  const alreadyExistsMessage = inlineEditMessages?.alreadyExists ?? DEFAULT_ALREADY_EXISTS;
  const createFailedMessage = inlineEditMessages?.createFailed ?? DEFAULT_CREATE_FAILED;
  const renameFailedMessage = inlineEditMessages?.renameFailed ?? DEFAULT_RENAME_FAILED;

  /** Host/API draft replacement — always opens the commit gate for the next attempt. */
  const setInlineEdit = useCallback((edit: WorkspaceExplorerInlineEditState | undefined) => {
    inlineEditCommitInFlightRef.current = false;
    setInlineEditState(edit);
  }, []);

  const clearInlineEdit = useCallback(() => {
    inlineEditCommitInFlightRef.current = false;
    setInlineEditState(undefined);
  }, []);

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

  const revealFolder = useCallback(
    (path: string) => {
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
    },
    [expandedPathsProp, onToggleFolder, updateExpandedPaths],
  );

  useEffect(() => {
    const filePaths = availableFilePathKey.length === 0 ? [] : availableFilePathKey.split('\u0000');
    const folderPaths =
      availableFolderPathKey.length === 0 ? [] : availableFolderPathKey.split('\u0000');

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
      // Keep the same draft id; open the gate so Enter/blur can retry after the error.
      inlineEditCommitInFlightRef.current = false;
      setInlineEditState({ ...edit, error });
      port.reportError?.(error);
    },
    [port],
  );

  const mutationDeniedMessage = useCallback(
    (path: string, action: WorkspaceExplorerMutationAction): string | undefined =>
      resolveWorkspaceExplorerMutationDeniedMessage(port.canMutatePath?.(path, action)),
    [port],
  );

  const startCreate = useCallback(
    (
      kind: Extract<WorkspaceExplorerInlineEditKind, 'create-file' | 'create-folder'>,
      parentPath = '',
    ) => {
      const denied = mutationDeniedMessage(parentPath, 'create');
      if (denied) {
        port.reportError?.(denied);
        return;
      }

      if (parentPath) {
        revealFolder(parentPath);
      }

      setInlineEdit(createWorkspaceExplorerInlineEditDraft(snapshot, kind, parentPath));
    },
    [mutationDeniedMessage, port, revealFolder, setInlineEdit, snapshot],
  );

  const startRename = useCallback(
    (node: WorkspaceTreeNode, actionPaths: readonly string[] = [node.path]) => {
      const targetPath = actionPaths[0] ?? node.path;
      const denied = mutationDeniedMessage(targetPath, 'rename');
      if (denied) {
        port.reportError?.(denied);
        return;
      }

      setInlineEdit(createWorkspaceExplorerRenameDraft(node, actionPaths));
    },
    [mutationDeniedMessage, port, setInlineEdit],
  );

  const handleInlineEditCommit = useCallback(
    ({ edit, value }: WorkspaceExplorerInlineEditCommitMeta) => {
      // Enter commits then blurs the same input; ignore the duplicate blur commit.
      if (inlineEditCommitInFlightRef.current) {
        return;
      }
      inlineEditCommitInFlightRef.current = true;

      void (async () => {
        const name = value.trim();
        const nameError = validateWorkspaceExplorerInlineEditName(name, invalidNameMessage);
        if (nameError) {
          reportInlineEditError(edit, nameError);
          return;
        }

        if (edit.kind === 'create-file' || edit.kind === 'create-folder') {
          const parentPath = edit.parentPath ?? '';
          const createDenied = mutationDeniedMessage(parentPath, 'create');
          if (createDenied) {
            reportInlineEditError(edit, createDenied);
            return;
          }

          if (!isWorkspaceExplorerCreatePathAvailable(snapshot, parentPath, name)) {
            reportInlineEditError(edit, alreadyExistsMessage(name));
            return;
          }

          try {
            const result =
              edit.kind === 'create-file'
                ? await port.createFile({ name, parentPath })
                : await port.createFolder({ name, parentPath });
            clearInlineEdit();
            if (edit.kind === 'create-folder') {
              const folderPath = result?.path ?? joinWorkspacePath(parentPath, name);
              applyWorkspaceExplorerFolderFocus(folderPath, setSelection);
              return;
            }
            applyWorkspaceExplorerMutationResult(result, setSelection);
          } catch (error) {
            const message = error instanceof Error ? error.message : createFailedMessage;
            reportInlineEditError(edit, message);
          }
          return;
        }

        const sourcePath = edit.path ?? '';
        const renameDenied = mutationDeniedMessage(sourcePath, 'rename');
        if (renameDenied) {
          reportInlineEditError(edit, renameDenied);
          return;
        }

        if (!isWorkspaceExplorerRenamePathAvailable(snapshot, sourcePath, name)) {
          reportInlineEditError(edit, alreadyExistsMessage(name));
          return;
        }

        const destinationPath = joinWorkspacePath(parentPathOf(sourcePath), name);
        if (sourcePath === destinationPath) {
          clearInlineEdit();
          return;
        }

        const renameKind = edit.kind === 'rename-folder' ? 'folder' : 'file';
        try {
          const result = await port.renameEntry({
            kind: renameKind,
            name,
            path: sourcePath,
          });
          clearInlineEdit();
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

          if (renameKind === 'folder') {
            applyWorkspaceExplorerFolderFocus(result?.path ?? destinationPath, setSelection);
            return;
          }

          applyWorkspaceExplorerMutationResult(result, setSelection);
        } catch (error) {
          const message = error instanceof Error ? error.message : renameFailedMessage;
          reportInlineEditError(edit, message);
        }
      })();
    },
    [
      alreadyExistsMessage,
      clearInlineEdit,
      createFailedMessage,
      invalidNameMessage,
      mapRenameSelection,
      mutationDeniedMessage,
      port,
      renameFailedMessage,
      reportInlineEditError,
      snapshot,
    ],
  );

  const handleInlineEditValueChange = useCallback(
    (value: string, edit: WorkspaceExplorerInlineEditState) => {
      setInlineEditState({ ...edit, error: undefined, value });
    },
    [],
  );

  const handleActivateFile = useCallback(
    (path: string) => {
      void port.openFile(path);
    },
    [port],
  );

  const handleToggleFolder = useCallback(
    (path: string) => {
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
    },
    [onToggleFolder, updateExpandedPaths],
  );

  const handleRequestDelete = useCallback(
    (meta: WorkspaceExplorerItemKeyboardActionMeta) => {
      if (onRequestDelete) {
        onRequestDelete(meta);
        return;
      }

      // VS Code-like: multi-select only when the command target is inside it.
      const paths = resolveExplorerActionPaths({
        selection: meta.selection,
        targetPath: meta.node.path,
      });

      for (const path of paths) {
        const denied = mutationDeniedMessage(path, 'delete');
        if (denied) {
          port.reportError?.(denied);
          return;
        }
      }

      void port.deleteEntries({
        kind: meta.node.type,
        paths,
      });
    },
    [mutationDeniedMessage, onRequestDelete, port],
  );

  const handleRequestMove = useCallback(
    (meta: WorkspaceExplorerMoveRequestMeta) => {
      if (!port.moveEntries) {
        return;
      }

      for (const path of meta.sourcePaths) {
        const denied = mutationDeniedMessage(path, 'move');
        if (denied) {
          port.reportError?.(denied);
          return;
        }
      }

      void (async () => {
        const result = await port.moveEntries?.({
          sourcePaths: meta.sourcePaths,
          targetFolderPath: meta.targetFolderPath,
        });
        applyWorkspaceExplorerMutationResult(result, setSelection);
      })();
    },
    [mutationDeniedMessage, port],
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
    cancelInlineEdit: clearInlineEdit,
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
