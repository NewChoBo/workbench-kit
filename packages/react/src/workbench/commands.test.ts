import { createCommandRegistry, executeCommand, resolveCommandMenuItems } from '@newchobo-ui/core';
import { describe, expect, it } from 'vitest';
import {
  WORKBENCH_OPEN_SETTINGS_COMMAND_ID,
  WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID,
  createWorkbenchEditorCommands,
  createWorkbenchEditorTabListMenuEntries,
  createWorkbenchEditorTabMenuEntries,
  createWorkbenchShellCommands,
  createWorkbenchShellMenuEntries,
  getWorkbenchShowActivityCommandId,
  type WorkbenchEditorCommandContext,
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

function createEditorContext(
  overrides: Partial<WorkbenchEditorCommandContext> = {},
): WorkbenchEditorCommandContext {
  return {
    canCloseAll: true,
    canCloseOthers: true,
    canClosePath: true,
    canCopyPath: true,
    canDeletePath: true,
    canDiscardFile: true,
    canSaveFile: true,
    closeAll: () => undefined,
    closeOthers: () => undefined,
    closePath: () => undefined,
    copyPath: () => undefined,
    deletePath: () => undefined,
    discardFile: () => undefined,
    filePath: 'src/App.tsx',
    hasMultipleOpenFiles: true,
    hasOpenFiles: true,
    hasUnsavedChanges: true,
    saveFile: () => undefined,
    ...overrides,
  };
}

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

describe('workbench editor command presets', () => {
  it('creates tab menu entries with editor labels and enabled state', () => {
    const registry = createCommandRegistry(createWorkbenchEditorCommands());
    const items = resolveCommandMenuItems({
      context: createEditorContext({ hasMultipleOpenFiles: false }),
      entries: createWorkbenchEditorTabMenuEntries(),
      registry,
    });

    expect(items.map((item) => item.type === 'command' && item.label)).toEqual([
      'Copy path',
      false,
      'Close',
      'Close others',
      'Close all',
      false,
      'Delete',
    ]);
    expect(items.map((item) => item.type === 'command' && item.disabled)).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
    expect(items.find((item) => item.type === 'command' && item.label === 'Delete')).toMatchObject({
      danger: true,
      icon: 'codicon-trash',
    });
  });

  it('creates tab-list entries for close all only', () => {
    const registry = createCommandRegistry(createWorkbenchEditorCommands());
    const items = resolveCommandMenuItems({
      context: createEditorContext({ filePath: undefined, hasOpenFiles: true }),
      entries: createWorkbenchEditorTabListMenuEntries(),
      registry,
    });

    expect(items).toEqual([
      {
        commandId: 'editor.closeAll',
        danger: undefined,
        disabled: false,
        icon: 'codicon-close-all',
        id: 'editor.closeAll',
        label: 'Close all',
        shortcut: undefined,
        type: 'command',
      },
    ]);
  });

  it('executes editor command handlers through the provided context', () => {
    const calls: string[] = [];
    const registry = createCommandRegistry(createWorkbenchEditorCommands());
    const context = createEditorContext({
      closeAll: () => calls.push('closeAll'),
      closeOthers: () => calls.push('closeOthers'),
      closePath: () => calls.push('close'),
      copyPath: () => calls.push('copy'),
      deletePath: () => calls.push('delete'),
      discardFile: () => calls.push('discard'),
      saveFile: () => calls.push('save'),
    });

    [
      'editor.save',
      'editor.discardChanges',
      'editor.copyPath',
      'editor.close',
      'editor.closeOthers',
      'editor.closeAll',
      'editor.delete',
    ].forEach((commandId) => executeCommand(registry, commandId, context));

    expect(calls).toEqual([
      'save',
      'discard',
      'copy',
      'close',
      'closeOthers',
      'closeAll',
      'delete',
    ]);
  });
});
