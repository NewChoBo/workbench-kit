import type { CommandMenuItem } from '@newchobo-ui/core';

import type { ContextMenuItem } from '../overlay/ContextMenu';

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
