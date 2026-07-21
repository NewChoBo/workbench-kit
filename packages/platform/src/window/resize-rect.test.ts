import { describe, expect, it } from 'vitest';

import { resizeRect } from './resize-rect.js';
import type { RectLike, ResizeEdge } from './types.js';

const start: RectLike = { x: 100, y: 200, width: 300, height: 150 };

describe('resizeRect', () => {
  it.each([
    ['right', 40, 0, { x: 100, y: 200, width: 340, height: 150 }],
    ['left', 40, 0, { x: 140, y: 200, width: 260, height: 150 }],
    ['bottom', 0, 20, { x: 100, y: 200, width: 300, height: 170 }],
    ['top', 0, 20, { x: 100, y: 220, width: 300, height: 130 }],
    ['top-left', 40, 20, { x: 140, y: 220, width: 260, height: 130 }],
    ['top-right', 40, 20, { x: 100, y: 220, width: 340, height: 130 }],
    ['bottom-left', 40, 20, { x: 140, y: 200, width: 260, height: 170 }],
    ['bottom-right', 40, 20, { x: 100, y: 200, width: 340, height: 170 }],
  ] as const satisfies ReadonlyArray<readonly [ResizeEdge, number, number, RectLike]>)(
    'resizes from the %s edge/corner',
    (edge, deltaX, deltaY, expected) => {
      expect(resizeRect(start, edge, deltaX, deltaY)).toEqual(expected);
    },
  );

  it('clamps width when shrinking from the right', () => {
    expect(resizeRect(start, 'right', -280, 0, { minWidth: 50, minHeight: 40 })).toEqual({
      x: 100,
      y: 200,
      width: 50,
      height: 150,
    });
  });

  it('clamps width and anchors the right edge when shrinking from the left', () => {
    expect(resizeRect(start, 'left', 280, 0, { minWidth: 50, minHeight: 40 })).toEqual({
      x: 350,
      y: 200,
      width: 50,
      height: 150,
    });
  });

  it('clamps height when shrinking from the bottom', () => {
    expect(resizeRect(start, 'bottom', 0, -140, { minWidth: 50, minHeight: 40 })).toEqual({
      x: 100,
      y: 200,
      width: 300,
      height: 40,
    });
  });

  it('clamps height and anchors the bottom edge when shrinking from the top', () => {
    expect(resizeRect(start, 'top', 0, 140, { minWidth: 50, minHeight: 40 })).toEqual({
      x: 100,
      y: 310,
      width: 300,
      height: 40,
    });
  });

  it('clamps both axes on a corner resize', () => {
    expect(resizeRect(start, 'top-left', 290, 140, { minWidth: 50, minHeight: 40 })).toEqual({
      x: 350,
      y: 310,
      width: 50,
      height: 40,
    });
  });

  it('defaults minimum size to zero when options are omitted', () => {
    expect(resizeRect(start, 'right', -500, 0)).toEqual({
      x: 100,
      y: 200,
      width: 0,
      height: 150,
    });
  });
});
