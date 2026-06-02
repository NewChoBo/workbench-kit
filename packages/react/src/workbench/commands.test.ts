import { createCommandRegistry, executeCommand, resolveCommandMenuItems } from '@newchobo-ui/core';
import { describe, expect, it } from 'vitest';
import {
  WORKBENCH_OPEN_SETTINGS_COMMAND_ID,
  WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID,
  WORKBENCH_COMMAND_SURFACE_ACTIVITY_BAR,
  WORKBENCH_COMMAND_SURFACE_EDITOR,
  WORKBENCH_COMMAND_SURFACE_SEARCH,
  WORKBENCH_COMMAND_SURFACE_SETTINGS,
  WORKBENCH_COMMAND_SURFACE_WORKSPACE,
  createWorkbenchEditorCommands,
  createWorkbenchEditorTabListMenuEntries,
  createWorkbenchEditorTabMenuEntries,
  createWorkbenchSearchResultCommands,
  createWorkbenchSearchResultMenuEntries,
  createWorkbenchShellCommands,
  createWorkbenchShellMenuEntries,
  createWorkbenchWorkspaceCommands,
  createWorkbenchWorkspaceCreateMenuEntries,
  createWorkbenchWorkspaceFolderMenuEntries,
  createWorkbenchWorkspaceTargetMenuEntries,
  getWorkbenchShowActivityCommandId,
  type WorkbenchEditorCommandContext,
  type WorkbenchSearchResultCommandContext,
  type WorkbenchShellCommandActivity,
  type WorkbenchShellCommandContext,
  type WorkbenchWorkspaceCommandContext,
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

function createWorkspaceContext(
  overrides: Partial<WorkbenchWorkspaceCommandContext> = {},
): WorkbenchWorkspaceCommandContext {
  return {
    copyWorkspaceTarget: () => undefined,
    createWorkspaceFile: () => undefined,
    createWorkspaceFolder: () => undefined,
    deleteWorkspaceTarget: () => undefined,
    fileActionPaths: ['src/App.tsx'],
    multiFileAction: false,
    openWorkspaceTarget: () => undefined,
    renameWorkspaceTarget: () => undefined,
    targetPaths: ['src/App.tsx'],
    workspaceTargetKind: 'file',
    ...overrides,
  };
}

function createSearchResultContext(
  overrides: Partial<WorkbenchSearchResultCommandContext> = {},
): WorkbenchSearchResultCommandContext {
  return {
    copyPath: () => undefined,
    deleteResult: () => undefined,
    openResult: () => undefined,
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

    const menuEntries = createWorkbenchShellMenuEntries({ activities });
    const menuSurfaces = menuEntries
      .filter((entry) => entry.type !== 'separator')
      .map((entry) => entry.surfaces?.[0]);

    expect(menuSurfaces).toEqual([
      WORKBENCH_COMMAND_SURFACE_ACTIVITY_BAR,
      WORKBENCH_COMMAND_SURFACE_ACTIVITY_BAR,
      WORKBENCH_COMMAND_SURFACE_ACTIVITY_BAR,
      WORKBENCH_COMMAND_SURFACE_SETTINGS,
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

  it('applies shell command label and icon overrides', () => {
    const registry = createCommandRegistry(
      createWorkbenchShellCommands({
        activities,
        commandOverrides: {
          [WORKBENCH_OPEN_SETTINGS_COMMAND_ID]: {
            label: 'Preferences',
            icon: 'codicon-settings',
          },
          [WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID]: {
            label: ({ isPrimarySidebarVisible }) =>
              isPrimarySidebarVisible ? 'Hide panel' : 'Show panel',
            icon: 'codicon-panel-left',
          },
          [getWorkbenchShowActivityCommandId('explorer')]: { icon: 'codicon-folder' },
        },
      }),
    );
    const items = resolveCommandMenuItems({
      context: createContext(),
      entries: createWorkbenchShellMenuEntries({ activities }),
      registry,
    });

    expect(
      items.find(
        (item) => item.type === 'command' && item.commandId === WORKBENCH_OPEN_SETTINGS_COMMAND_ID,
      ),
    ).toMatchObject({
      label: 'Preferences',
      icon: 'codicon-settings',
    });

    expect(
      items.find(
        (item) =>
          item.type === 'command' && item.commandId === WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID,
      ),
    ).toMatchObject({
      label: 'Hide panel',
      icon: 'codicon-panel-left',
    });

    expect(
      items.find(
        (item) =>
          item.type === 'command' &&
          item.commandId === getWorkbenchShowActivityCommandId('explorer'),
      ),
    ).toMatchObject({
      icon: 'codicon-folder',
    });
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

    const tabEntries = createWorkbenchEditorTabMenuEntries();
    const editorSurfaces = tabEntries
      .filter((entry) => entry.type !== 'separator')
      .map((entry) => entry.surfaces?.[0]);
    expect(editorSurfaces).toEqual([
      WORKBENCH_COMMAND_SURFACE_EDITOR,
      WORKBENCH_COMMAND_SURFACE_EDITOR,
      WORKBENCH_COMMAND_SURFACE_EDITOR,
      WORKBENCH_COMMAND_SURFACE_EDITOR,
      WORKBENCH_COMMAND_SURFACE_EDITOR,
    ]);
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

describe('workbench workspace command presets', () => {
  it('creates create, target, and folder menu entries', () => {
    const registry = createCommandRegistry(createWorkbenchWorkspaceCommands());
    const fileItems = resolveCommandMenuItems({
      context: createWorkspaceContext({
        fileActionPaths: ['README.md', 'src/App.tsx'],
        multiFileAction: true,
        targetPaths: ['README.md', 'src/App.tsx'],
      }),
      entries: createWorkbenchWorkspaceTargetMenuEntries(),
      registry,
    });
    const folderItems = resolveCommandMenuItems({
      context: createWorkspaceContext({
        fileActionPaths: [],
        targetPaths: ['docs'],
        workspaceTargetKind: 'folder',
      }),
      entries: createWorkbenchWorkspaceFolderMenuEntries(),
      registry,
    });
    const createItems = resolveCommandMenuItems({
      context: createWorkspaceContext(),
      entries: createWorkbenchWorkspaceCreateMenuEntries(),
      registry,
    });

    expect(fileItems.map((item) => item.type === 'command' && item.label)).toEqual([
      'Open selected files',
      'Copy paths',
      false,
      'Rename',
      'Delete 2 files',
    ]);
    expect(
      fileItems.find((item) => item.type === 'command' && item.label === 'Rename'),
    ).toMatchObject({
      disabled: true,
      icon: 'codicon-edit',
      shortcut: 'F2',
    });
    expect(
      fileItems.find((item) => item.type === 'command' && item.label === 'Delete 2 files'),
    ).toMatchObject({
      danger: true,
      icon: 'codicon-trash',
      shortcut: 'Del',
    });
    expect(folderItems.map((item) => item.type === 'command' && item.label)).toEqual([
      'New file',
      'New folder',
      false,
      'Reveal folder',
      'Copy path',
      false,
      'Rename',
      'Delete folder',
    ]);
    expect(createItems.map((item) => item.type === 'command' && item.label)).toEqual([
      'New file',
      'New folder',
    ]);

    const workspaceEntries =
      createWorkbenchWorkspaceFolderMenuEntries<WorkbenchWorkspaceCommandContext>();
    const workspaceSurfaces = workspaceEntries
      .filter((entry) => entry.type !== 'separator')
      .map((entry) => entry.surfaces?.[0]);
    expect(new Set(workspaceSurfaces)).toEqual(new Set([WORKBENCH_COMMAND_SURFACE_WORKSPACE]));
  });

  it('executes workspace command handlers through the provided context', () => {
    const calls: string[] = [];
    const registry = createCommandRegistry(createWorkbenchWorkspaceCommands());
    const context = createWorkspaceContext({
      copyWorkspaceTarget: () => calls.push('copy'),
      createWorkspaceFile: () => calls.push('newFile'),
      createWorkspaceFolder: () => calls.push('newFolder'),
      deleteWorkspaceTarget: () => calls.push('delete'),
      openWorkspaceTarget: () => calls.push('open'),
      renameWorkspaceTarget: () => calls.push('rename'),
    });

    [
      'workspace.newFile',
      'workspace.newFolder',
      'workspace.open',
      'workspace.copyPath',
      'workspace.rename',
      'workspace.delete',
    ].forEach((commandId) => executeCommand(registry, commandId, context));

    expect(calls).toEqual(['newFile', 'newFolder', 'open', 'copy', 'rename', 'delete']);
  });
});

describe('workbench search result command presets', () => {
  it('creates search result menu entries', () => {
    const registry = createCommandRegistry(createWorkbenchSearchResultCommands());
    const items = resolveCommandMenuItems({
      context: createSearchResultContext(),
      entries: createWorkbenchSearchResultMenuEntries(),
      registry,
    });

    expect(items).toEqual([
      {
        commandId: 'search.openResult',
        danger: undefined,
        disabled: false,
        icon: 'codicon-folder-opened',
        id: 'search.openResult',
        label: 'Open',
        shortcut: 'Enter',
        type: 'command',
      },
      {
        commandId: 'search.copyResultPath',
        danger: undefined,
        disabled: false,
        icon: 'codicon-copy',
        id: 'search.copyResultPath',
        label: 'Copy path',
        shortcut: undefined,
        type: 'command',
      },
      { id: 'result-menu-separator', type: 'separator' },
      {
        commandId: 'search.deleteResult',
        danger: true,
        disabled: false,
        icon: 'codicon-trash',
        id: 'search.deleteResult',
        label: 'Delete',
        shortcut: undefined,
        type: 'command',
      },
    ]);

    const searchEntries = createWorkbenchSearchResultMenuEntries();
    const searchSurfaces = searchEntries
      .filter((entry) => entry.type !== 'separator')
      .map((entry) => entry.surfaces?.[0]);
    expect(searchSurfaces).toEqual([
      WORKBENCH_COMMAND_SURFACE_SEARCH,
      WORKBENCH_COMMAND_SURFACE_SEARCH,
      WORKBENCH_COMMAND_SURFACE_SEARCH,
    ]);
  });

  it('executes search result command handlers through the provided context', () => {
    const calls: string[] = [];
    const registry = createCommandRegistry(createWorkbenchSearchResultCommands());
    const context = createSearchResultContext({
      copyPath: () => calls.push('copy'),
      deleteResult: () => calls.push('delete'),
      openResult: () => calls.push('open'),
    });

    ['search.openResult', 'search.copyResultPath', 'search.deleteResult'].forEach((commandId) =>
      executeCommand(registry, commandId, context),
    );

    expect(calls).toEqual(['open', 'copy', 'delete']);
  });
});
