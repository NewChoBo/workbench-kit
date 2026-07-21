import type { DisplayWorkArea, RectLike } from './types.js';

/** Reasonable minimum restored window size. */
export const WINDOW_BOUNDS_MIN_WIDTH = 200;
export const WINDOW_BOUNDS_MIN_HEIGHT = 100;

function rectsIntersect(a: RectLike, b: RectLike): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function centerOf(rect: RectLike): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function distanceSquared(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function pickTargetDisplay(
  bounds: RectLike,
  displays: readonly DisplayWorkArea[],
): DisplayWorkArea {
  const center = centerOf(bounds);
  const containing = displays.find((display) => {
    const { workArea } = display;
    return (
      center.x >= workArea.x &&
      center.x < workArea.x + workArea.width &&
      center.y >= workArea.y &&
      center.y < workArea.y + workArea.height
    );
  });
  if (containing) {
    return containing;
  }

  let nearest = displays[0]!;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const display of displays) {
    const distance = distanceSquared(center, centerOf(display.workArea));
    if (distance < nearestDistance) {
      nearest = display;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function clampToWorkArea(bounds: RectLike, workArea: RectLike): RectLike {
  const width = Math.min(Math.max(WINDOW_BOUNDS_MIN_WIDTH, bounds.width), workArea.width);
  const height = Math.min(Math.max(WINDOW_BOUNDS_MIN_HEIGHT, bounds.height), workArea.height);
  const maxX = workArea.x + workArea.width - width;
  const maxY = workArea.y + workArea.height - height;
  const x = Math.min(Math.max(bounds.x, workArea.x), maxX);
  const y = Math.min(Math.max(bounds.y, workArea.y), maxY);
  return { x, y, width, height };
}

/**
 * Clamp saved window bounds so size stays usable and the rect sits on a
 * known display work area (off-screen recovery when a monitor was removed).
 */
export function clampWindowBoundsToDisplays(
  bounds: RectLike,
  displays: readonly DisplayWorkArea[],
): RectLike {
  const width = Math.max(WINDOW_BOUNDS_MIN_WIDTH, bounds.width);
  const height = Math.max(WINDOW_BOUNDS_MIN_HEIGHT, bounds.height);
  const sized: RectLike = { x: bounds.x, y: bounds.y, width, height };

  if (displays.length === 0) {
    return sized;
  }

  const maxWorkWidth = Math.max(...displays.map((display) => display.workArea.width));
  const maxWorkHeight = Math.max(...displays.map((display) => display.workArea.height));
  const fitted: RectLike = {
    x: sized.x,
    y: sized.y,
    width: Math.min(sized.width, maxWorkWidth),
    height: Math.min(sized.height, maxWorkHeight),
  };

  const intersectsAny = displays.some((display) =>
    rectsIntersect(fitted, display.workArea),
  );

  if (intersectsAny) {
    return clampToWorkArea(fitted, pickTargetDisplay(fitted, displays).workArea);
  }

  const primary = displays.find((display) => display.isPrimary) ?? displays[0]!;
  return clampToWorkArea(fitted, primary.workArea);
}
