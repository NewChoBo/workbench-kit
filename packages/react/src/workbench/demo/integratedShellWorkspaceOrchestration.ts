import { useCallback, useState } from 'react';
import {
  fileNameOfPath,
  getAvailableWorkspaceEntryName,
  getWorkspaceFileMovePlan,
  isSimpleWorkspaceName,
  isWorkspaceEntryPathAvailable,
  joinWorkspacePath,
  parentPathOf,
  pruneWorkspaceSelection,
  type VirtualWorkspaceApi,
  type WorkspaceExplorerInlineEditCommitMeta,
  type WorkspaceExplorerInlineEditKind,
  type WorkspaceExplorerInlineEditState,
  type WorkspaceExplorerItemKeyboardActionMeta,
  type WorkspaceExplorerMoveRequestMeta,
  type WorkspaceExplorerSelectionChangeMeta,
  type WorkspaceSelectionState,
  type WorkspaceTreeNode,
} from '../workspace';

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
  explorerInlineEdit: WorkspaceExplorerInlineEditState | undefined;
  explorerSelection: WorkspaceSelectionState;
  handleExplorerInlineEditCommit: (meta: WorkspaceExplorerInlineEditCommitMeta) => void;
  handleExplorerInlineEditValueChange: (
    value: string,
    edit: WorkspaceExplorerInlineEditState,
  ) => void;
  handleExplorerRequestDelete: (meta: WorkspaceExplorerItemKeyboardActionMeta) => void;
  handleExplorerRequestMove: (meta: WorkspaceExplorerMoveRequestMeta) => void;
  handleExplorerRequestRename: (meta: WorkspaceExplorerItemKeyboardActionMeta) => void;
  handleExplorerSelectionChange: (
    selection: WorkspaceSelectionState,
    meta: WorkspaceExplorerSelectionChangeMeta,
  ) => void;
  pendingDelete: IntegratedShellPendingDelete | null;
  requestWorkspaceDelete: (node: WorkspaceTreeNode, actionPaths?: string[]) => void;
  requestWorkspaceRename: (node: WorkspaceTreeNode, actionPaths?: string[]) => void;
  setExplorerInlineEdit: (edit: WorkspaceExplorerInlineEditState | undefined) => void;
  setPendingDelete: (pending: IntegratedShellPendingDelete | null) => void;
  startWorkspaceCreate: (
    kind: Extract<WorkspaceExplorerInlineEditKind, 'create-file' | 'create-folder'>,
    parentPath?: string,
  ) => void;
}

