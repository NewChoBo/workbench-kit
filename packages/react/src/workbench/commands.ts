import {
  commandMenuEntries,
  commandMenuEntry,
  commandMenuSeparator,
  type CommandDefinition,
  type CommandMenuEntry,
  type CommandMenuItem,
} from '@newchobo-ui/core';

import type { ContextMenuItem } from '../overlay/ContextMenu';

export const WORKBENCH_OPEN_SETTINGS_COMMAND_ID = 'workbench.openSettings';
export const WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID = 'workbench.togglePrimarySidebar';
export const WORKBENCH_EDITOR_SAVE_COMMAND_ID = 'editor.save';
export const WORKBENCH_EDITOR_DISCARD_CHANGES_COMMAND_ID = 'editor.discardChanges';
export const WORKBENCH_EDITOR_COPY_PATH_COMMAND_ID = 'editor.copyPath';
export const WORKBENCH_EDITOR_CLOSE_COMMAND_ID = 'editor.close';
export const WORKBENCH_EDITOR_CLOSE_OTHERS_COMMAND_ID = 'editor.closeOthers';
export const WORKBENCH_EDITOR_CLOSE_ALL_COMMAND_ID = 'editor.closeAll';
export const WORKBENCH_EDITOR_DELETE_COMMAND_ID = 'editor.delete';
export const WORKBENCH_WORKSPACE_NEW_FILE_COMMAND_ID = 'workspace.newFile';
export const WORKBENCH_WORKSPACE_NEW_FOLDER_COMMAND_ID = 'workspace.newFolder';
export const WORKBENCH_WORKSPACE_OPEN_COMMAND_ID = 'workspace.open';
export const WORKBENCH_WORKSPACE_COPY_PATH_COMMAND_ID = 'workspace.copyPath';
export const WORKBENCH_WORKSPACE_RENAME_COMMAND_ID = 'workspace.rename';
export const WORKBENCH_WORKSPACE_DELETE_COMMAND_ID = 'workspace.delete';
export const WORKBENCH_SEARCH_OPEN_RESULT_COMMAND_ID = 'search.openResult';
export const WORKBENCH_SEARCH_COPY_RESULT_PATH_COMMAND_ID = 'search.copyResultPath';
export const WORKBENCH_SEARCH_DELETE_RESULT_COMMAND_ID = 'search.deleteResult';

export interface WorkbenchShellCommandActivity<TActivityId extends string = string> {
  icon?: string;
  id: TActivityId;
  label: string;
}

export interface WorkbenchShellCommandContext<TActivityId extends string = string> {
  isPrimarySidebarVisible: boolean;
  openSettings: () => void;
  showActivity: (activityId: TActivityId) => void;
  togglePrimarySidebar: () => void;
}

export interface WorkbenchShellCommandPresetOptions<TActivityId extends string = string> {
  activities: WorkbenchShellCommandActivity<TActivityId>[];
  includeSettings?: boolean;
  includeSidebarToggle?: boolean;
  menuSeparatorId?: string;
  settingsIcon?: string;
  settingsLabel?: string;
  sidebarIcon?: string;
}

export interface WorkbenchEditorCommandContext {
  canCloseAll: boolean;
  canCloseOthers: boolean;
  canClosePath: boolean;
  canCopyPath: boolean;
  canDeletePath: boolean;
  canDiscardFile: boolean;
  canSaveFile: boolean;
  closeAll: () => void;
  closeOthers: () => void;
  closePath: () => void;
  copyPath: () => void;
  deletePath: () => void;
  discardFile: () => void;
  filePath?: string;
  hasMultipleOpenFiles: boolean;
  hasOpenFiles: boolean;
  hasUnsavedChanges: boolean;
  saveFile: () => void;
}

export interface WorkbenchWorkspaceCommandContext {
  copyWorkspaceTarget: () => void;
  createWorkspaceFile: () => void;
  createWorkspaceFolder: () => void;
  deleteWorkspaceTarget: () => void;
  fileActionPaths: string[];
  multiFileAction: boolean;
  openWorkspaceTarget: () => void;
  renameWorkspaceTarget: () => void;
  targetPaths: string[];
  workspaceTargetKind: 'file' | 'folder';
}

export interface WorkbenchSearchResultCommandContext {
  copyPath: () => void;
  deleteResult: () => void;
  openResult: () => void;
}

