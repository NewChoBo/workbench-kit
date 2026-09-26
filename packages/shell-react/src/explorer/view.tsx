import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ContextMenu, type ContextMenuItem } from '@workbench-kit/react/overlay';
import { SideBarHeaderControl } from '@workbench-kit/react/layout';
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
import { type WorkspaceExplorerItemContextMenuRequest } from '@workbench-kit/react/workbench/workspace/explorer';
import {
  resolveWorkspaceCreateParentPath,
  type VirtualWorkspaceState,
  type WorkspaceResourceService,
} from '@workbench-kit/workspace';
import { createCommandWorkspaceExplorerPort } from './create-command-workspace-explorer-port.js';
import { createExplorerItemContextMenuItems } from './context-menu.js';
import { applyExplorerPathReveal, subscribeExplorerRevealRequest } from './reveal.js';
import {
  BUILTIN_EXPLORER_REFRESH_COMMAND_ID,
  type BuiltinExplorerViewRenderData,
} from './view-data.js';
import { useWorkbench } from '../shell/provider.js';
import { useActiveWorkspacePath } from './use-active-workspace-path.js';
import { useActiveEditorTab } from '../editor/use-editor.js';
import {
  isWorkspaceResourceService,
  useWorkspaceResourceState,
} from '../workbench/workspace-view-state.js';

export type { BuiltinExplorerViewRenderData };
export {
  BUILTIN_EXPLORER_MOVE_COMMAND_ID,
  BUILTIN_EXPLORER_REFRESH_COMMAND_ID,
  BUILTIN_EXPLORER_VIEW_RENDER_KIND,
  isBuiltinExplorerViewRenderData,
} from './view-data.js';

interface ExplorerContextMenuState {
  readonly ariaLabel: string;
  readonly items: ContextMenuItem[];
  readonly x: number;
  readonly y: number;
  readonly invoker: HTMLButtonElement;
  readonly workspaceService: WorkspaceResourceService;
  readonly workspaceState: VirtualWorkspaceState;
}

export function BuiltinExplorerView() {
  const { commands, executeCommand, menus, workspaceHostPort } = useWorkbench();
  const activeTab = useActiveEditorTab();
  const workspaceService = isWorkspaceResourceService(workspaceHostPort?.service)
    ? workspaceHostPort.service
    : undefined;
  const workspaceState = useWorkspaceResourceState(workspaceService);
  const [contextMenu, setContextMenu] = useState<ExplorerContextMenuState | null>(null);
  const [actionError, setActionError] = useState<string | undefined>();
  const [seededExpandedPaths, setSeededExpandedPaths] = useState(false);
  const explorerRef = useRef<ReturnType<typeof useWorkspaceExplorerController> | undefined>(
    undefined,
  );

  const activePath = useActiveWorkspacePath(activeTab?.resourceUri);

  const port = useMemo(
    () =>
      createCommandWorkspaceExplorerPort({
        executeCommand,
        reportError: (message) => {
          if (!explorerRef.current?.inlineEdit) {
            setActionError(message);
          }
        },
        workspaceState,
      }),
    [executeCommand, workspaceState],
  );

  const explorer = useWorkspaceExplorerController({
    activePath,
    initialExpandedPaths: workspaceState?.expandedPaths,
    port,
  });
  explorerRef.current = explorer;

  const currentContextMenu =
    contextMenu?.workspaceService === workspaceService &&
    contextMenu?.workspaceState === workspaceState &&
    !explorer.inlineEdit
      ? contextMenu
      : null;
  useEffect(() => {
    if (contextMenu && !currentContextMenu) setContextMenu(null);
  }, [contextMenu, currentContextMenu]);

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
        if (!currentExplorer) return;
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
      try {
        const result = await executeCommand(commandId, payload);
        setActionError(undefined);
        return result;
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'Could not complete workspace action.',
        );
        return undefined;
      }
    },
    [executeCommand],
  );

  useEffect(() => {
    if (workspaceState) {
      setActionError(undefined);
    }
  }, [workspaceState]);

  const handleItemContextMenu = useCallback(
    ({ node, meta, invoker, x, y }: WorkspaceExplorerItemContextMenuRequest) => {
      if (!workspaceService || !workspaceState || explorer.inlineEdit) return;
      setContextMenu({
        ariaLabel: `${node.name} menu`,
        items: createExplorerItemContextMenuItems({
          actionPaths: meta.actionPaths,
          commands,
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
          executeExtensionCommand: (commandId) => executeCommand(commandId),
          files: workspaceState?.files ?? [],
          menus,
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
        x,
        y,
        invoker,
        workspaceService,
        workspaceState,
      });
    },
    [
      commands,
      executeCommand,
      executeWorkspaceCommand,
      explorer,
      menus,
      workspaceService,
      workspaceState,
    ],
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
        headerAddon={
          actionError ? (
            <SideBarHeaderControl>
              <span role="alert" style={{ overflowWrap: 'anywhere' }}>
                {actionError}
              </span>
            </SideBarHeaderControl>
          ) : undefined
        }
        selectedPaths={explorer.selection.paths}
        selectionAnchorPath={explorer.selection.anchorPath}
        onActivateFile={explorer.handleActivateFile}
        onRequestItemContextMenu={handleItemContextMenu}
        onInlineEditCancel={explorer.cancelInlineEdit}
        onInlineEditCommit={explorer.handleInlineEditCommit}
        onInlineEditValueChange={explorer.handleInlineEditValueChange}
        onRequestDelete={explorer.handleRequestDelete}
        onRequestMove={explorer.handleRequestMove}
        onRequestRename={explorer.handleRequestRename}
        onSelectionChange={explorer.handleSelectionChange}
        onToggleFolder={explorer.handleToggleFolder}
      />
      {currentContextMenu ? (
        <ContextMenu
          ariaLabel={currentContextMenu.ariaLabel}
          items={currentContextMenu.items}
          x={currentContextMenu.x}
          y={currentContextMenu.y}
          returnFocusTarget={currentContextMenu.invoker}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </>
  );
}
