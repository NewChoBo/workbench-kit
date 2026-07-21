import type { RectLike, ResizeEdge, ResizeRectOptions } from './types.js';

/**
 * Applies an 8-edge (or corner) resize delta to an axis-aligned rectangle,
 * clamping width/height to optional minimums while anchoring the opposite edge.
 */
export function resizeRect(
  bounds: RectLike,
  edge: ResizeEdge,
  deltaX: number,
  deltaY: number,
  options?: ResizeRectOptions,
): RectLike {
  const minWidth = options?.minWidth ?? 0;
  const minHeight = options?.minHeight ?? 0;

  let { x, y, width, height } = bounds;
  const right = x + width;
  const bottom = y + height;

  const affectsLeft = edge === 'left' || edge === 'top-left' || edge === 'bottom-left';
  const affectsRight = edge === 'right' || edge === 'top-right' || edge === 'bottom-right';
  const affectsTop = edge === 'top' || edge === 'top-left' || edge === 'top-right';
  const affectsBottom = edge === 'bottom' || edge === 'bottom-left' || edge === 'bottom-right';

  if (affectsRight) {
    width = Math.max(minWidth, width + deltaX);
  }

  if (affectsLeft) {
    width = Math.max(minWidth, width - deltaX);
    x = right - width;
  }

  if (affectsBottom) {
    height = Math.max(minHeight, height + deltaY);
  }

  if (affectsTop) {
    height = Math.max(minHeight, height - deltaY);
    y = bottom - height;
  }

  return { x, y, width, height };
}