export function getWorkbenchShowActivityCommandId(activityId: string) {
  return `workbench.showActivity.${activityId}`;
}

export function createWorkbenchShellCommands<TActivityId extends string>({
  activities,
  includeSettings = true,
  includeSidebarToggle = true,
  settingsIcon = 'codicon-settings-gear',
  settingsLabel = 'Settings',
  sidebarIcon = 'codicon-layout-sidebar-left',
}: WorkbenchShellCommandPresetOptions<TActivityId>): CommandDefinition<
  WorkbenchShellCommandContext<TActivityId>
>[] {
  const activityCommands = activities.map<
    CommandDefinition<WorkbenchShellCommandContext<TActivityId>>
  >((activity) => ({
    id: getWorkbenchShowActivityCommandId(activity.id),
    icon: activity.icon,
    label: activity.label,
    run: ({ showActivity }) => showActivity(activity.id),
  }));

  const shellCommands: CommandDefinition<WorkbenchShellCommandContext<TActivityId>>[] = [];

  if (includeSidebarToggle) {
    shellCommands.push({
      id: WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID,
      icon: sidebarIcon,
      label: ({ isPrimarySidebarVisible }) =>
        isPrimarySidebarVisible ? 'Hide primary sidebar' : 'Show primary sidebar',
      run: ({ togglePrimarySidebar }) => togglePrimarySidebar(),
    });
  }

  if (includeSettings) {
    shellCommands.push({
      id: WORKBENCH_OPEN_SETTINGS_COMMAND_ID,
      icon: settingsIcon,
      label: settingsLabel,
      run: ({ openSettings }) => openSettings(),
    });
  }

  return [...activityCommands, ...shellCommands];
}

export function createWorkbenchShellMenuEntries<TActivityId extends string>({
  activities,
  includeSettings = true,
  includeSidebarToggle = true,
  menuSeparatorId = 'workbench-shell-separator',
}: WorkbenchShellCommandPresetOptions<TActivityId>): CommandMenuEntry<
  WorkbenchShellCommandContext<TActivityId>
>[] {
  const activityEntries = activities.map<
    CommandMenuEntry<WorkbenchShellCommandContext<TActivityId>>
  >((activity) =>
    commandMenuEntry<WorkbenchShellCommandContext<TActivityId>>(
      getWorkbenchShowActivityCommandId(activity.id),
    ),
  );
  const shellEntries: CommandMenuEntry<WorkbenchShellCommandContext<TActivityId>>[] = [];

  if (includeSidebarToggle) {
    shellEntries.push(
      commandMenuEntry<WorkbenchShellCommandContext<TActivityId>>(
        WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID,
      ),
    );
  }

  if (includeSettings) {
    shellEntries.push(
      commandMenuEntry<WorkbenchShellCommandContext<TActivityId>>(
        WORKBENCH_OPEN_SETTINGS_COMMAND_ID,
      ),
    );
  }

  if (!shellEntries.length) return activityEntries;
  return [...activityEntries, commandMenuSeparator(menuSeparatorId), ...shellEntries];
}

export function createWorkbenchEditorCommands(): CommandDefinition<WorkbenchEditorCommandContext>[] {
  return [
    {
      id: WORKBENCH_EDITOR_SAVE_COMMAND_ID,
      icon: 'codicon-save',
      isEnabled: ({ canSaveFile, hasUnsavedChanges }) => canSaveFile && hasUnsavedChanges,
      label: 'Save',
      run: ({ saveFile }) => saveFile(),
    },
    {
      id: WORKBENCH_EDITOR_DISCARD_CHANGES_COMMAND_ID,
      icon: 'codicon-discard',
      isEnabled: ({ canDiscardFile, hasUnsavedChanges }) => canDiscardFile && hasUnsavedChanges,
      label: 'Discard changes',
      run: ({ discardFile }) => discardFile(),
    },
    {
      id: WORKBENCH_EDITOR_COPY_PATH_COMMAND_ID,
      icon: 'codicon-copy',
      isEnabled: ({ canCopyPath, filePath }) => Boolean(filePath && canCopyPath),
      label: 'Copy path',
      run: ({ copyPath }) => copyPath(),
    },
    {
      id: WORKBENCH_EDITOR_CLOSE_COMMAND_ID,
      icon: 'codicon-close',
      isEnabled: ({ canClosePath, filePath }) => Boolean(filePath && canClosePath),
      label: 'Close',
      run: ({ closePath }) => closePath(),
    },
    {
      id: WORKBENCH_EDITOR_CLOSE_OTHERS_COMMAND_ID,
      icon: 'codicon-close-all',
      isEnabled: ({ canCloseOthers, filePath, hasMultipleOpenFiles }) =>
        Boolean(filePath && canCloseOthers && hasMultipleOpenFiles),
      label: 'Close others',
      run: ({ closeOthers }) => closeOthers(),
    },
    {
      id: WORKBENCH_EDITOR_CLOSE_ALL_COMMAND_ID,
      icon: 'codicon-close-all',
      isEnabled: ({ canCloseAll, hasOpenFiles }) => canCloseAll && hasOpenFiles,
      label: 'Close all',
      run: ({ closeAll }) => closeAll(),
    },
    {
      id: WORKBENCH_EDITOR_DELETE_COMMAND_ID,
      danger: true,
      icon: 'codicon-trash',
      isEnabled: ({ canDeletePath, filePath }) => Boolean(filePath && canDeletePath),
      label: 'Delete',
      run: ({ deletePath }) => deletePath(),
    },
  ];
}

