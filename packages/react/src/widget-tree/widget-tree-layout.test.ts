import { describe, expect, it } from 'vitest';

import {
  canAddChildren,
  formatWidgetPlacementMeta,
  insertedWidgetPathForParent,
} from './widget-tree-layout.js';

describe('widget-tree-layout', () => {
  it('formats grid and flex placement metadata', () => {
    expect(formatWidgetPlacementMeta({ type: 'text', col: 1, row: 2 }, 'grid')).toBe('c1 r2');
    expect(
      formatWidgetPlacementMeta(
        { type: 'text', flex: 2, flexFit: 'loose', align: 'center' },
        'row',
      ),
    ).toBe('flex 2 · loose · center');
    expect(formatWidgetPlacementMeta({ type: 'text', left: 4, top: 8 }, 'stack')).toBe('l4 · t8');
  });

  it('allows single-child wrappers to accept one child slot', () => {
    expect(canAddChildren({ type: 'padding', padding: 8 })).toBe(true);
    expect(canAddChildren({ type: 'padding', child: { type: 'text', text: 'Wrapped' } })).toBe(
      false,
    );
  });

  it('resolves inserted child paths for array and wrapper containers', () => {
    expect(insertedWidgetPathForParent({ type: 'row' }, [], 2)).toEqual([
      { kind: 'children', index: 2 },
    ]);
    expect(insertedWidgetPathForParent({ type: 'padding' }, [], 0)).toEqual([{ kind: 'child' }]);
  });
});
