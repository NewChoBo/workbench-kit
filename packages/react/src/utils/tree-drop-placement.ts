export type TreeDropPlacement = 'before' | 'inside' | 'after';

/** Shared row hit geometry; the host still admits the proposed destination. */
export function resolveTreeDropPlacement({
  canContain,
  insideOnly = false,
  offsetY,
  height,
}: {
  readonly canContain: boolean;
  readonly insideOnly?: boolean;
  readonly offsetY: number;
  readonly height: number;
}): TreeDropPlacement {
  const resolvedHeight = Math.max(1, height);
  if (canContain && insideOnly) return 'inside';
  if (canContain) {
    if (offsetY < resolvedHeight / 3) return 'before';
    if (offsetY > (resolvedHeight * 2) / 3) return 'after';
    return 'inside';
  }
  return offsetY < resolvedHeight / 2 ? 'before' : 'after';
}
