import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { ContextMenu, type ContextMenuItem } from '@workbench-kit/react/overlay';
import { ViewEmptyState } from '@workbench-kit/react/primitives';
import {
  WORKBENCH_WORKSPACE_COPY_PATH_COMMAND_ID,
  WORKBENCH_WORKSPACE_DELETE_COMMAND_ID,
  WORKBENCH_WORKSPACE_OPEN_COMMAND_ID,
} from '@workbench-kit/react/workbench/commands';
import {
  WorkspaceExplorerPanel,
  buildWorkspaceExplorerNodes,
  resolveWorkspaceExplorerSectionTitle,
  useWorkspaceExplorerController,
} from '@workbench-kit/react/workbench/workspace';
import { type WorkspaceExplorerItemContextMenuMeta } from '@workbench-kit/react/workbench/workspace/explorer';
import { resolveWorkspaceCreateParentPath, type WorkspaceTreeNode } from '@workbench-kit/workspace';
import { createCommandWorkspaceExplorerPort } from './createCommandWorkspaceExplorerPort.js';
import { createExplorerItemContextMenuItems } from './explorer-context-menu.js';
import { applyExplorerPathReveal, subscribeExplorerRevealRequest } from './explorer-reveal.js';
import {
  BUILTIN_EXPLORER_REFRESH_COMMAND_ID,
  type BuiltinExplorerViewRenderData,
} from './explorer-view-data.js';
import { useWorkbench } from './provider.js';
import { useActiveWorkspacePath } from './use-active-workspace-path.js';
import { useActiveEditorTab } from './use-editor.js';
import { isWorkspaceResourceService, useWorkspaceResourceState } from './workspace-view-state.js';

export type { BuiltinExplorerViewRenderData };
export {
  BUILTIN_EXPLORER_MOVE_COMMAND_ID,
  BUILTIN_EXPLORER_REFRESH_COMMAND_ID,
  BUILTIN_EXPLORER_VIEW_RENDER_KIND,
  isBuiltinExplorerViewRenderData,
} from './explorer-view-data.js';

interface ExplorerContextMenuState {
  readonly ariaLabel: string;
  readonly items: ContextMenuItem[];
  readonly x: number;
  readonly y: number;
}

export function BuiltinExplorerView() {
  const { executeCommand, workspaceHostPort } = useWorkbench();
  const activeTab = useActiveEditorTab();
  const workspaceService = isWorkspaceResourceService(workspaceHostPort?.service)
    ? workspaceHostPort.service
    : undefined;
  const workspaceState = useWorkspaceResourceState(workspaceService);
  const [contextMenu, setContextMenu] = useState<ExplorerContextMenuState | null>(null);
  const [seededExpandedPaths, setSeededExpandedPaths] = useState(false);

  const activePath = useActiveWorkspacePath(activeTab?.resourceUri);

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
  const explorerRef = useRef(explorer);
  explorerRef.current = explorer;

  useEffect(() => {
    if (!workspaceState || seededExpandedPaths) {
      return;
    }

    workspaceState.expandedPaths.forEach((path) => {
      explorer.revealFolder(path);
    });
    setSeededExpandedPaths(true);
  }, [explorer, seededExpandedPaths, workspaceState]);

  useEffect(
    () =>
      subscribeExplorerRevealRequest((path) => {
        const currentExplorer = explorerRef.current;
        applyExplorerPathReveal(path, {
          revealFolder: currentExplorer.revealFolder,
          setSelection: (selection) => {
            currentExplorer.handleSelectionChange(selection, { mode: 'single', reason: 'click' });
          },
        });
      }),
    [],
  );

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
    () =>
      resolveWorkspaceCreateParentPath(
        explorer.selection.focusedPath,
        workspaceState?.folders ?? [],
      ),
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
      <ViewEmptyState className="workbench-explorer-view">
        No virtual workspace is registered.
      </ViewEmptyState>
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
