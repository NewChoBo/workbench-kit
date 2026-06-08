import { describe, expect, it } from 'vitest';

import { computeLinearChildRects } from './linear.js';

describe('computeLinearChildRects', () => {
  it('distributes row children by flex after padding and gap', () => {
    expect(
      computeLinearChildRects({ type: 'row', gap: 10, padding: 5 }, [{ flex: 1 }, { flex: 2 }], {
        x: 0,
        y: 0,
        width: 330,
        height: 110,
      }),
    ).toEqual([
      { x: 5, y: 5, width: 103.33333333333333, height: 100 },
      { x: 118.33333333333333, y: 5, width: 206.66666666666666, height: 100 },
    ]);
  });

  it('distributes column children along the y axis', () => {
    expect(
      computeLinearChildRects({ type: 'column', gap: 10, padding: 5 }, [{}, {}], {
        x: 0,
        y: 0,
        width: 120,
        height: 230,
      }),
    ).toEqual([
      { x: 5, y: 5, width: 110, height: 105 },
      { x: 5, y: 120, width: 110, height: 105 },
    ]);
  });
});
