import type { ContextMenuItem } from '@workbench-kit/react/overlay';
import { commandMenuItemsToContextMenuItems } from '@workbench-kit/react/workbench/commands';
import type { CommandRegistry } from '@workbench-kit/platform';
import {
  resolveWorkbenchMenuContributions,
  type MenuRegistry,
} from '@workbench-kit/workbench-core';

export interface ExtensionContextMenuInput {
  readonly commands?: CommandRegistry | undefined;
  readonly contextKeys?: object | undefined;
  readonly executeCommand?: ((commandId: string) => unknown) | undefined;
  readonly menu: string;
  readonly menus?: MenuRegistry | undefined;
}

export function createExtensionContextMenuItems({
  commands,
  contextKeys,
  executeCommand,
  menu,
  menus,
}: ExtensionContextMenuInput): ContextMenuItem[] {
  if (!commands || !menus || !executeCommand) {
    return [];
  }

  const menuItems = resolveWorkbenchMenuContributions({
    commandRegistry: commands,
    context: undefined,
    contextKeys,
    menu,
    menuItems: menus.getMenuItems(menu),
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
