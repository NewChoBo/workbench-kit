import { describe, expect, it } from 'vitest';

import { computeGridChildRect } from './layout/grid.js';
import { computeLinearChildRects } from './layout/linear.js';
import { computeStackChildRect } from './layout/stack.js';
import { formatJsonWidgetData, parseJsonWidgetData } from './jdw-node.js';
import { createWidgetRegistry } from './widget-registry.js';

describe('workbench-kit json-widget tile_paper parity patterns', () => {
  it('matches canonical JDW parse and format behavior for representative widgets', () => {
    const samples = ['{"type":"text","args":{"text":"Hello"}}', '   ', 'null', '[]', '{'] as const;

    for (const sample of samples) {
      const first = parseJsonWidgetData(sample);
      const second = parseJsonWidgetData(sample);
      expect(first).toEqual(second);
    }

    expect(formatJsonWidgetData({ type: 'text', args: { text: 'Hello' }, id: 'title' })).toContain(
      '"Hello"',
    );
  });

  it('creates independent registry instances with stable semantics', () => {
    const first = createWidgetRegistry<string>([{ type: 'box', build: 'box-build' }]);
    const second = createWidgetRegistry<string>();
    second.bind({ type: 'text', build: 'text-build' });

    expect(first.get('box')).toBe('box-build');
    expect(first.get('text')).toBeUndefined();
    expect(second.get('text')).toBe('text-build');
    expect(first.definitions()).toHaveLength(1);
    expect(second.definitions()).toHaveLength(1);
  });

  it('computes neutral layout rects used by preview consumers', () => {
    expect(
      computeGridChildRect(
        { columns: 4, rows: 2, gap: 10, padding: 5 },
        { col: 1, row: 1 },
        { x: 0, y: 0, width: 450, height: 230 },
      ).width,
    ).toBeGreaterThan(0);

    expect(computeStackChildRect({ left: 20, top: 10 }, 200, 100).width).toBe(180);

    expect(
      computeLinearChildRects({ type: 'row', gap: 10, padding: 5 }, [{ flex: 1 }, { flex: 2 }], {
        x: 0,
        y: 0,
        width: 330,
        height: 110,
      }),
    ).toHaveLength(2);
  });
});
