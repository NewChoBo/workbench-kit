import type { LinearChildPlacement, LinearLayoutSpec, Rect } from './types.js';

export function computeLinearChildRects(
  layout: LinearLayoutSpec,
  children: readonly LinearChildPlacement[],
  parentRect: Rect,
): Rect[] {
  const isRow = layout.type === 'row';
  const gap = layout.gap ?? 0;
  const padding = layout.padding ?? 0;

  const totalFlex = children.reduce((sum, child) => sum + (child.flex ?? 1), 0);
  const mainAxisSize = isRow ? parentRect.width - padding * 2 : parentRect.height - padding * 2;
  const crossAxisSize = isRow ? parentRect.height - padding * 2 : parentRect.width - padding * 2;

  const totalGap = gap * (children.length - 1);
  const availableMain = mainAxisSize - totalGap;

  const rects: Rect[] = [];
  let mainOffset = padding;

  for (const child of children) {
    const childFlex = child.flex ?? 1;
    const childMain = (childFlex / totalFlex) * availableMain;

    if (isRow) {
      rects.push({
        x: parentRect.x + mainOffset,
        y: parentRect.y + padding,
        width: childMain,
        height: crossAxisSize,
      });
    } else {
      rects.push({
        x: parentRect.x + padding,
        y: parentRect.y + mainOffset,
        width: crossAxisSize,
        height: childMain,
      });
    }

    mainOffset += childMain + gap;
  }

  return rects;
}
