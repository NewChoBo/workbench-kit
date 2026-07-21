import type { ContextMenuItem } from '@workbench-kit/react/overlay';
import {
  WORKBENCH_COMMAND_SURFACE_WORKSPACE,
  commandMenuItemsToContextMenuItems,
  createWorkbenchWorkspaceCommands,
  createWorkbenchWorkspaceFolderMenuEntries,
  createWorkbenchWorkspaceTargetMenuEntries,
  type WorkbenchWorkspaceCommandContext,
} from '@workbench-kit/react/workbench/commands';
import {
  createCommandRegistry,
  executeCommand as executeRegisteredCommand,
  resolveCommandMenuItems,
} from '@workbench-kit/platform';
import { parentPathOf, type WorkspaceTreeNode } from '@workbench-kit/workspace';
import type { ExtensionRegistry } from '@workbench-kit/workbench-core';
import {
  appendExtensionContextMenuItems,
  createExtensionContextMenuItems,
} from './extension-context-menu.js';

const workspaceCommandRegistry = createCommandRegistry(createWorkbenchWorkspaceCommands());
const workspaceFolderMenuEntries =
  createWorkbenchWorkspaceFolderMenuEntries<WorkbenchWorkspaceCommandContext>();
const workspaceTargetMenuEntries =
  createWorkbenchWorkspaceTargetMenuEntries<WorkbenchWorkspaceCommandContext>();
const EXPLORER_CONTEXT_MENU = 'explorer/context';
const EXPLORER_EXTENSION_MENU_SEPARATOR_ID = 'explorer-extension-separator';

export function createExplorerItemContextMenuItems({
  actionPaths,
  copyPaths,
  createFile,
  createFolder,
  deleteTargets,
  executeExtensionCommand,
  extensionRegistry,
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
  executeExtensionCommand?: ((commandId: string) => unknown) | undefined;
  extensionRegistry?: ExtensionRegistry | undefined;
  files: readonly { path: string }[];
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
    createWorkspaceFile: () =>
      createFile(node.type === 'folder' ? node.path : parentPathOf(node.path)),
    createWorkspaceFolder: () =>
      createFolder(node.type === 'folder' ? node.path : parentPathOf(node.path)),
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

  const baseItems = commandMenuItemsToContextMenuItems(
    resolveCommandMenuItems({
      context,
      contextKeys,
      entries: node.type === 'folder' ? workspaceFolderMenuEntries : workspaceTargetMenuEntries,
      registry: workspaceCommandRegistry,
      surface: WORKBENCH_COMMAND_SURFACE_WORKSPACE,
    }),
    (commandId) =>
      executeRegisteredCommand(workspaceCommandRegistry, commandId, context, contextKeys),
  );

  return appendExtensionContextMenuItems(
    baseItems,
    createExtensionContextMenuItems({
      contextKeys,
      executeCommand: executeExtensionCommand,
      extensionRegistry,
      menu: EXPLORER_CONTEXT_MENU,
    }),
    EXPLORER_EXTENSION_MENU_SEPARATOR_ID,
  );
}
