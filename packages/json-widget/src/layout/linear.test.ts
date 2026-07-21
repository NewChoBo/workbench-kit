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

  it('keeps content-sized siblings intrinsic when another child has explicit flex', () => {
    expect(
      computeLinearChildRects(
        { type: 'column', gap: 8, padding: 0 },
        [{ mainSize: 40 }, { mainSize: 60 }, { flex: 1 }],
        {
          x: 0,
          y: 0,
          width: 200,
          height: 400,
        },
      ),
    ).toEqual([
      { x: 0, y: 0, width: 200, height: 40 },
      { x: 0, y: 48, width: 200, height: 60 },
      { x: 0, y: 116, width: 200, height: 284 },
    ]);
  });

  it('applies mainAxisAlignment when children have explicit main sizes', () => {
    expect(
      computeLinearChildRects(
        { type: 'row', mainAxisAlignment: 'center' },
        [{ mainSize: 20 }, { mainSize: 30 }],
        {
          x: 0,
          y: 0,
          width: 100,
          height: 40,
        },
      ),
    ).toEqual([
      { x: 25, y: 0, width: 20, height: 40 },
      { x: 45, y: 0, width: 30, height: 40 },
    ]);
  });

  it('applies crossAxisAlignment when children have explicit cross sizes', () => {
    expect(
      computeLinearChildRects(
        { type: 'row', crossAxisAlignment: 'center', padding: 5 },
        [{ mainSize: 20, crossSize: 40 }],
        {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        },
      ),
    ).toEqual([{ x: 5, y: 30, width: 20, height: 40 }]);
  });

  it('lets loose flex children use explicit main size within their flex allocation', () => {
    expect(
      computeLinearChildRects(
        { type: 'row', mainAxisAlignment: 'center' },
        [
          { flex: 1, flexFit: 'loose', mainSize: 20 },
          { flex: 1, flexFit: 'tight', mainSize: 20 },
        ],
        {
          x: 0,
          y: 0,
          width: 100,
          height: 40,
        },
      ),
    ).toEqual([
      { x: 15, y: 0, width: 20, height: 40 },
      { x: 35, y: 0, width: 50, height: 40 },
    ]);
  });
});
