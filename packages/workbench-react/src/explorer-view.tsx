import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { ContextMenu, type ContextMenuItem } from '@workbench-kit/react/overlay';
import {
  WorkspaceExplorer,
  type WorkspaceExplorerInlineEditCommitMeta,
  type WorkspaceExplorerInlineEditKind,
  type WorkspaceExplorerInlineEditState,
  type WorkspaceExplorerItemContextMenuMeta,
  type WorkspaceExplorerItemKeyboardActionMeta,
  type WorkspaceExplorerMoveRequestMeta,
  type WorkspaceExplorerSelectionChangeMeta,
} from '@workbench-kit/react/workbench/workspace/explorer';
import {
  buildWorkspaceTree,
  fileNameOfPath,
  getAvailableWorkspaceEntryName,
  isSimpleWorkspaceName,
  isWorkspaceEntryPathAvailable,
  joinWorkspacePath,
  parentPathOf,
  parseWorkspaceResourceUri,
  pruneWorkspaceSelection,
  type VirtualWorkspaceState,
  type WorkspaceChangeEvent,
  type WorkspaceResourceService,
  type WorkspaceSelectionState,
  type WorkspaceTreeNode,
} from '@workbench-kit/workspace';

import './explorer-view.css';

import { useWorkbench } from './provider.js';
import { useActiveEditorTab } from './use-editor.js';

export const BUILTIN_EXPLORER_VIEW_RENDER_KIND = 'workbench-kit.builtin.explorer.view' as const;
export const BUILTIN_EXPLORER_MOVE_COMMAND_ID = 'workbench-kit.builtin.explorer.move' as const;
export const BUILTIN_EXPLORER_REFRESH_COMMAND_ID =
  'workbench-kit.builtin.explorer.refresh' as const;

const WORKBENCH_WORKSPACE_DELETE_COMMAND_ID = 'workspace.delete' as const;
const WORKBENCH_WORKSPACE_COPY_PATH_COMMAND_ID = 'workspace.copyPath' as const;
const WORKBENCH_WORKSPACE_NEW_FILE_COMMAND_ID = 'workspace.newFile' as const;
const WORKBENCH_WORKSPACE_NEW_FOLDER_COMMAND_ID = 'workspace.newFolder' as const;
const WORKBENCH_WORKSPACE_OPEN_COMMAND_ID = 'workspace.open' as const;
const WORKBENCH_WORKSPACE_RENAME_COMMAND_ID = 'workspace.rename' as const;

export interface BuiltinExplorerViewRenderData {
  readonly kind: typeof BUILTIN_EXPLORER_VIEW_RENDER_KIND;
}

interface WorkspaceCommandResult {
  readonly path?: string | undefined;
  readonly paths?: readonly string[] | undefined;
}

interface ExplorerContextMenuState {
  readonly ariaLabel: string;
  readonly items: ContextMenuItem[];
  readonly x: number;
  readonly y: number;
}

export function isBuiltinExplorerViewRenderData(
  value: unknown,
): value is BuiltinExplorerViewRenderData {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === BUILTIN_EXPLORER_VIEW_RENDER_KIND
  );
}

