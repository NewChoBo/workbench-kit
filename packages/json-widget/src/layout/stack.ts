import type { Rect, StackChildPlacement } from './types.js';

export function computeStackChildRect(
  child: StackChildPlacement,
  parentWidth: number,
  parentHeight: number,
): Rect {
  const left = child.left ?? 0;
  const top = child.top ?? 0;
  const width = child.right !== undefined ? parentWidth - left - child.right : parentWidth - left;
  const height =
    child.bottom !== undefined ? parentHeight - top - child.bottom : parentHeight - top;

  return { x: left, y: top, width, height };
}
