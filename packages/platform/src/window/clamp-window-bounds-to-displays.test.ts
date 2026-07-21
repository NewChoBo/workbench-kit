import { describe, expect, it } from 'vitest';

import {
  WINDOW_BOUNDS_MIN_HEIGHT,
  WINDOW_BOUNDS_MIN_WIDTH,
  clampWindowBoundsToDisplays,
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
});
