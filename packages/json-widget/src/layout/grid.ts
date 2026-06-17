import type { GridChildPlacement, GridLayoutSpec, Rect } from './types.js';

export function computeGridChildRect(
  layout: GridLayoutSpec,
  child: GridChildPlacement,
  parentRect: Rect,
): Rect {
  const gap = layout.gap ?? 0;
  const padding = layout.padding ?? 0;
  const availW = parentRect.width - padding * 2;
  const cellW = (availW - gap * (layout.columns - 1)) / layout.columns;

  const cellH = layout.rows
    ? (parentRect.height - padding * 2 - gap * (layout.rows - 1)) / layout.rows
    : cellW;

  const colSpan = child.colSpan ?? 1;
  const rowSpan = child.rowSpan ?? 1;

  return {
    x: parentRect.x + padding + child.col * (cellW + gap),
    y: parentRect.y + padding + child.row * (cellH + gap),
    width: colSpan * cellW + (colSpan - 1) * gap,
    height: rowSpan * cellH + (rowSpan - 1) * gap,
  };
}