export function BuiltinExplorerView() {
  const { executeCommand, workspaceHostPort } = useWorkbench();
  const activeTab = useActiveEditorTab();
  const workspaceService = isWorkspaceResourceService(workspaceHostPort?.service)
    ? workspaceHostPort.service
    : undefined;
  const workspaceState = useWorkspaceResourceState(workspaceService);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [inlineEdit, setInlineEdit] = useState<WorkspaceExplorerInlineEditState | undefined>();
  const [contextMenu, setContextMenu] = useState<ExplorerContextMenuState | null>(null);
  const [selection, setSelection] = useState<WorkspaceSelectionState>({
    paths: [],
  });

  useEffect(() => {
    if (!workspaceState) return;

    setExpandedPaths((currentPaths) => new Set([...currentPaths, ...workspaceState.expandedPaths]));
  }, [workspaceState]);

  const filePaths = useMemo(
    () => workspaceState?.files.map((file) => file.path) ?? [],
    [workspaceState],
  );

  useEffect(() => {
    setSelection((currentSelection) => pruneWorkspaceSelection(currentSelection, filePaths));
  }, [filePaths]);

  const activePath = useMemo(() => {
    if (!activeTab?.resourceUri) return undefined;

    const resource = parseWorkspaceResourceUri(activeTab.resourceUri);
    return resource?.kind === 'file' ? resource.path : undefined;
  }, [activeTab?.resourceUri]);

  useEffect(() => {
    if (!activePath) return;

    setSelection({
      anchorPath: activePath,
      paths: [activePath],
    });
    setExpandedPaths((currentPaths) => new Set([...currentPaths, ...parentPaths(activePath)]));
  }, [activePath]);

  const nodes = useMemo(
    () => buildWorkspaceTree(workspaceState?.folders ?? [], workspaceState?.files ?? []),
    [workspaceState],
  );

  const executeWorkspaceCommand = useCallback(
    async (commandId: string, payload?: unknown): Promise<WorkspaceCommandResult | undefined> => {
      const result = await executeCommand(commandId, payload);
      return isWorkspaceCommandResult(result) ? result : undefined;
    },
    [executeCommand],
  );

  const startCreate = useCallback(
    (
      kind: Extract<WorkspaceExplorerInlineEditKind, 'create-file' | 'create-folder'>,
      parentPath = '',
    ) => {
      if (!workspaceState) return;

      const value = getAvailableWorkspaceEntryName({
        files: workspaceState.files,
        folders: workspaceState.folders,
        parentPath,
        preferredName: kind === 'create-file' ? 'untitled.md' : 'new-folder',
      });

      if (parentPath) {
        setExpandedPaths((currentPaths) => new Set([...currentPaths, parentPath]));
      }

      setInlineEdit({
        id: `${kind}:${parentPath}:${value}`,
        kind,
        parentPath,
        value,
      });
    },
    [workspaceState],
  );

  const startRename = useCallback((node: WorkspaceTreeNode, actionPaths: readonly string[]) => {
    const targetPath = actionPaths[0] ?? node.path;

    setInlineEdit({
      id: `rename:${targetPath}`,
      kind: node.type === 'folder' ? 'rename-folder' : 'rename-file',
      path: targetPath,
      value: fileNameOfPath(targetPath),
    });
  }, []);

  const setInlineEditError = useCallback(
    (edit: WorkspaceExplorerInlineEditState, error: string) => {
      setInlineEdit({ ...edit, error });
    },
    [],
  );

  const handleInlineEditCommit = useCallback(
    ({ edit, value }: WorkspaceExplorerInlineEditCommitMeta) => {
      if (!workspaceState) return;

      void (async () => {
        const name = value.trim();
        if (!isSimpleWorkspaceName(name)) {
          setInlineEditError(edit, 'Use a simple file or folder name.');
          return;
        }

        if (edit.kind === 'create-file' || edit.kind === 'create-folder') {
          const parentPath = edit.parentPath ?? '';
          const path = joinWorkspacePath(parentPath, name);
          if (
            !isWorkspaceEntryPathAvailable({
              files: workspaceState.files,
              folders: workspaceState.folders,
              path,
            })
          ) {
            setInlineEditError(edit, `${name} already exists.`);
            return;
          }

          const result = await executeWorkspaceCommand(
            edit.kind === 'create-file'
              ? WORKBENCH_WORKSPACE_NEW_FILE_COMMAND_ID
              : WORKBENCH_WORKSPACE_NEW_FOLDER_COMMAND_ID,
            { name, parentPath },
          );
          setInlineEdit(undefined);
          selectCommandResult(result, setSelection);
          return;
        }

        const sourcePath = edit.path ?? '';
        const destinationPath = joinWorkspacePath(parentPathOf(sourcePath), name);
        if (
          !sourcePath ||
          !destinationPath ||
          !isWorkspaceEntryPathAvailable({
            excludedPaths: [sourcePath],
            files: workspaceState.files,
            folders: workspaceState.folders,
            path: destinationPath,
          })
        ) {
          setInlineEditError(edit, `${name} already exists.`);
          return;
        }

        if (sourcePath === destinationPath) {
          setInlineEdit(undefined);
          return;
        }

        const result = await executeWorkspaceCommand(WORKBENCH_WORKSPACE_RENAME_COMMAND_ID, {
          kind: edit.kind === 'rename-folder' ? 'folder' : 'file',
          name,
          path: sourcePath,
        });
        setInlineEdit(undefined);
        selectCommandResult(result, setSelection);
      })();
    },
    [executeWorkspaceCommand, setInlineEditError, workspaceState],
  );

  const handleInlineEditValueChange = useCallback(
    (value: string, edit: WorkspaceExplorerInlineEditState) => {
      setInlineEdit({ ...edit, error: undefined, value });
    },
    [],
  );

  const handleActivateFile = useCallback(
    (path: string) => {
      void executeWorkspaceCommand(WORKBENCH_WORKSPACE_OPEN_COMMAND_ID, {
        kind: 'file',
        path,
        paths: [path],
      });
    },
    [executeWorkspaceCommand],
  );

  const handleToggleFolder = useCallback((path: string) => {
    setExpandedPaths((currentPaths) => {
      const nextPaths = new Set(currentPaths);
      if (nextPaths.has(path)) {
        nextPaths.delete(path);
      } else {
        nextPaths.add(path);
      }
      return nextPaths;
    });
  }, []);

  const handleRequestDelete = useCallback(
    (meta: WorkspaceExplorerItemKeyboardActionMeta) => {
      const paths = meta.node.type === 'folder' ? [meta.node.path] : meta.actionPaths;
      void executeWorkspaceCommand(WORKBENCH_WORKSPACE_DELETE_COMMAND_ID, {
        kind: meta.node.type,
        paths,
      });
    },
    [executeWorkspaceCommand],
  );

  const handleRequestMove = useCallback(
    (meta: WorkspaceExplorerMoveRequestMeta) => {
      void (async () => {
        const result = await executeWorkspaceCommand(BUILTIN_EXPLORER_MOVE_COMMAND_ID, {
          sourcePaths: meta.sourcePaths,
          targetFolderPath: meta.targetFolderPath,
        });
        selectCommandResult(result, setSelection);
      })();
    },
    [executeWorkspaceCommand],
  );

  const handleRequestRename = useCallback(
    (meta: WorkspaceExplorerItemKeyboardActionMeta) => {
      startRename(meta.node, meta.actionPaths);
    },
    [startRename],
  );

  const handleItemContextMenu = useCallback(
    (
      event: ReactMouseEvent<HTMLButtonElement>,
      node: WorkspaceTreeNode,
      meta: WorkspaceExplorerItemContextMenuMeta,
    ) => {
      event.preventDefault();
      setContextMenu({
        ariaLabel: `${node.name} menu`,
        items: createExplorerItemContextMenuItems({
          actionPaths: meta.actionPaths,
          copyPaths: (paths) => {
            void executeWorkspaceCommand(WORKBENCH_WORKSPACE_COPY_PATH_COMMAND_ID, { paths });
          },
          createFile: (parentPath) => startCreate('create-file', parentPath),
          createFolder: (parentPath) => startCreate('create-folder', parentPath),
          deleteTargets: (paths) => {
            void executeWorkspaceCommand(WORKBENCH_WORKSPACE_DELETE_COMMAND_ID, {
              kind: node.type,
              paths,
            });
          },
          node,
          openFiles: (paths) => {
            void executeWorkspaceCommand(WORKBENCH_WORKSPACE_OPEN_COMMAND_ID, {
              kind: 'file',
              paths,
            });
          },
          renameTarget: () => startRename(node, meta.actionPaths),
        }),
        x: event.clientX,
        y: event.clientY,
      });
    },
    [executeWorkspaceCommand, startCreate, startRename],
  );

  const handleSelectionChange = useCallback(
    (nextSelection: WorkspaceSelectionState, _meta: WorkspaceExplorerSelectionChangeMeta) => {
      setSelection(nextSelection);
    },
    [],
  );

  if (!workspaceService || !workspaceState) {
    return (
      <section className="workbench-explorer-view" aria-label="Workspace Explorer">
        <p className="workbench-explorer-view__empty">No virtual workspace is registered.</p>
      </section>
    );
  }

  return (
    <section className="workbench-explorer-view" aria-label="Workspace Explorer">
      <div
        className="workbench-explorer-view__toolbar"
        role="toolbar"
        aria-label="Explorer actions"
      >
        <button
          aria-label="New file"
          className="workbench-explorer-view__tool-button"
          onClick={() => startCreate('create-file')}
          title="New file"
          type="button"
        >
          <i aria-hidden="true" className="codicon codicon-new-file" />
        </button>
        <button
          aria-label="New folder"
          className="workbench-explorer-view__tool-button"
          onClick={() => startCreate('create-folder')}
          title="New folder"
          type="button"
        >
          <i aria-hidden="true" className="codicon codicon-new-folder" />
        </button>
        <button
          aria-label="Refresh Explorer"
          className="workbench-explorer-view__tool-button"
          onClick={() => {
            void executeWorkspaceCommand(BUILTIN_EXPLORER_REFRESH_COMMAND_ID);
          }}
          title="Refresh Explorer"
          type="button"
        >
          <i aria-hidden="true" className="codicon codicon-refresh" />
        </button>
      </div>
      <WorkspaceExplorer
        activePath={activePath}
        expandedPaths={expandedPaths}
        inlineEdit={inlineEdit}
        nodes={nodes}
        selectedPaths={selection.paths}
        selectionAnchorPath={selection.anchorPath}
        onActivateFile={handleActivateFile}
        onItemContextMenu={handleItemContextMenu}
        onInlineEditCancel={() => setInlineEdit(undefined)}
        onInlineEditCommit={handleInlineEditCommit}
        onInlineEditValueChange={handleInlineEditValueChange}
        onRequestDelete={handleRequestDelete}
        onRequestMove={handleRequestMove}
        onRequestRename={handleRequestRename}
        onSelectionChange={handleSelectionChange}
        onToggleFolder={handleToggleFolder}
      />
      {contextMenu ? (
        <ContextMenu
          ariaLabel={contextMenu.ariaLabel}
          items={contextMenu.items}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </section>
  );
}

function createExplorerItemContextMenuItems({
  actionPaths,
  copyPaths,
  createFile,
  createFolder,
  deleteTargets,
  node,
  openFiles,
  renameTarget,
}: {
  actionPaths: readonly string[];
  copyPaths: (paths: readonly string[]) => void;
  createFile: (parentPath: string) => void;
  createFolder: (parentPath: string) => void;
  deleteTargets: (paths: readonly string[]) => void;
  node: WorkspaceTreeNode;
  openFiles: (paths: readonly string[]) => void;
  renameTarget: () => void;
}): ContextMenuItem[] {
  const multiSelection = actionPaths.length > 1;

  if (node.type === 'folder') {
    return [
      {
        id: 'workbench.explorer.newFile',
        icon: 'new-file',
        label: 'New file',
        onSelect: () => createFile(node.path),
      },
      {
        id: 'workbench.explorer.newFolder',
        icon: 'new-folder',
        label: 'New folder',
        onSelect: () => createFolder(node.path),
      },
      { id: 'workbench.explorer.separator.folder-create', type: 'separator' },
      {
        id: 'workbench.explorer.copyPath',
        icon: 'copy',
        label: 'Copy path',
        onSelect: () => copyPaths([node.path]),
      },
      {
        id: 'workbench.explorer.rename',
        icon: 'edit',
        label: 'Rename',
        shortcut: 'F2',
        onSelect: renameTarget,
      },
      { id: 'workbench.explorer.separator.folder-danger', type: 'separator' },
      {
        id: 'workbench.explorer.delete',
        danger: true,
        icon: 'trash',
        label: 'Delete folder',
        shortcut: 'Del',
        onSelect: () => deleteTargets([node.path]),
      },
    ];
  }

  return [
    {
      id: 'workbench.explorer.open',
      icon: 'go-to-file',
      label: multiSelection ? 'Open selected files' : 'Open file',
      onSelect: () => openFiles(actionPaths),
    },
    {
      id: 'workbench.explorer.copyPath',
      icon: 'copy',
      label: multiSelection ? 'Copy paths' : 'Copy path',
      onSelect: () => copyPaths(actionPaths),
    },
    { id: 'workbench.explorer.separator.file-edit', type: 'separator' },
    {
      id: 'workbench.explorer.rename',
      disabled: multiSelection,
      icon: 'edit',
      label: 'Rename',
      shortcut: 'F2',
      onSelect: renameTarget,
    },
    {
      id: 'workbench.explorer.delete',
      danger: true,
      icon: 'trash',
      label: multiSelection ? `Delete ${actionPaths.length} files` : 'Delete',
      shortcut: 'Del',
      onSelect: () => deleteTargets(actionPaths),
    },
  ];
}

function useWorkspaceResourceState(
  workspaceService: WorkspaceResourceService | undefined,
): VirtualWorkspaceState | undefined {
  const [state, setState] = useState(() => workspaceService?.getState());

  useEffect(() => {
    if (!workspaceService) {
      setState(undefined);
      return undefined;
    }

    setState(workspaceService.getState());
    return workspaceService.onDidChangeWorkspace((event: WorkspaceChangeEvent) => {
      setState(event.state);
    });
  }, [workspaceService]);

  return state;
}

function isWorkspaceResourceService(value: unknown): value is WorkspaceResourceService {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as WorkspaceResourceService).getState === 'function' &&
    typeof (value as WorkspaceResourceService).onDidChangeWorkspace === 'function'
  );
}

function isWorkspaceCommandResult(value: unknown): value is WorkspaceCommandResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const result = value as WorkspaceCommandResult;
  return (
    (result.path === undefined || typeof result.path === 'string') &&
    (result.paths === undefined ||
      (Array.isArray(result.paths) && result.paths.every((path) => typeof path === 'string')))
  );
}

function selectCommandResult(
  result: WorkspaceCommandResult | undefined,
  setSelection: (selection: WorkspaceSelectionState) => void,
): void {
  const paths = result?.paths ?? (result?.path ? [result.path] : []);
  if (paths.length === 0) return;

  setSelection({
    anchorPath: paths[paths.length - 1],
    paths: [...paths],
  });
}

function parentPaths(path: string): string[] {
  const segments = path.split('/').filter(Boolean);
  return segments.slice(0, -1).map((_, index) => segments.slice(0, index + 1).join('/'));
}
