import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { ContextMenu, type ContextMenuItem } from '@workbench-kit/react/overlay';
import { ViewEmptyState } from '@workbench-kit/react/primitives';
import {
  WORKBENCH_COMMAND_SURFACE_WORKSPACE,
  commandMenuItemsToContextMenuItems,
  createWorkbenchWorkspaceCommands,
  createWorkbenchWorkspaceFolderMenuEntries,
  createWorkbenchWorkspaceTargetMenuEntries,
  type WorkbenchWorkspaceCommandContext,
} from '@workbench-kit/react/workbench';
import {
  WorkspaceExplorerPanel,
  buildWorkspaceExplorerNodes,
  resolveWorkspaceExplorerSectionTitle,
  useWorkspaceExplorerController,
} from '@workbench-kit/react/workbench/workspace';
import {
  type WorkspaceExplorerItemContextMenuMeta,
} from '@workbench-kit/react/workbench/workspace/explorer';
import {
  parseWorkspaceResourceUri,
  resolveWorkspaceCreateParentPath,
  type WorkspaceTreeNode,
} from '@workbench-kit/workspace';
import {
  createCommandRegistry,
  executeCommand as executeRegisteredCommand,
  resolveCommandMenuItems,
} from '@workbench-kit/platform';

import { createCommandWorkspaceExplorerPort } from './createCommandWorkspaceExplorerPort.js';
import {
  BUILTIN_EXPLORER_REFRESH_COMMAND_ID,
  type BuiltinExplorerViewRenderData,
} from './explorer-view-data.js';
import { useWorkbench } from './provider.js';
import { useActiveEditorTab } from './use-editor.js';
import { isWorkspaceResourceService, useWorkspaceResourceState } from './workspace-view-state.js';

export type { BuiltinExplorerViewRenderData };
export { BUILTIN_EXPLORER_MOVE_COMMAND_ID, BUILTIN_EXPLORER_REFRESH_COMMAND_ID, BUILTIN_EXPLORER_VIEW_RENDER_KIND, isBuiltinExplorerViewRenderData } from './explorer-view-data.js';

const WORKBENCH_WORKSPACE_COPY_PATH_COMMAND_ID = 'workspace.copyPath' as const;
const WORKBENCH_WORKSPACE_DELETE_COMMAND_ID = 'workspace.delete' as const;
const WORKBENCH_WORKSPACE_OPEN_COMMAND_ID = 'workspace.open' as const;

interface ExplorerContextMenuState {
  readonly ariaLabel: string;
  readonly items: ContextMenuItem[];
  readonly x: number;
  readonly y: number;
}

const workspaceCommandRegistry = createCommandRegistry(createWorkbenchWorkspaceCommands());
const workspaceFolderMenuEntries =
  createWorkbenchWorkspaceFolderMenuEntries<WorkbenchWorkspaceCommandContext>();
const workspaceTargetMenuEntries =
  createWorkbenchWorkspaceTargetMenuEntries<WorkbenchWorkspaceCommandContext>();

