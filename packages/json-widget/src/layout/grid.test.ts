import { describe, expect, it } from 'vitest';

import { computeGridChildRect } from './grid.js';

describe('computeGridChildRect', () => {
  it('places a single-cell child with padding and gap', () => {
    const layout = {
      columns: 4,
      rows: 2,
      gap: 10,
      padding: 5,
    };

    expect(
      computeGridChildRect(layout, { col: 1, row: 1 }, { x: 0, y: 0, width: 450, height: 230 }),
    ).toEqual({
      x: 117.5,
      y: 120,
      width: 102.5,
      height: 105,
    });
  });

  it('expands width and height for spanning children', () => {
    const layout = {
      columns: 4,
      rows: 2,
      gap: 10,
      padding: 5,
    };

    expect(
      computeGridChildRect(
        layout,
        { col: 1, row: 0, colSpan: 2, rowSpan: 2 },
        { x: 0, y: 0, width: 450, height: 230 },
      ),
    ).toEqual({
      x: 117.5,
      y: 5,
      width: 215,
      height: 220,
    });
  });
});
