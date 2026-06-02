import { createCommandRegistry, executeCommand, resolveCommandMenuItems } from '@newchobo-ui/core';
import { describe, expect, it } from 'vitest';
import {
  WORKBENCH_OPEN_SETTINGS_COMMAND_ID,
  WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID,
  createWorkbenchShellCommands,
  createWorkbenchShellMenuEntries,
  getWorkbenchShowActivityCommandId,
  type WorkbenchShellCommandActivity,
  type WorkbenchShellCommandContext,
} from './commands';

type TestActivityId = 'explorer' | 'search';

function createContext(
  overrides: Partial<WorkbenchShellCommandContext<TestActivityId>> = {},
): WorkbenchShellCommandContext<TestActivityId> {
  return {
    isPrimarySidebarVisible: true,
    openSettings: () => undefined,
    showActivity: () => undefined,
    togglePrimarySidebar: () => undefined,
    ...overrides,
  };
}

const activities = [
  { id: 'explorer', label: 'Explorer', icon: 'codicon-files' },
  { id: 'search', label: 'Search', icon: 'codicon-search' },
] satisfies WorkbenchShellCommandActivity<TestActivityId>[];

describe('workbench shell command presets', () => {
  it('creates activity, sidebar, and settings menu items', () => {
    const registry = createCommandRegistry(createWorkbenchShellCommands({ activities }));
    const items = resolveCommandMenuItems({
      context: createContext(),
      entries: createWorkbenchShellMenuEntries({ activities }),
      registry,
    });

    expect(items).toEqual([
      {
        commandId: getWorkbenchShowActivityCommandId('explorer'),
        danger: undefined,
        disabled: false,
        icon: 'codicon-files',
        id: getWorkbenchShowActivityCommandId('explorer'),
        label: 'Explorer',
        shortcut: undefined,
        type: 'command',
      },
      {
        commandId: getWorkbenchShowActivityCommandId('search'),
        danger: undefined,
        disabled: false,
        icon: 'codicon-search',
        id: getWorkbenchShowActivityCommandId('search'),
        label: 'Search',
        shortcut: undefined,
        type: 'command',
      },
      { id: 'workbench-shell-separator', type: 'separator' },
      {
        commandId: WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID,
        danger: undefined,
        disabled: false,
        icon: 'codicon-layout-sidebar-left',
        id: WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID,
        label: 'Hide primary sidebar',
        shortcut: undefined,
        type: 'command',
      },
      {
        commandId: WORKBENCH_OPEN_SETTINGS_COMMAND_ID,
        danger: undefined,
        disabled: false,
        icon: 'codicon-settings-gear',
        id: WORKBENCH_OPEN_SETTINGS_COMMAND_ID,
        label: 'Settings',
        shortcut: undefined,
        type: 'command',
      },
    ]);
  });

  it('executes shell command handlers through the provided context', () => {
    const calls: string[] = [];
    const registry = createCommandRegistry(createWorkbenchShellCommands({ activities }));
    const context = createContext({
      openSettings: () => calls.push('settings'),
      showActivity: (activityId) => calls.push(`activity:${activityId}`),
      togglePrimarySidebar: () => calls.push('sidebar'),
    });

    executeCommand(registry, getWorkbenchShowActivityCommandId('search'), context);
    executeCommand(registry, WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID, context);
    executeCommand(registry, WORKBENCH_OPEN_SETTINGS_COMMAND_ID, context);

    expect(calls).toEqual(['activity:search', 'sidebar', 'settings']);
  });

  it('can create activity-only shell menus', () => {
    const registry = createCommandRegistry(
      createWorkbenchShellCommands({
        activities,
        includeSettings: false,
        includeSidebarToggle: false,
      }),
    );
    const items = resolveCommandMenuItems({
      context: createContext({ isPrimarySidebarVisible: false }),
      entries: createWorkbenchShellMenuEntries({
        activities,
        includeSettings: false,
        includeSidebarToggle: false,
      }),
      registry,
    });

    expect(items.map((item) => item.type === 'command' && item.label)).toEqual([
      'Explorer',
      'Search',
    ]);
  });
});
