import {
  createCommandRegistry,
  executeCommand,
  resolveCommandMenuItems,
} from '@workbench-kit/platform';

import type { ContextMenuItem } from '../../overlay/ContextMenu';
import {
  WORKBENCH_COMMAND_SURFACE_EDITOR,
  commandMenuItemsToContextMenuItems,
  createWorkbenchEditorCommands,
  createWorkbenchStandaloneEditorTabMenuEntries,
  type WorkbenchEditorCommandContext,
} from '../commands/commands';

const editorCommandRegistry = createCommandRegistry(createWorkbenchEditorCommands());
const standaloneEditorTabMenuEntries = createWorkbenchStandaloneEditorTabMenuEntries();

export interface WorkbenchStandaloneEditorTabLike {
  readonly closable?: boolean | undefined;
  readonly id: string;
}

export function isWorkbenchEditorTabClosable(tab: WorkbenchStandaloneEditorTabLike): boolean {
  return tab.closable !== false;
}

export interface CreateWorkbenchStandaloneEditorTabCommandContextInput {
  readonly onClose: (tabId: string) => void;
  readonly onCloseAll?: (() => void) | undefined;
  readonly onCloseOthers?: ((tabId: string) => void) | undefined;
  readonly onCloseToRight?: ((tabId: string) => void) | undefined;
  readonly tabId: string;
  readonly tabs: readonly WorkbenchStandaloneEditorTabLike[];
}

export interface CreateWorkbenchStandaloneEditorTabContextMenuItemsInput extends CreateWorkbenchStandaloneEditorTabCommandContextInput {
  readonly getExtraTabContextMenuItems?:
    ((tabId: string) => readonly ContextMenuItem[] | undefined) | undefined;
}

export function createWorkbenchStandaloneEditorTabCommandContext({
  onClose,
  onCloseAll,
  onCloseOthers,
  onCloseToRight,
  tabId,
  tabs,
}: CreateWorkbenchStandaloneEditorTabCommandContextInput): WorkbenchEditorCommandContext {
  const targetTab = tabs.find((tab) => tab.id === tabId);
  const targetIndex = tabs.findIndex((tab) => tab.id === tabId);
  const closableTabIds = tabs.filter(isWorkbenchEditorTabClosable).map((tab) => tab.id);
  const otherClosableTabIds = closableTabIds.filter((id) => id !== tabId);
  const rightClosableTabIds =
    targetIndex < 0
      ? []
      : tabs
          .slice(targetIndex + 1)
          .filter(isWorkbenchEditorTabClosable)
          .map((tab) => tab.id);
  const canCloseTarget = Boolean(targetTab && isWorkbenchEditorTabClosable(targetTab));

  return {
    canCloseAll: closableTabIds.length > 0,
    canCloseOthers: otherClosableTabIds.length > 0,
    canCloseToRight: rightClosableTabIds.length > 0,
    canClosePath: canCloseTarget,
    canCopyPath: false,
    canDeletePath: false,
    canDiscardFile: false,
    canSaveFile: false,
    canSplitDown: false,
    canSplitRight: false,
    canTogglePinned: false,
    closeAll: () => {
      if (onCloseAll) {
        onCloseAll();
        return;
      }
      for (const id of closableTabIds) {
        onClose(id);
      }
    },
    closeOthers: () => {
      if (onCloseOthers) {
        onCloseOthers(tabId);
        return;
      }
      for (const id of otherClosableTabIds) {
        onClose(id);
      }
    },
    closeToRight: () => {
      if (rightClosableTabIds.length === 0) {
        return;
      }
      if (onCloseToRight) {
        onCloseToRight(tabId);
        return;
      }
      for (const id of rightClosableTabIds) {
        onClose(id);
      }
    },
    closePath: () => {
      if (canCloseTarget) {
        onClose(tabId);
      }
    },
    copyPath: () => undefined,
    deletePath: () => undefined,
    discardFile: () => undefined,
    filePath: tabId,
    hasMultipleOpenFiles: tabs.length > 1,
    hasOpenFiles: tabs.length > 0,
    hasUnsavedChanges: false,
    isPinned: false,
    saveFile: () => undefined,
    splitDown: () => undefined,
    splitRight: () => undefined,
    togglePinned: () => undefined,
  };
}

export function createWorkbenchStandaloneEditorTabContextMenuItems(
  input: CreateWorkbenchStandaloneEditorTabContextMenuItemsInput,
): ContextMenuItem[] {
  const context = createWorkbenchStandaloneEditorTabCommandContext(input);

  const builtInItems = commandMenuItemsToContextMenuItems(
    resolveCommandMenuItems({
      context,
      entries: standaloneEditorTabMenuEntries,
      registry: editorCommandRegistry,
      surface: WORKBENCH_COMMAND_SURFACE_EDITOR,
    }),
    (commandId) => executeCommand(editorCommandRegistry, commandId, context),
  );
  const extraItems = input.getExtraTabContextMenuItems?.(input.tabId) ?? [];

  if (extraItems.length === 0) {
    return builtInItems;
  }

  return [
    ...builtInItems,
    { id: 'standalone-tab-extra-separator', type: 'separator' },
    ...extraItems,
  ];
}
