import { describe, expect, it } from 'vitest';

import {
  WINDOW_BOUNDS_MIN_HEIGHT,
  WINDOW_BOUNDS_MIN_WIDTH,
  clampWindowBoundsToDisplays,
  selectWindowDisplayForBounds,
} from './clamp-window-bounds-to-displays.js';
import type { DisplayWorkArea } from './types.js';

const primary: DisplayWorkArea = {
  isPrimary: true,
  workArea: { x: 0, y: 0, width: 1920, height: 1080 },
};

const secondary: DisplayWorkArea = {
  workArea: { x: 1920, y: 0, width: 1600, height: 900 },
};

describe('clampWindowBoundsToDisplays', () => {
  it('enforces a reasonable minimum size', () => {
    expect(
      clampWindowBoundsToDisplays({ x: 100, y: 80, width: 40, height: 20 }, [primary]),
    ).toEqual({
      x: 100,
      y: 80,
      width: WINDOW_BOUNDS_MIN_WIDTH,
      height: WINDOW_BOUNDS_MIN_HEIGHT,
    });
  });

  it('fits oversized bounds into the target work area', () => {
    expect(
      clampWindowBoundsToDisplays({ x: 10, y: 10, width: 5000, height: 4000 }, [primary]),
    ).toEqual({
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
    });
  });

  it('recovers off-screen bounds onto the primary work area', () => {
    expect(
      clampWindowBoundsToDisplays({ x: -8000, y: -6000, width: 1200, height: 800 }, [
        primary,
        secondary,
      ]),
    ).toEqual({
      x: 0,
      y: 0,
      width: 1200,
      height: 800,
    });
  });

  it('keeps bounds on a secondary display when they already intersect it', () => {
    expect(
      clampWindowBoundsToDisplays({ x: 2100, y: 40, width: 800, height: 600 }, [
        primary,
        secondary,
      ]),
    ).toEqual({
      x: 2100,
      y: 40,
      width: 800,
      height: 600,
    });
  });

  it('supports host-owned minimum size', () => {
    expect(
      clampWindowBoundsToDisplays(
        { x: 4000, y: 100, width: 40, height: 20 },
        [primary, secondary],
        {
          minHeight: 0,
          minWidth: 0,
        },
      ),
    ).toEqual({ x: 3480, y: 100, width: 40, height: 20 });
  });

  it('selects the largest intersection with center-distance tie breaking', () => {
    const overlappingPrimary = {
      id: 'primary',
      isPrimary: true,
      workArea: { x: 0, y: 0, width: 2000, height: 1000 },
    };
    const overlappingSecondary = {
      id: 'secondary',
      workArea: { x: 1000, y: 0, width: 2000, height: 1000 },
    };

    expect(
      selectWindowDisplayForBounds({ x: 1200, y: 100, width: 1300, height: 600 }, [
        overlappingPrimary,
        overlappingSecondary,
      ])?.id,
    ).toBe('secondary');
  });

  it('selects the nearest target before fitting oversized off-screen bounds', () => {
    const displays: DisplayWorkArea[] = [
      { isPrimary: true, workArea: { x: 1163, y: -39, width: 485, height: 1137 } },
      { workArea: { x: 1669, y: 1733, width: 1609, height: 1025 } },
    ];

    expect(
      clampWindowBoundsToDisplays({ x: 4196, y: -1365, width: 1951, height: 1689 }, displays, {
        minHeight: 0,
        minWidth: 0,
      }),
    ).toEqual({ x: 1669, y: 1733, width: 1609, height: 1025 });
  });

  it('rejects invalid host minimum sizes before clamping', () => {
    expect(() =>
      clampWindowBoundsToDisplays({ x: 0, y: 0, width: 100, height: 100 }, [primary], {
        minWidth: -1,
      }),
    ).toThrow(/minWidth must be a finite non-negative number/u);
  });
});
