import { describe, expect, it } from 'vitest';

import type { GenericWidget } from '../widget-tree.js';
import { layoutWidget } from './layout-widget.js';

describe('layoutWidget', () => {
  it('lays out row children with flex weights', () => {
    const widget: GenericWidget = {
      type: 'row',
      gap: 8,
      padding: 0,
      children: [
        { type: 'text', text: 'A', flex: 1 },
        { type: 'text', text: 'B', flex: 2 },
      ],
    };

    const result = layoutWidget(widget, {
      minWidth: 0,
      maxWidth: 300,
      minHeight: 0,
      maxHeight: 100,
    });

    expect(result.children).toHaveLength(2);
    expect(result.children[0]?.rect.width).toBeCloseTo(292 / 3, 0);
    expect(result.children[1]?.rect.width).toBeCloseTo((292 / 3) * 2, 0);
  });

  it('lays out grid children using col and row placement', () => {
    const widget: GenericWidget = {
      type: 'grid',
      columns: 2,
      gap: 0,
      padding: 0,
      children: [
        { type: 'text', text: 'A', col: 0, row: 0 },
        { type: 'text', text: 'B', col: 1, row: 0 },
        { type: 'text', text: 'Wide', col: 0, row: 1, colSpan: 2 },
      ],
    };

    const result = layoutWidget(widget, {
      minWidth: 0,
      maxWidth: 200,
      minHeight: 0,
      maxHeight: 200,
    });

    expect(result.children[2]?.rect.width).toBeCloseTo(200, 0);
    expect(result.children[0]?.rect.x).toBe(0);
    expect(result.children[1]?.rect.x).toBeCloseTo(100, 0);
  });

  it('preserves nested column layout for template-like trees', () => {
    const widget: GenericWidget = {
      type: 'column',
      gap: 4,
      children: [
        { type: 'text', text: 'Title', fontSize: 18 },
        {
          type: 'row',
          gap: 8,
          children: [
            { type: 'text', text: 'Left', flex: 1 },
            { type: 'text', text: 'Right', flex: 1 },
          ],
        },
      ],
    };

    const result = layoutWidget(widget);
    expect(result.children).toHaveLength(2);
    expect(result.children[1]?.children).toHaveLength(2);
  });
});