export function useIntegratedShellWorkspaceOrchestration({
  defaultSelectionPath,
  onNotify,
  workspace,
}: UseIntegratedShellWorkspaceOrchestrationOptions): IntegratedShellWorkspaceOrchestration {
  const {
    createFile: createWorkspaceFile,
    createFolder: createWorkspaceFolder,
    deleteFile: deleteWorkspaceFile,
    deleteFolder: deleteWorkspaceFolder,
    expandedPaths,
    files,
    folders,
    moveFile: moveWorkspaceFile,
    openFile,
    renameFile: renameWorkspaceFile,
    renameFolder: renameWorkspaceFolder,
    toggleFolder,
  } = workspace;

  const [explorerSelection, setExplorerSelection] = useState<WorkspaceSelectionState>({
    anchorPath: defaultSelectionPath,
    paths: [defaultSelectionPath],
  });
  const [explorerInlineEdit, setExplorerInlineEdit] = useState<
    WorkspaceExplorerInlineEditState | undefined
  >();
  const [pendingDelete, setPendingDelete] = useState<IntegratedShellPendingDelete | null>(null);

  const setExplorerInlineEditError = useCallback(
    (edit: WorkspaceExplorerInlineEditState, error: string) => {
      setExplorerInlineEdit({ ...edit, error });
      onNotify(error);
    },
    [onNotify],
  );

  const activateFile = useCallback(
    (path: string) => {
      openFile(path);
      onNotify(`Opened ${path}`);
    },
    [onNotify, openFile],
  );

  const deleteFiles = useCallback(
    (paths: string[]) => {
      const pendingPathSet = new Set(paths);
      const filePaths = files
        .filter((file) => pendingPathSet.has(file.path))
        .map((file) => file.path);
      if (filePaths.length === 0) return;

      filePaths.forEach(deleteWorkspaceFile);
      setExplorerSelection((selection) =>
        pruneWorkspaceSelection(
          selection,
          files.filter((file) => !pendingPathSet.has(file.path)).map((file) => file.path),
        ),
      );
      onNotify(
        filePaths.length === 1 ? `Deleted ${filePaths[0]}` : `Deleted ${filePaths.length} files`,
      );
    },
    [deleteWorkspaceFile, files, onNotify],
  );

  const deleteFolder = useCallback(
    (path: string) => {
      if (!path) return;

      const folderPrefix = `${path}/`;
      const deletedFilePaths = new Set(
        files
          .filter((file) => file.path === path || file.path.startsWith(folderPrefix))
          .map((file) => file.path),
      );

      deleteWorkspaceFolder(path);
      setExplorerSelection((selection) =>
        pruneWorkspaceSelection(
          selection,
          files.filter((file) => !deletedFilePaths.has(file.path)).map((file) => file.path),
        ),
      );
      onNotify(`Deleted folder ${path}`);
    },
    [deleteWorkspaceFolder, files, onNotify],
  );

  const confirmPendingDelete = useCallback(() => {
    if (!pendingDelete) return;

    if (pendingDelete.type === 'folder') {
      deleteFolder(pendingDelete.paths[0] ?? '');
    } else {
      deleteFiles(pendingDelete.paths);
    }

    setPendingDelete(null);
  }, [deleteFiles, deleteFolder, pendingDelete]);

  const startWorkspaceCreate = useCallback(
    (
      kind: Extract<WorkspaceExplorerInlineEditKind, 'create-file' | 'create-folder'>,
      parentPath = '',
    ) => {
      const value = getAvailableWorkspaceEntryName({
        files,
        folders,
        parentPath,
        preferredName: kind === 'create-file' ? 'untitled.md' : 'new-folder',
      });

      if (parentPath && !expandedPaths.has(parentPath)) {
        toggleFolder(parentPath);
      }

      setExplorerInlineEdit({
        id: `${kind}:${parentPath}:${value}`,
        kind,
        parentPath,
        value,
      });
      onNotify(kind === 'create-file' ? 'New file queued' : 'New folder queued');
    },
    [expandedPaths, files, folders, onNotify, toggleFolder],
  );

  const requestWorkspaceRename = useCallback(
    (node: WorkspaceTreeNode, actionPaths: string[] = [node.path]) => {
      const targetPath = actionPaths[0] ?? node.path;
      setExplorerInlineEdit({
        id: `rename:${targetPath}`,
        kind: node.type === 'folder' ? 'rename-folder' : 'rename-file',
        path: targetPath,
        value: fileNameOfPath(targetPath),
      });
      onNotify(`Rename queued for ${targetPath}`);
    },
    [onNotify],
  );

  const handleExplorerInlineEditValueChange = useCallback(
    (value: string, edit: WorkspaceExplorerInlineEditState) => {
      setExplorerInlineEdit({ ...edit, error: undefined, value });
    },
    [],
  );

  const handleExplorerInlineEditCommit = useCallback(
    ({ edit, value }: WorkspaceExplorerInlineEditCommitMeta) => {
      const name = value.trim();
      if (!isSimpleWorkspaceName(name)) {
        setExplorerInlineEditError(edit, 'Use a simple file or folder name.');
        return;
      }

      if (edit.kind === 'create-file' || edit.kind === 'create-folder') {
        const parentPath = edit.parentPath ?? '';
        const path = joinWorkspacePath(parentPath, name);
        if (!isWorkspaceEntryPathAvailable({ files, folders, path })) {
          setExplorerInlineEditError(edit, `${name} already exists.`);
          return;
        }

        if (edit.kind === 'create-file') {
          createWorkspaceFile({ content: '', path, source: 'user' });
          setExplorerSelection({ anchorPath: path, paths: [path] });
          onNotify(`Created ${path}`);
        } else {
          createWorkspaceFolder(path);
          onNotify(`Created folder ${path}`);
        }

        setExplorerInlineEdit(undefined);
        return;
      }

      const sourcePath = edit.path ?? '';
      const destinationPath = joinWorkspacePath(parentPathOf(sourcePath), name);
      if (
        !sourcePath ||
        !destinationPath ||
        !isWorkspaceEntryPathAvailable({
          excludedPaths: [sourcePath],
          files,
          folders,
          path: destinationPath,
        })
      ) {
        setExplorerInlineEditError(edit, `${name} already exists.`);
        return;
      }

      if (sourcePath === destinationPath) {
        setExplorerInlineEdit(undefined);
        return;
      }

      if (edit.kind === 'rename-file') {
        renameWorkspaceFile(sourcePath, name);
        setExplorerSelection((selection) => ({
          anchorPath: selection.anchorPath === sourcePath ? destinationPath : selection.anchorPath,
          paths: selection.paths.map((path) => (path === sourcePath ? destinationPath : path)),
        }));
        onNotify(`Renamed ${sourcePath} to ${destinationPath}`);
        setExplorerInlineEdit(undefined);
        return;
      }

      const renameDescendantPath = (currentPath: string) =>
        currentPath === sourcePath
          ? destinationPath
          : currentPath.startsWith(`${sourcePath}/`)
            ? `${destinationPath}/${currentPath.slice(sourcePath.length + 1)}`
            : currentPath;

      renameWorkspaceFolder(sourcePath, name);
      setExplorerSelection((selection) => ({
        anchorPath: selection.anchorPath
          ? renameDescendantPath(selection.anchorPath)
          : selection.anchorPath,
        paths: selection.paths.map(renameDescendantPath),
      }));
      onNotify(`Renamed folder ${sourcePath} to ${destinationPath}`);
      setExplorerInlineEdit(undefined);
    },
    [
      createWorkspaceFile,
      createWorkspaceFolder,
      files,
      folders,
      onNotify,
      renameWorkspaceFile,
      renameWorkspaceFolder,
      setExplorerInlineEditError,
    ],
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
      if (fileActionPaths.length === 0) return;

      setPendingDelete({ paths: fileActionPaths, type: 'files' });
    },
    [files],
  );

  const handleExplorerRequestDelete = useCallback(
    (meta: WorkspaceExplorerItemKeyboardActionMeta) => {
      requestWorkspaceDelete(meta.node, meta.actionPaths);
    },
    [requestWorkspaceDelete],
  );

  const handleExplorerRequestRename = useCallback(
    (meta: WorkspaceExplorerItemKeyboardActionMeta) => {
      requestWorkspaceRename(meta.node, meta.actionPaths);
    },
    [requestWorkspaceRename],
  );

  const handleExplorerRequestMove = useCallback(
    (meta: WorkspaceExplorerMoveRequestMeta) => {
      const plan = getWorkspaceFileMovePlan({
        files,
        folders,
        sourcePaths: meta.sourcePaths,
        targetFolderPath: meta.targetFolderPath,
      });

      plan.moves.forEach((move) => {
        moveWorkspaceFile(move.sourcePath, plan.targetFolderPath);
      });

      if (plan.moves.length > 0) {
        setExplorerSelection({
          anchorPath: plan.moves[plan.moves.length - 1]?.destinationPath,
          paths: plan.moves.map((move) => move.destinationPath),
        });
      }

      const targetLabel = plan.targetFolderPath || 'workspace root';
      if (plan.moves.length === 0) {
        onNotify(`Move blocked for ${plan.blockedPaths.length} files`);
        return;
      }

      onNotify(
        plan.blockedPaths.length > 0
          ? `Moved ${plan.moves.length} files to ${targetLabel}, blocked ${plan.blockedPaths.length}`
          : `Moved ${plan.moves.length} files to ${targetLabel}`,
      );
    },
    [files, folders, moveWorkspaceFile, onNotify],
  );

  const handleExplorerSelectionChange = useCallback(
    (selection: WorkspaceSelectionState, meta: WorkspaceExplorerSelectionChangeMeta) => {
      setExplorerSelection(selection);
      if (meta.mode !== 'single') {
        onNotify(`${selection.paths.length} files selected`);
      }
    },
    [onNotify],
  );

  const deleteFile = useCallback(
    (path: string) => {
      deleteFiles([path]);
    },
    [deleteFiles],
  );

  return {
    activateFile,
    deleteFile,
    deleteFiles,
    confirmPendingDelete,
    explorerInlineEdit,
    explorerSelection,
    handleExplorerInlineEditCommit,
    handleExplorerInlineEditValueChange,
    handleExplorerRequestDelete,
    handleExplorerRequestMove,
    handleExplorerRequestRename,
    handleExplorerSelectionChange,
    pendingDelete,
    requestWorkspaceDelete,
    requestWorkspaceRename,
    setExplorerInlineEdit,
    setPendingDelete,
    startWorkspaceCreate,
  };
}
