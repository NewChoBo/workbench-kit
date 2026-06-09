import { describe, expect, it } from 'vitest';

import { formatWidgetPlacementMeta } from './widget-tree-layout.js';

describe('widget-tree-layout', () => {
  it('formats grid and flex placement metadata', () => {
    expect(formatWidgetPlacementMeta({ type: 'text', col: 1, row: 2 }, 'grid')).toBe('c1 r2');
    expect(formatWidgetPlacementMeta({ type: 'text', flex: 2, align: 'center' }, 'row')).toBe(
      'flex 2 · center',
    );
  });
});