export function createWorkbenchEditorTabListMenuEntries(): CommandMenuEntry<WorkbenchEditorCommandContext>[] {
  return commandMenuEntries<WorkbenchEditorCommandContext>(WORKBENCH_EDITOR_CLOSE_ALL_COMMAND_ID);
}

export function createWorkbenchEditorTabMenuEntries(): CommandMenuEntry<WorkbenchEditorCommandContext>[] {
  return [
    commandMenuEntry<WorkbenchEditorCommandContext>(WORKBENCH_EDITOR_COPY_PATH_COMMAND_ID),
    commandMenuSeparator('tab-file-separator'),
    ...commandMenuEntries<WorkbenchEditorCommandContext>(
      WORKBENCH_EDITOR_CLOSE_COMMAND_ID,
      WORKBENCH_EDITOR_CLOSE_OTHERS_COMMAND_ID,
      WORKBENCH_EDITOR_CLOSE_ALL_COMMAND_ID,
    ),
    commandMenuSeparator('tab-danger-separator'),
    commandMenuEntry<WorkbenchEditorCommandContext>(WORKBENCH_EDITOR_DELETE_COMMAND_ID),
  ];
}

export function createWorkbenchWorkspaceCommands<
  TContext extends WorkbenchWorkspaceCommandContext = WorkbenchWorkspaceCommandContext,
>(): CommandDefinition<TContext>[] {
  return [
    {
      id: WORKBENCH_WORKSPACE_NEW_FILE_COMMAND_ID,
      icon: 'codicon-new-file',
      label: 'New file',
      run: ({ createWorkspaceFile }) => createWorkspaceFile(),
    },
    {
      id: WORKBENCH_WORKSPACE_NEW_FOLDER_COMMAND_ID,
      icon: 'codicon-new-folder',
      label: 'New folder',
      run: ({ createWorkspaceFolder }) => createWorkspaceFolder(),
    },
    {
      id: WORKBENCH_WORKSPACE_OPEN_COMMAND_ID,
      icon: ({ workspaceTargetKind }) =>
        workspaceTargetKind === 'folder' ? 'codicon-folder-opened' : 'codicon-go-to-file',
      label: ({ multiFileAction, workspaceTargetKind }) =>
        workspaceTargetKind === 'folder'
          ? 'Reveal folder'
          : multiFileAction
            ? 'Open selected files'
            : 'Open file',
      run: ({ openWorkspaceTarget }) => openWorkspaceTarget(),
    },
    {
      id: WORKBENCH_WORKSPACE_COPY_PATH_COMMAND_ID,
      icon: 'codicon-copy',
      label: ({ targetPaths }) => (targetPaths.length > 1 ? 'Copy paths' : 'Copy path'),
      run: ({ copyWorkspaceTarget }) => copyWorkspaceTarget(),
    },
    {
      id: WORKBENCH_WORKSPACE_RENAME_COMMAND_ID,
      icon: 'codicon-edit',
      isEnabled: ({ targetPaths }) => targetPaths.length === 1,
      label: 'Rename',
      run: ({ renameWorkspaceTarget }) => renameWorkspaceTarget(),
      shortcut: 'F2',
    },
    {
      id: WORKBENCH_WORKSPACE_DELETE_COMMAND_ID,
      danger: true,
      icon: 'codicon-trash',
      isEnabled: ({ fileActionPaths, workspaceTargetKind }) =>
        workspaceTargetKind === 'folder' || fileActionPaths.length > 0,
      label: ({ fileActionPaths, multiFileAction, workspaceTargetKind }) =>
        workspaceTargetKind === 'folder'
          ? 'Delete folder'
          : multiFileAction
            ? `Delete ${fileActionPaths.length} files`
            : 'Delete',
      run: ({ deleteWorkspaceTarget }) => deleteWorkspaceTarget(),
      shortcut: 'Del',
    },
  ];
}

