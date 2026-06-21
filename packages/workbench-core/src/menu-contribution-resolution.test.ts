import { CommandRegistry } from '@workbench-kit/platform';
import { describe, expect, it } from 'vitest';

import { resolveWorkbenchMenuContributions } from './menu-contribution-resolution.js';
import { MenuRegistry } from './registries.js';

interface TestCommandContext {
  readonly canOpen: boolean;
}

describe('resolveWorkbenchMenuContributions', () => {
  it('resolves menu contributions with command metadata in registry order', () => {
    const commandRegistry = new CommandRegistry<TestCommandContext>([
      {
        icon: 'go-to-file',
        id: 'workbench.action.open',
        isEnabled: ({ canOpen }) => canOpen,
        label: 'Open',
      },
      {
        danger: true,
        id: 'workbench.action.delete',
        label: 'Delete',
      },
    ]);
    const menuRegistry = new MenuRegistry();

    menuRegistry.registerMenuItem({
      command: 'workbench.action.delete',
      group: 'navigation',
      menu: 'editor/context',
      order: 20,
    });
    menuRegistry.registerMenuItem({
      command: 'workbench.action.open',
      group: 'navigation',
      menu: 'editor/context',
      order: 10,
    });

    expect(
      resolveWorkbenchMenuContributions({
        commandRegistry,
        context: { canOpen: false },
        menu: 'editor/context',
        menuItems: menuRegistry.getMenuItems('editor/context'),
      }),
    ).toEqual([
      {
        commandId: 'workbench.action.open',
        contribution: {
          command: 'workbench.action.open',
          group: 'navigation',
          menu: 'editor/context',
          order: 10,
        },
        disabled: true,
        group: 'navigation',
        icon: 'go-to-file',
        id: 'editor/context:workbench.action.open:0',
        label: 'Open',
        menu: 'editor/context',
        order: 10,
        type: 'command',
      },
      {
        commandId: 'workbench.action.delete',
        contribution: {
          command: 'workbench.action.delete',
          group: 'navigation',
          menu: 'editor/context',
          order: 20,
        },
        danger: true,
        disabled: false,
        group: 'navigation',
        id: 'editor/context:workbench.action.delete:1',
        label: 'Delete',
        menu: 'editor/context',
        order: 20,
        type: 'command',
      },
    ]);
  });

  it('filters missing and when-blocked commands while keeping enablement-blocked commands disabled', () => {
    const commandRegistry = new CommandRegistry([
      {
        id: 'workbench.action.visible',
        label: 'Visible',
      },
      {
        id: 'workbench.action.needsFeature',
        label: 'Needs Feature',
        enablement: 'feature.enabled',
      },
      {
        id: 'workbench.action.hidden',
        label: 'Hidden',
      },
    ]);

    expect(
      resolveWorkbenchMenuContributions({
        commandRegistry,
        context: undefined,
        contextKeys: {
          'feature.enabled': false,
          'workbench.showHidden': false,
        },
        menu: 'view/title',
        menuItems: [
          {
            command: 'workbench.action.missing',
            menu: 'view/title',
          },
          {
            command: 'workbench.action.hidden',
            menu: 'view/title',
            when: 'workbench.showHidden',
          },
          {
            command: 'workbench.action.needsFeature',
            menu: 'view/title',
          },
          {
            command: 'workbench.action.visible',
            menu: 'view/title',
          },
        ],
      }).map((item) => ({
        commandId: item.commandId,
        disabled: item.disabled,
      })),
    ).toEqual([
      {
        commandId: 'workbench.action.needsFeature',
        disabled: true,
      },
      {
        commandId: 'workbench.action.visible',
        disabled: false,
      },
    ]);
  });
});
