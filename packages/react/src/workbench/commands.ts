import {
  commandMenuSeparator,
  type CommandDefinition,
  type CommandMenuEntry,
  type CommandMenuItem,
} from '@newchobo-ui/core';

import type { ContextMenuItem } from '../overlay/ContextMenu';

export const WORKBENCH_OPEN_SETTINGS_COMMAND_ID = 'workbench.openSettings';
export const WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID = 'workbench.togglePrimarySidebar';

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
  >((activity) => ({ commandId: getWorkbenchShowActivityCommandId(activity.id) }));
  const shellEntries: CommandMenuEntry<WorkbenchShellCommandContext<TActivityId>>[] = [];

  if (includeSidebarToggle) {
    shellEntries.push({ commandId: WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID });
  }

  if (includeSettings) {
    shellEntries.push({ commandId: WORKBENCH_OPEN_SETTINGS_COMMAND_ID });
  }

  if (!shellEntries.length) return activityEntries;
  return [...activityEntries, commandMenuSeparator(menuSeparatorId), ...shellEntries];
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
