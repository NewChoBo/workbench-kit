/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from 'vitest';

import { applyModalResize, clampModalBounds } from './modalSize';

describe('modalSize', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
  });

  it('clamps west resize against the viewport edge', () => {
    const next = applyModalResize({ x: 40, y: 80, width: 400, height: 300 }, 'w', -80, 0, {
      minWidth: 320,
      minHeight: 200,
    });

    expect(next).toEqual({ x: 0, y: 80, width: 440, height: 300 });
  });

  it('enforces minimum size while resizing', () => {
    const next = applyModalResize({ x: 100, y: 80, width: 360, height: 300 }, 'e', -120, 0, {
      minWidth: 320,
      minHeight: 200,
    });

    expect(next.width).toBe(320);
  });

  it('keeps resized windows inside the viewport horizontally', () => {
    const next = clampModalBounds(
      { x: 500, y: 80, width: 400, height: 300 },
      { minWidth: 320, minHeight: 200 },
    );

    expect(next).toEqual({ x: 500, y: 80, width: 300, height: 300 });
  });
});
