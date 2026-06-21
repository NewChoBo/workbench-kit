import { ExtensionRegistry } from '@workbench-kit/workbench-core';
import { describe, expect, it } from 'vitest';

import {
  appendExtensionContextMenuItems,
  createExtensionContextMenuItems,
} from './extension-context-menu.js';

describe('extension context menu helpers', () => {
  it('creates context menu items from extension menu contributions', () => {
    const extensionRegistry = new ExtensionRegistry();
    const calls: string[] = [];

    extensionRegistry.commands.registerCommand({
      id: 'sample.action.inspect',
      title: 'Inspect',
    });
    extensionRegistry.menus.registerMenuItem({
      command: 'sample.action.inspect',
      menu: 'explorer/context',
    });

    const items = createExtensionContextMenuItems({
      executeCommand: (commandId) => calls.push(commandId),
      extensionRegistry,
      menu: 'explorer/context',
    });

    expect(items).toMatchObject([
      {
        id: 'explorer/context:sample.action.inspect:0',
        label: 'Inspect',
      },
    ]);

    if (items[0]?.type !== 'separator') {
      items[0]?.onSelect();
    }

    expect(calls).toEqual(['sample.action.inspect']);
  });

  it('separates extension context menu items from base items only when needed', () => {
    expect(
      appendExtensionContextMenuItems(
        [{ id: 'base', label: 'Base', onSelect: () => undefined }],
        [{ id: 'extension', label: 'Extension', onSelect: () => undefined }],
        'separator',
      ).map((item) => item.id),
    ).toEqual(['base', 'separator', 'extension']);

    expect(appendExtensionContextMenuItems([], [], 'separator')).toEqual([]);
  });
});
