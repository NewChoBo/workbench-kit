import type { ModalBounds, ModalPosition, ModalSize } from './modalTypes';

/**
 * VS Code-style floating window bounds:
 * - Keep the full window inside the viewport when it fits.
 * - When taller than the viewport, pin to the top so the titlebar stays reachable.
 */
export function clampModalDragPosition(
  nextPosition: ModalPosition,
  size: ModalSize,
): ModalPosition {
  if (typeof window === 'undefined') {
    return nextPosition;
  }

  const maxX = Math.max(0, window.innerWidth - size.width);
  const x = clamp(nextPosition.x, 0, maxX);
  const maxY =
    size.height >= window.innerHeight ? 0 : Math.max(0, window.innerHeight - size.height);
  const y = clamp(nextPosition.y, 0, maxY);

  return { x, y };
}

export function clampModalBoundsPosition(bounds: ModalBounds): ModalBounds {
  return { ...bounds, ...clampModalDragPosition(bounds, bounds) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
