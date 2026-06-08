export const DEFAULT_SNAP_THRESHOLD = 8;

export function snapScalar(
  value: number,
  guides: readonly number[],
  threshold = DEFAULT_SNAP_THRESHOLD,
): number {
  let closest = value;
  let closestDistance = threshold + 1;

  for (const guide of guides) {
    const distance = Math.abs(value - guide);
    if (distance <= threshold && distance < closestDistance) {
      closest = guide;
      closestDistance = distance;
    }
  }

  return closest;
}

export function snapPoint(
  point: { x: number; y: number },
  xGuides: readonly number[],
  yGuides: readonly number[],
  threshold = DEFAULT_SNAP_THRESHOLD,
): { x: number; y: number } {
  return {
    x: snapScalar(point.x, xGuides, threshold),
    y: snapScalar(point.y, yGuides, threshold),
  };
}

export function snapDelta(
  delta: { x: number; y: number },
  start: { x: number; y: number },
  xGuides: readonly number[],
  yGuides: readonly number[],
  threshold = DEFAULT_SNAP_THRESHOLD,
): { x: number; y: number } {
  const snapped = snapPoint(
    { x: start.x + delta.x, y: start.y + delta.y },
    xGuides,
    yGuides,
    threshold,
  );
  return {
    x: snapped.x - start.x,
    y: snapped.y - start.y,
  };
}
