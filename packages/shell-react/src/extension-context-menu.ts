import type { ContextMenuItem } from '@workbench-kit/react/overlay';
import { commandMenuItemsToContextMenuItems } from '@workbench-kit/react/workbench/commands';
import {
  resolveWorkbenchMenuContributions,
  type ExtensionRegistry,
} from '@workbench-kit/workbench-core';

export interface ExtensionContextMenuInput {
  readonly contextKeys?: object | undefined;
  readonly executeCommand?: ((commandId: string) => unknown) | undefined;
  readonly extensionRegistry?: ExtensionRegistry | undefined;
  readonly menu: string;
}

export function createExtensionContextMenuItems({
  contextKeys,
  executeCommand,
  extensionRegistry,
  menu,
}: ExtensionContextMenuInput): ContextMenuItem[] {
  if (!extensionRegistry || !executeCommand) {
    return [];
  }

  const menuItems = resolveWorkbenchMenuContributions({
    commandRegistry: extensionRegistry.commands,
    context: undefined,
    contextKeys,
    menu,
    menuItems: extensionRegistry.menus.getMenuItems(menu),
  });

  return commandMenuItemsToContextMenuItems([...menuItems], (commandId) => {
    void executeCommand(commandId);
  });
}

export function appendExtensionContextMenuItems(
  baseItems: readonly ContextMenuItem[],
  extensionItems: readonly ContextMenuItem[],
  separatorId: string,
): ContextMenuItem[] {
  if (extensionItems.length === 0) {
    return [...baseItems];
  }

  if (baseItems.length === 0) {
    return [...extensionItems];
  }

  return [...baseItems, { id: separatorId, type: 'separator' }, ...extensionItems];
}
