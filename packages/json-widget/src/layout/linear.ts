import type { LinearChildPlacement, LinearLayoutSpec, Rect } from './types.js';

export function computeLinearChildRects(
  layout: LinearLayoutSpec,
  children: readonly LinearChildPlacement[],
  parentRect: Rect,
): Rect[] {
  const isRow = layout.type === 'row';
  const baseGap = layout.gap ?? 0;
  const padding = layout.padding ?? 0;

  const mainAxisSize = isRow ? parentRect.width - padding * 2 : parentRect.height - padding * 2;
  const crossAxisSize = isRow ? parentRect.height - padding * 2 : parentRect.width - padding * 2;

  const totalGap = baseGap * Math.max(0, children.length - 1);
  const availableMain = mainAxisSize - totalGap;
  const fixedMain = children.reduce(
    (sum, child) => sum + (child.flex === undefined ? (child.mainSize ?? 0) : 0),
    0,
  );
  const flexValues = children.map((child) =>
    child.flex !== undefined || child.mainSize === undefined ? (child.flex ?? 1) : 0,
  );
  const totalFlex = flexValues.reduce((sum, flex) => sum + flex, 0);
  const availableFlexMain = Math.max(0, availableMain - fixedMain);
  const childMainSizes = children.map((child, index) => {
    const flex = flexValues[index] ?? 0;
    if (flex <= 0 || totalFlex <= 0) {
      return child.mainSize ?? 0;
    }

    const allocatedMain = (flex / totalFlex) * availableFlexMain;
    if (child.flexFit === 'loose' && child.mainSize !== undefined) {
      return Math.min(child.mainSize, allocatedMain);
    }

    return allocatedMain;
  });
  const usedMain = childMainSizes.reduce((sum, childMain) => sum + childMain, 0) + totalGap;
  const remainingMain = Math.max(0, mainAxisSize - usedMain);

  const rects: Rect[] = [];
  let mainOffset = padding;
  let gap = baseGap;

  if (layout.mainAxisAlignment === 'center') {
    mainOffset += remainingMain / 2;
  } else if (layout.mainAxisAlignment === 'end') {
    mainOffset += remainingMain;
  } else if (layout.mainAxisAlignment === 'spaceBetween' && children.length > 1) {
    gap += remainingMain / (children.length - 1);
  } else if (layout.mainAxisAlignment === 'spaceAround' && children.length > 0) {
    const distributed = remainingMain / children.length;
    mainOffset += distributed / 2;
    gap += distributed;
  } else if (layout.mainAxisAlignment === 'spaceEvenly' && children.length > 0) {
    const distributed = remainingMain / (children.length + 1);
    mainOffset += distributed;
    gap += distributed;
  }

  children.forEach((child, index) => {
    const childMain = childMainSizes[index] ?? 0;
    const crossAlignment = child.align ?? layout.crossAxisAlignment ?? 'stretch';
    const childCross =
      crossAlignment === 'stretch'
        ? crossAxisSize
        : Math.min(crossAxisSize, child.crossSize ?? crossAxisSize);
    let crossOffset = padding;

    if (crossAlignment === 'center') {
      crossOffset += (crossAxisSize - childCross) / 2;
    } else if (crossAlignment === 'end') {
      crossOffset += crossAxisSize - childCross;
    }

    if (isRow) {
      rects.push({
        x: parentRect.x + mainOffset,
        y: parentRect.y + crossOffset,
        width: childMain,
        height: childCross,
      });
    } else {
      rects.push({
        x: parentRect.x + crossOffset,
        y: parentRect.y + mainOffset,
        width: childCross,
        height: childMain,
      });
    }

    mainOffset += childMain + gap;
  });

  return rects;
}
