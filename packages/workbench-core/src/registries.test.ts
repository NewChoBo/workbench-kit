import { describe, expect, it } from 'vitest';

import { MenuRegistry } from './registries.js';

describe('MenuRegistry', () => {
  it('orders menu items by first-seen group and numeric order', () => {
    const registry = new MenuRegistry();

    registry.registerMenuItem({
      command: 'third',
      group: 'navigation',
      menu: 'editor/context',
      order: 30,
    });
    registry.registerMenuItem({
      command: 'secondary-last',
      group: 'secondary',
      menu: 'editor/context',
      order: 20,
    });
    registry.registerMenuItem({
      command: 'first',
      group: 'navigation',
      menu: 'editor/context',
      order: 10,
    });
    registry.registerMenuItem({
      command: 'second',
      group: 'navigation',
      menu: 'editor/context',
      order: 20,
    });
    registry.registerMenuItem({
      command: 'secondary-first',
      group: 'secondary',
      menu: 'editor/context',
      order: -10,
    });

    expect(registry.getMenuItems('editor/context').map((item) => item.command)).toEqual([
      'first',
      'second',
      'third',
      'secondary-first',
      'secondary-last',
    ]);
  });

  it('keeps registration order for menu items with the same group and order', () => {
    const registry = new MenuRegistry();

    registry.registerMenuItem({
      command: 'first',
      group: 'navigation',
      menu: 'view/title',
      order: 1,
    });
    registry.registerMenuItem({
      command: 'second',
      group: 'navigation',
      menu: 'view/title',
      order: 1,
    });

    expect(registry.getMenuItems('view/title').map((item) => item.command)).toEqual([
      'first',
      'second',
    ]);
  });

  it('removes disposed menu items from ordered results', () => {
    const registry = new MenuRegistry();

    registry.registerMenuItem({
      command: 'kept',
      group: 'navigation',
      menu: 'explorer/context',
      order: 2,
    });
    const disposable = registry.registerMenuItem({
      command: 'removed',
      group: 'navigation',
      menu: 'explorer/context',
      order: 1,
    });

    disposable.dispose();

    expect(registry.getMenuItems('explorer/context').map((item) => item.command)).toEqual(['kept']);
  });
});
