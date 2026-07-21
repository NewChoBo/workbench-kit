import type { RectLike, SizeUnit, WorkAreaPlacement } from './types.js';

/**
 * Rejects work areas that cannot be used for relative placement math.
 * Zero or negative width/height throw; callers must supply a positive area.
 */
export function assertPositiveWorkArea(workArea: RectLike): void {
  if (!(workArea.width > 0) || !(workArea.height > 0)) {
    throw new Error(
      `Work area must have positive width and height (got width=${workArea.width}, height=${workArea.height}).`,
    );
  }
}

/**
 * Resolves work-area–relative placement into absolute bounds.
 * Pixel unit: offsets are added to the work-area origin; sizes are absolute.
 * Percentage unit: values are percentages of work-area width/height (0–100).
 */
export function resolvePlacementToBounds(
  placement: WorkAreaPlacement,
  workArea: RectLike,
): RectLike {
  assertPositiveWorkArea(workArea);

  if (placement.unit === 'pixels') {
    return {
      x: workArea.x + placement.x,
      y: workArea.y + placement.y,
      width: placement.width,
      height: placement.height,
    };
  }

  return {
    x: workArea.x + (placement.x / 100) * workArea.width,
    y: workArea.y + (placement.y / 100) * workArea.height,
    width: (placement.width / 100) * workArea.width,
    height: (placement.height / 100) * workArea.height,
  };
}

/**
 * Normalizes absolute bounds into work-area–relative placement for the given unit.
 */
export function normalizeBoundsToPlacement(
  bounds: RectLike,
  workArea: RectLike,
  unit: SizeUnit,
): WorkAreaPlacement {
  assertPositiveWorkArea(workArea);

  if (unit === 'pixels') {
    return {
      x: bounds.x - workArea.x,
      y: bounds.y - workArea.y,
      width: bounds.width,
      height: bounds.height,
      unit: 'pixels',
    };
  }

  return {
    x: ((bounds.x - workArea.x) / workArea.width) * 100,
    y: ((bounds.y - workArea.y) / workArea.height) * 100,
    width: (bounds.width / workArea.width) * 100,
    height: (bounds.height / workArea.height) * 100,
    unit: 'percentage',
  };
}