export function createWorkbenchWorkspaceCreateMenuEntries<
  TContext extends WorkbenchWorkspaceCommandContext = WorkbenchWorkspaceCommandContext,
>(): CommandMenuEntry<TContext>[] {
  return commandMenuEntries<TContext>(
    WORKBENCH_WORKSPACE_NEW_FILE_COMMAND_ID,
    WORKBENCH_WORKSPACE_NEW_FOLDER_COMMAND_ID,
  );
}

export function createWorkbenchWorkspaceTargetMenuEntries<
  TContext extends WorkbenchWorkspaceCommandContext = WorkbenchWorkspaceCommandContext,
>(): CommandMenuEntry<TContext>[] {
  return [
    ...commandMenuEntries<TContext>(
      WORKBENCH_WORKSPACE_OPEN_COMMAND_ID,
      WORKBENCH_WORKSPACE_COPY_PATH_COMMAND_ID,
    ),
    commandMenuSeparator('workspace-separator'),
    ...commandMenuEntries<TContext>(
      WORKBENCH_WORKSPACE_RENAME_COMMAND_ID,
      WORKBENCH_WORKSPACE_DELETE_COMMAND_ID,
    ),
  ];
}

export function createWorkbenchWorkspaceFolderMenuEntries<
  TContext extends WorkbenchWorkspaceCommandContext = WorkbenchWorkspaceCommandContext,
>(): CommandMenuEntry<TContext>[] {
  return [
    ...createWorkbenchWorkspaceCreateMenuEntries(),
    commandMenuSeparator('workspace-create-separator'),
    ...createWorkbenchWorkspaceTargetMenuEntries(),
  ];
}

export function createWorkbenchSearchResultCommands<
  TContext extends WorkbenchSearchResultCommandContext = WorkbenchSearchResultCommandContext,
>(): CommandDefinition<TContext>[] {
  return [
    {
      id: WORKBENCH_SEARCH_OPEN_RESULT_COMMAND_ID,
      icon: 'codicon-folder-opened',
      label: 'Open',
      run: ({ openResult }) => openResult(),
      shortcut: 'Enter',
    },
    {
      id: WORKBENCH_SEARCH_COPY_RESULT_PATH_COMMAND_ID,
      icon: 'codicon-copy',
      label: 'Copy path',
      run: ({ copyPath }) => copyPath(),
    },
    {
      id: WORKBENCH_SEARCH_DELETE_RESULT_COMMAND_ID,
      danger: true,
      icon: 'codicon-trash',
      label: 'Delete',
      run: ({ deleteResult }) => deleteResult(),
    },
  ];
}

export function createWorkbenchSearchResultMenuEntries<
  TContext extends WorkbenchSearchResultCommandContext = WorkbenchSearchResultCommandContext,
>(): CommandMenuEntry<TContext>[] {
  return [
    ...commandMenuEntries<TContext>(
      WORKBENCH_SEARCH_OPEN_RESULT_COMMAND_ID,
      WORKBENCH_SEARCH_COPY_RESULT_PATH_COMMAND_ID,
    ),
    commandMenuSeparator('result-menu-separator'),
    commandMenuEntry<TContext>(WORKBENCH_SEARCH_DELETE_RESULT_COMMAND_ID),
  ];
}

export function commandMenuItemsToContextMenuItems(
  items: CommandMenuItem[],
  onSelectCommand: (commandId: string) => void,
): ContextMenuItem[] {
  return items.map((item) =>
    item.type === 'separator'
      ? { id: item.id, type: 'separator' }
      : {
          id: item.id,
          label: item.label,
          icon: item.icon,
          shortcut: item.shortcut,
          disabled: item.disabled,
          danger: item.danger,
          onSelect: () => onSelectCommand(item.commandId),
        },
  );
}
