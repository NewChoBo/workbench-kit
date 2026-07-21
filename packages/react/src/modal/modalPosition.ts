import type { ModalBounds, ModalPosition, ModalSize } from './modalTypes';
import type { ModalContainerBounds } from './modalContainer';
import { readWindowViewportBounds } from './modalContainer';

/**
 * VS Code-style floating window bounds:
 * - Keep the full window inside the viewport when it fits.
 * - When taller than the viewport, pin to the top so the titlebar stays reachable.
 */
export function clampModalDragPosition(
  nextPosition: ModalPosition,
  size: ModalSize,
  viewport: ModalContainerBounds = readWindowViewportBounds(),
): ModalPosition {
  if (typeof window === 'undefined') {
    return nextPosition;
  }

  const maxX = Math.max(0, viewport.width - size.width);
  const x = clamp(nextPosition.x, 0, maxX);
  const maxY = size.height >= viewport.height ? 0 : Math.max(0, viewport.height - size.height);
  const y = clamp(nextPosition.y, 0, maxY);

  return { x, y };
}

export function clampModalBoundsPosition(
  bounds: ModalBounds,
  viewport: ModalContainerBounds = readWindowViewportBounds(),
): ModalBounds {
  return { ...bounds, ...clampModalDragPosition(bounds, bounds, viewport) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
