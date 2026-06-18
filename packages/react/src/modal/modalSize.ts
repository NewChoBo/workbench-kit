import type { ModalBounds, ModalResizeEdge } from './modalTypes';

export interface ModalSizeConstraints {
  minWidth: number;
  minHeight: number;
}

export function clampModalBounds(
  bounds: ModalBounds,
  constraints: ModalSizeConstraints,
): ModalBounds {
  if (typeof window === 'undefined') {
    return bounds;
  }

  let { x, y, width, height } = bounds;

  width = Math.max(constraints.minWidth, width);
  height = Math.max(constraints.minHeight, height);

  if (x < 0) {
    width += x;
    x = 0;
  }

  if (y < 0) {
    height += y;
    y = 0;
  }

  width = Math.min(width, window.innerWidth - x);
  height = Math.min(height, window.innerHeight - y);
  height = Math.max(constraints.minHeight, height);

  return { x, y, width, height };
}

export function applyModalResize(
  start: ModalBounds,
  edge: ModalResizeEdge,
  deltaX: number,
  deltaY: number,
  constraints: ModalSizeConstraints,
): ModalBounds {
  let { x, y, width, height } = start;

  if (edge.includes('e')) {
    width += deltaX;
  }

  if (edge.includes('w')) {
    x += deltaX;
    width -= deltaX;
  }

  if (edge.includes('s')) {
    height += deltaY;
  }

  if (edge.includes('n')) {
    y += deltaY;
    height -= deltaY;
  }

  return clampModalBounds({ x, y, width, height }, constraints);
}

export function readCssModalDimension(
  element: HTMLElement,
  variableName: '--ui-modal-width' | '--ui-modal-height',
  fallback: number,
): number {
  const value = getComputedStyle(element).getPropertyValue(variableName).trim();
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
