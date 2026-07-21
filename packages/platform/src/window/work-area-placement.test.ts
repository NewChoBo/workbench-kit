import { describe, expect, it } from 'vitest';

import type { RectLike, WorkAreaPlacement } from './types.js';
import {
  assertPositiveWorkArea,
  normalizeBoundsToPlacement,
  resolvePlacementToBounds,
} from './work-area-placement.js';

const workArea: RectLike = { x: 100, y: 50, width: 800, height: 600 };

describe('work-area placement', () => {
  it('resolves pixel placement relative to the work-area origin', () => {
    const placement: WorkAreaPlacement = {
      x: 40,
      y: 30,
      width: 320,
      height: 240,
      unit: 'pixels',
    };

    expect(resolvePlacementToBounds(placement, workArea)).toEqual({
      x: 140,
      y: 80,
      width: 320,
      height: 240,
    });
  });

  it('resolves percentage placement against work-area size', () => {
    const placement: WorkAreaPlacement = {
      x: 10,
      y: 20,
      width: 50,
      height: 25,
      unit: 'percentage',
    };

    expect(resolvePlacementToBounds(placement, workArea)).toEqual({
      x: 180,
      y: 170,
      width: 400,
      height: 150,
    });
  });

  it('round-trips pixel placement', () => {
    const placement: WorkAreaPlacement = {
      x: 40,
      y: 30,
      width: 320,
      height: 240,
      unit: 'pixels',
    };

    const bounds = resolvePlacementToBounds(placement, workArea);
    expect(normalizeBoundsToPlacement(bounds, workArea, 'pixels')).toEqual(placement);
  });

  it('round-trips percentage placement', () => {
    const placement: WorkAreaPlacement = {
      x: 12.5,
      y: 25,
      width: 37.5,
      height: 50,
      unit: 'percentage',
    };

    const bounds = resolvePlacementToBounds(placement, workArea);
    const normalized = normalizeBoundsToPlacement(bounds, workArea, 'percentage');

    expect(normalized.unit).toBe('percentage');
    expect(normalized.x).toBeCloseTo(placement.x);
    expect(normalized.y).toBeCloseTo(placement.y);
    expect(normalized.width).toBeCloseTo(placement.width);
    expect(normalized.height).toBeCloseTo(placement.height);
  });

  it('throws for zero or negative work-area dimensions', () => {
    const placement: WorkAreaPlacement = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      unit: 'pixels',
    };

    expect(() => resolvePlacementToBounds(placement, { ...workArea, width: 0 })).toThrow(
      /positive width and height/i,
    );
    expect(() =>
      normalizeBoundsToPlacement(
        { x: 0, y: 0, width: 10, height: 10 },
        { ...workArea, height: -1 },
        'pixels',
      ),
    ).toThrow(/positive width and height/i);
    expect(() => assertPositiveWorkArea({ x: 0, y: 0, width: 0, height: 0 })).toThrow(
      /positive width and height/i,
    );
  });
});
