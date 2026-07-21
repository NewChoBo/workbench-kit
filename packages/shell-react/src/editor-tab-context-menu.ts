import {
  createCommandRegistry,
  executeCommand as executeRegisteredCommand,
  resolveCommandMenuItems,
} from '@workbench-kit/platform';
import type { ContextMenuItem } from '@workbench-kit/react/overlay';
import {
  WORKBENCH_COMMAND_SURFACE_EDITOR,
  WORKBENCH_EDITOR_DELETE_COMMAND_ID,
  commandMenuItemsToContextMenuItems,
  createWorkbenchEditorCommands,
  createWorkbenchEditorTabMenuEntries,
  type WorkbenchEditorCommandContext,
} from '@workbench-kit/react/workbench/commands';
import type {
  EditorService,
  EditorTabState,
  ExtensionRegistry,
} from '@workbench-kit/workbench-core';

import { copyResourcePath, pathForResource } from './editor-resource.js';
import {
  appendExtensionContextMenuItems,
  createExtensionContextMenuItems,
} from './extension-context-menu.js';

const editorCommandRegistry = createCommandRegistry(createWorkbenchEditorCommands());
const editorTabMenuEntries = createWorkbenchEditorTabMenuEntries().filter((entry) =>
  entry.type === 'separator'
    ? entry.id !== 'tab-danger-separator'
    : entry.commandId !== WORKBENCH_EDITOR_DELETE_COMMAND_ID,
);
const EDITOR_TAB_CONTEXT_MENU = 'editor/tab/context';
const EDITOR_TAB_EXTENSION_MENU_SEPARATOR_ID = 'editor-tab-extension-separator';

export function createEditorTabContextMenuItems({
  editorService,
  executeExtensionCommand,
  extensionRegistry,
  groupId,
  tab,
  tabs,
}: {
  editorService: EditorService;
  executeExtensionCommand?: ((commandId: string) => unknown) | undefined;
  extensionRegistry?: ExtensionRegistry | undefined;
  groupId: string;
  tab: EditorTabState;
  tabs: readonly EditorTabState[];
}): ContextMenuItem[] {
  const closeableTabs = tabs.filter((candidate) => candidate.id !== tab.id);
  const context: WorkbenchEditorCommandContext = {
    canCloseAll: tabs.length > 0,
    canCloseOthers: closeableTabs.length > 0,
    canClosePath: true,
    canCopyPath: true,
    canDeletePath: false,
    canDiscardFile: false,
    canSaveFile: false,
    canSplitDown: true,
    canSplitRight: true,
    canTogglePinned: true,
    closeAll: () => tabs.forEach((candidate) => editorService.closeEditor(candidate.id)),
    closeOthers: () =>
      closeableTabs.forEach((candidate) => editorService.closeEditor(candidate.id)),
    closePath: () => editorService.closeEditor(tab.id),
    copyPath: () => copyResourcePath(tab.resourceUri),
    deletePath: () => undefined,
    discardFile: () => undefined,
    filePath: pathForResource(tab.resourceUri),
    hasMultipleOpenFiles: tabs.length > 1,
    hasOpenFiles: tabs.length > 0,
    hasUnsavedChanges: tab.dirty,
    isPinned: tab.pinned,
    saveFile: () => undefined,
    splitDown: () =>
      editorService.splitEditor({
        afterGroupId: groupId,
        direction: 'vertical',
        tabId: tab.id,
      }),
    splitRight: () =>
      editorService.splitEditor({
        afterGroupId: groupId,
        direction: 'horizontal',
        tabId: tab.id,
      }),
    togglePinned: () => editorService.togglePinnedEditor(tab.id),
  };

  const contextKeys = {
    'editor.hasResource': Boolean(tab.resourceUri),
    'editor.isDirty': tab.dirty,
    'editor.isPinned': tab.pinned,
  };

  const baseItems = commandMenuItemsToContextMenuItems(
    resolveCommandMenuItems({
      context,
      contextKeys,
      entries: editorTabMenuEntries,
      registry: editorCommandRegistry,
      surface: WORKBENCH_COMMAND_SURFACE_EDITOR,
    }),
    (commandId) => executeRegisteredCommand(editorCommandRegistry, commandId, context, contextKeys),
  );

  return appendExtensionContextMenuItems(
    baseItems,
    createExtensionContextMenuItems({
      contextKeys,
      executeCommand: executeExtensionCommand,
      extensionRegistry,
      menu: EDITOR_TAB_CONTEXT_MENU,
    }),
    EDITOR_TAB_EXTENSION_MENU_SEPARATOR_ID,
  );
}
