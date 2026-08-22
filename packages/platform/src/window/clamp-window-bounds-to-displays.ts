import type { DisplayWorkArea, RectLike } from './types.js';

/** Reasonable default minimum restored window size. */
export const WINDOW_BOUNDS_MIN_WIDTH = 200;
export const WINDOW_BOUNDS_MIN_HEIGHT = 100;

export interface ClampWindowBoundsToDisplaysOptions {
  readonly minWidth?: number;
  readonly minHeight?: number;
}

function centerOf(rect: RectLike): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function distanceSquared(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function rectIntersectionArea(left: RectLike, right: RectLike): number {
  const width = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x),
  );
  const height = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y),
  );
  return width * height;
}

/** Select greatest intersection, using center distance for ties and off-screen bounds. */
export function selectWindowDisplayForBounds<TDisplay extends DisplayWorkArea>(
  bounds: RectLike,
  displays: readonly TDisplay[],
): TDisplay | null {
  if (displays.length === 0) {
    return null;
  }

  const center = centerOf(bounds);
  let selected = displays[0]!;
  let selectedIntersection = rectIntersectionArea(bounds, selected.workArea);
  let selectedDistance = distanceSquared(center, centerOf(selected.workArea));
  for (const display of displays.slice(1)) {
    const intersection = rectIntersectionArea(bounds, display.workArea);
    const distance = distanceSquared(center, centerOf(display.workArea));
    if (
      intersection > selectedIntersection ||
      (intersection === selectedIntersection && distance < selectedDistance)
    ) {
      selected = display;
      selectedIntersection = intersection;
      selectedDistance = distance;
    }
  }
  return selected;
}

function resolveMinimum(value: number | undefined, fallback: number, name: string): number {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved < 0) {
    throw new Error(`${name} must be a finite non-negative number.`);
  }
  return resolved;
}

function clampToWorkArea(
  bounds: RectLike,
  workArea: RectLike,
  minWidth: number,
  minHeight: number,
): RectLike {
  const width = Math.min(Math.max(minWidth, bounds.width), workArea.width);
  const height = Math.min(Math.max(minHeight, bounds.height), workArea.height);
  const maxX = workArea.x + workArea.width - width;
  const maxY = workArea.y + workArea.height - height;
  const x = Math.min(Math.max(bounds.x, workArea.x), maxX);
  const y = Math.min(Math.max(bounds.y, workArea.y), maxY);
  return { x, y, width, height };
}

/**
 * Clamp Window bounds into the greatest-intersection display. Fully off-screen
 * bounds recover to the display with the nearest center. Hosts may override only
 * minimum size policy.
 */
export function clampWindowBoundsToDisplays(
  bounds: RectLike,
  displays: readonly DisplayWorkArea[],
  options: ClampWindowBoundsToDisplaysOptions = {},
): RectLike {
  const minWidth = resolveMinimum(options.minWidth, WINDOW_BOUNDS_MIN_WIDTH, 'minWidth');
  const minHeight = resolveMinimum(options.minHeight, WINDOW_BOUNDS_MIN_HEIGHT, 'minHeight');
  const sized: RectLike = {
    x: bounds.x,
    y: bounds.y,
    width: Math.max(minWidth, bounds.width),
    height: Math.max(minHeight, bounds.height),
  };

  const target = selectWindowDisplayForBounds(sized, displays);
  return target ? clampToWorkArea(sized, target.workArea, minWidth, minHeight) : sized;
}