export function BuiltinExplorerView() {
  const { executeCommand, workspaceHostPort } = useWorkbench();
  const activeTab = useActiveEditorTab();
  const workspaceService = isWorkspaceResourceService(workspaceHostPort?.service)
    ? workspaceHostPort.service
    : undefined;
  const workspaceState = useWorkspaceResourceState(workspaceService);
  const [contextMenu, setContextMenu] = useState<ExplorerContextMenuState | null>(null);
  const [seededExpandedPaths, setSeededExpandedPaths] = useState(false);

  const activePath = useMemo(() => {
    if (!activeTab?.resourceUri) return undefined;

    const resource = parseWorkspaceResourceUri(activeTab.resourceUri);
    return resource?.kind === 'file' ? resource.path : undefined;
  }, [activeTab?.resourceUri]);

  const port = useMemo(
    () =>
      createCommandWorkspaceExplorerPort({
        executeCommand,
        workspaceState,
      }),
    [executeCommand, workspaceState],
  );

  const explorer = useWorkspaceExplorerController({
    activePath,
    initialExpandedPaths: workspaceState?.expandedPaths,
    port,
  });

  useEffect(() => {
    if (!workspaceState || seededExpandedPaths) {
      return;
    }

    workspaceState.expandedPaths.forEach((path) => {
      explorer.revealFolder(path);
    });
    setSeededExpandedPaths(true);
  }, [explorer, seededExpandedPaths, workspaceState]);

  const nodes = useMemo(
    () =>
      buildWorkspaceExplorerNodes({
        files: workspaceState?.files ?? [],
        folders: workspaceState?.folders ?? [],
      }),
    [workspaceState],
  );

  const sectionTitle = useMemo(
    () => resolveWorkspaceExplorerSectionTitle(workspaceState?.files ?? []),
    [workspaceState?.files],
  );

  const createParentPath = useMemo(
    () => resolveWorkspaceCreateParentPath(explorer.selection.focusedPath, workspaceState?.folders ?? []),
    [explorer.selection.focusedPath, workspaceState?.folders],
  );

  const executeWorkspaceCommand = useCallback(
    async (commandId: string, payload?: unknown) => {
      await executeCommand(commandId, payload);
    },
    [executeCommand],
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
          createFile: (parentPath) => explorer.startCreate('create-file', parentPath),
          createFolder: (parentPath) => explorer.startCreate('create-folder', parentPath),
          deleteTargets: (paths) => {
            void executeWorkspaceCommand(WORKBENCH_WORKSPACE_DELETE_COMMAND_ID, {
              kind: node.type,
              paths,
            });
          },
          files: workspaceState?.files ?? [],
          node,
          openFiles: (paths) => {
            void executeWorkspaceCommand(WORKBENCH_WORKSPACE_OPEN_COMMAND_ID, {
              kind: 'file',
              paths,
            });
          },
          revealFolder: explorer.revealFolder,
          renameTarget: () => explorer.startRename(node, meta.actionPaths),
        }),
        x: event.clientX,
        y: event.clientY,
      });
    },
    [executeWorkspaceCommand, explorer, workspaceState?.files],
  );

  if (!workspaceService || !workspaceState) {
    return (
      <ViewEmptyState className="workbench-explorer-view">No virtual workspace is registered.</ViewEmptyState>
    );
  }

  return (
    <>
      <WorkspaceExplorerPanel
        activePath={activePath}
        aria-label="Workspace Explorer"
        expandedPaths={explorer.expandedPaths}
        focusedPath={explorer.selection.focusedPath}
        inlineEdit={explorer.inlineEdit}
        nodes={nodes}
        onNewFile={() => explorer.startCreate('create-file', createParentPath)}
        onNewFolder={() => explorer.startCreate('create-folder', createParentPath)}
        onRefresh={() => {
          void executeWorkspaceCommand(BUILTIN_EXPLORER_REFRESH_COMMAND_ID);
        }}
        sectionTitle={sectionTitle}
        selectedPaths={explorer.selection.paths}
        selectionAnchorPath={explorer.selection.anchorPath}
        onActivateFile={explorer.handleActivateFile}
        onItemContextMenu={handleItemContextMenu}
        onInlineEditCancel={explorer.cancelInlineEdit}
        onInlineEditCommit={explorer.handleInlineEditCommit}
        onInlineEditValueChange={explorer.handleInlineEditValueChange}
        onRequestDelete={explorer.handleRequestDelete}
        onRequestMove={explorer.handleRequestMove}
        onRequestRename={explorer.handleRequestRename}
        onSelectionChange={explorer.handleSelectionChange}
        onToggleFolder={explorer.handleToggleFolder}
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
    </>
  );
}

function createExplorerItemContextMenuItems({
  actionPaths,
  copyPaths,
  createFile,
  createFolder,
  deleteTargets,
  files,
  node,
  openFiles,
  revealFolder,
  renameTarget,
}: {
  actionPaths: readonly string[];
  copyPaths: (paths: string[]) => void;
  createFile: (parentPath: string) => void;
  createFolder: (parentPath: string) => void;
  deleteTargets: (paths: string[]) => void;
  files: { path: string }[];
  node: WorkspaceTreeNode;
  openFiles: (paths: string[]) => void;
  revealFolder: (path: string) => void;
  renameTarget: () => void;
}): ContextMenuItem[] {
  const fileActionPaths =
    node.type === 'file'
      ? actionPaths.length > 0
        ? [...actionPaths]
        : [node.path]
      : actionPaths.filter((path) => files.some((file) => file.path === path));
  const multiFileAction = fileActionPaths.length > 1;
  const targetPaths = node.type === 'folder' ? [node.path] : [...fileActionPaths];
  const contextKeys = {
    'workspace.hasSelection': targetPaths.length > 0,
    'workspace.multiSelection': node.type === 'file' && multiFileAction,
  };

  const context: WorkbenchWorkspaceCommandContext = {
    copyWorkspaceTarget: () => copyPaths([...targetPaths]),
    createWorkspaceFile: () => createFile(node.type === 'folder' ? node.path : parentPathOf(node.path)),
    createWorkspaceFolder: () => createFolder(node.type === 'folder' ? node.path : parentPathOf(node.path)),
    deleteWorkspaceTarget: () => deleteTargets([...targetPaths]),
    fileActionPaths,
    multiFileAction,
    openWorkspaceTarget: () => {
      if (node.type === 'folder') {
        revealFolder(node.path);
        return;
      }

      openFiles(fileActionPaths);
    },
    renameWorkspaceTarget: renameTarget,
    targetPaths,
    workspaceTargetKind: node.type,
  };

  return commandMenuItemsToContextMenuItems(
    resolveCommandMenuItems({
      context,
      contextKeys,
      entries:
        node.type === 'folder' ? workspaceFolderMenuEntries : workspaceTargetMenuEntries,
      registry: workspaceCommandRegistry,
      surface: WORKBENCH_COMMAND_SURFACE_WORKSPACE,
    }),
    (commandId) =>
      executeRegisteredCommand(workspaceCommandRegistry, commandId, context, contextKeys),
  );
}

function parentPathOf(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? '' : path.slice(0, index);
}
