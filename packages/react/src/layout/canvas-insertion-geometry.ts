/** Finite, unscaled layout coordinates unless explicitly described as client coordinates. */
export interface WorkbenchCanvasInsertionPoint {
  readonly x: number;
  readonly y: number;
}

export interface WorkbenchCanvasInsertionSize {
  readonly width: number;
  readonly height: number;
}

export interface WorkbenchCanvasInsertionRect
  extends WorkbenchCanvasInsertionPoint, WorkbenchCanvasInsertionSize {}

export type WorkbenchCanvasInsertionMode = 'canvas' | 'horizontal' | 'vertical' | 'grid';

export interface WorkbenchCanvasInsertionChild {
  readonly index: number;
  /** Current client rectangle of this direct child, in canonical source order. */
  readonly rect: WorkbenchCanvasInsertionRect;
}

export interface WorkbenchCanvasInsertionInput {
  /** Client coordinates. Points outside the content viewport are not drop targets. */
  readonly point: WorkbenchCanvasInsertionPoint;
  /** Measured client content viewport, excluding borders, CSS padding and scrollbars. */
  readonly parentRect: WorkbenchCanvasInsertionRect;
  /** Current resolved content viewport size, not an authored placement request. */
  readonly parentSize: WorkbenchCanvasInsertionSize;
  /** Own scrolling in unscaled layout pixels; ancestor scrolling is already in client rects. */
  readonly scrollOffset: WorkbenchCanvasInsertionPoint;
  readonly mode: WorkbenchCanvasInsertionMode;
  readonly children: readonly WorkbenchCanvasInsertionChild[];
  readonly childCount: number;
  readonly itemSize?: WorkbenchCanvasInsertionSize;
}

export interface WorkbenchCanvasInsertionResult {
  readonly index: number;
  /** Parent-content-local position; only canvas mode changes placement. */
  readonly position?: WorkbenchCanvasInsertionPoint;
  /** Clipped parent-viewport-local rectangle in layout pixels. */
  readonly markerRect: WorkbenchCanvasInsertionRect;
}

function finitePoint(point: WorkbenchCanvasInsertionPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function positiveSize(size: WorkbenchCanvasInsertionSize): boolean {
  return (
    Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0
  );
}

function measuredRect(rect: WorkbenchCanvasInsertionRect): boolean {
  return (
    finitePoint(rect) &&
    positiveSize(rect) &&
    Number.isFinite(rect.x + rect.width) &&
    Number.isFinite(rect.y + rect.height)
  );
}

function clamp(value: number, maximum: number): number {
  return Math.min(maximum, Math.max(0, value));
}

function clippedRect(
  rect: WorkbenchCanvasInsertionRect,
  size: WorkbenchCanvasInsertionSize,
): WorkbenchCanvasInsertionRect {
  const x = clamp(rect.x, size.width);
  const y = clamp(rect.y, size.height);
  return {
    x,
    y,
    width: Math.max(0, Math.min(rect.width - Math.max(0, -rect.x), size.width - x)),
    height: Math.max(0, Math.min(rect.height - Math.max(0, -rect.y), size.height - y)),
  };
}

/**
 * Proposes an insertion from measured geometry only. The caller owns content-box
 * normalization, layout, target policy and committing the proposed operation.
 */
export function resolveWorkbenchCanvasInsertion(
  input: WorkbenchCanvasInsertionInput,
): WorkbenchCanvasInsertionResult | null {
  const { point, parentRect, parentSize, scrollOffset, mode, children, childCount } = input;
  if (
    !finitePoint(point) ||
    !measuredRect(parentRect) ||
    !positiveSize(parentSize) ||
    !finitePoint(scrollOffset) ||
    !Number.isSafeInteger(childCount) ||
    childCount < 0 ||
    children.length !== childCount ||
    children.some((child, index) => child.index !== index || !measuredRect(child.rect)) ||
    !['canvas', 'horizontal', 'vertical', 'grid'].includes(mode) ||
    point.x < parentRect.x ||
    point.y < parentRect.y ||
    point.x > parentRect.x + parentRect.width ||
    point.y > parentRect.y + parentRect.height
  ) {
    return null;
  }

  const scaleX = parentSize.width / parentRect.width;
  const scaleY = parentSize.height / parentRect.height;
  if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY) || scaleX <= 0 || scaleY <= 0) {
    return null;
  }
  const viewportPoint = {
    x: clamp((point.x - parentRect.x) * scaleX, parentSize.width),
    y: clamp((point.y - parentRect.y) * scaleY, parentSize.height),
  };
  if (mode === 'canvas') {
    const size = input.itemSize;
    if (!size || !positiveSize(size)) return null;
    // DOM scroll offsets are already unscaled. Add them exactly once.
    const contentX = viewportPoint.x + scrollOffset.x;
    const contentY = viewportPoint.y + scrollOffset.y;
    if (!Number.isFinite(contentX) || !Number.isFinite(contentY)) return null;
    const position = {
      x: clamp(Math.round(contentX), Math.max(0, Math.floor(parentSize.width - size.width))),
      y: clamp(Math.round(contentY), Math.max(0, Math.floor(parentSize.height - size.height))),
    };
    return {
      index: childCount,
      position,
      markerRect: clippedRect(
        {
          x: position.x - scrollOffset.x,
          y: position.y - scrollOffset.y,
          width: size.width,
          height: size.height,
        },
        parentSize,
      ),
    };
  }

  if (childCount === 0) {
    return { index: 0, markerRect: { x: 0, y: 0, ...parentSize } };
  }
  const localChildren = children.map(({ index, rect }) => ({
    index,
    rect: {
      x: (rect.x - parentRect.x) * scaleX,
      y: (rect.y - parentRect.y) * scaleY,
      width: rect.width * scaleX,
      height: rect.height * scaleY,
    },
  }));
  if (localChildren.some(({ rect }) => !measuredRect(rect))) return null;

  let chosen = localChildren[localChildren.length - 1]!;
  let before = false;
  if (mode === 'horizontal' || mode === 'vertical') {
    const vertical = mode === 'vertical';
    const firstAfter = localChildren.find(({ rect }) =>
      vertical
        ? viewportPoint.y < rect.y + rect.height / 2
        : viewportPoint.x < rect.x + rect.width / 2,
    );
    if (firstAfter) {
      chosen = firstAfter;
      before = true;
    }
  } else {
    let bestDistance = Infinity;
    for (const child of localChildren) {
      const { rect } = child;
      const dx = Math.max(rect.x - viewportPoint.x, 0, viewportPoint.x - rect.x - rect.width);
      const dy = Math.max(rect.y - viewportPoint.y, 0, viewportPoint.y - rect.y - rect.height);
      const distance = dx * dx + dy * dy;
      if (!Number.isFinite(distance)) return null;
      // Strict comparison preserves canonical source-index ties.
      if (distance < bestDistance) {
        bestDistance = distance;
        chosen = child;
      }
    }
    const { rect } = chosen;
    before =
      viewportPoint.y < rect.y ||
      (viewportPoint.y <= rect.y + rect.height && viewportPoint.x < rect.x + rect.width / 2);
  }

  const { rect } = chosen;
  const vertical = mode === 'vertical';
  // The marker is two client pixels wide, independent of viewport scale.
  const thickness = Math.min(
    vertical ? parentSize.height : parentSize.width,
    2 * (vertical ? scaleY : scaleX),
  );
  const markerRect = vertical
    ? {
        x: rect.x,
        y: clamp(before ? rect.y : rect.y + rect.height, parentSize.height - thickness),
        width: rect.width,
        height: thickness,
      }
    : {
        x: clamp(before ? rect.x : rect.x + rect.width, parentSize.width - thickness),
        y: rect.y,
        width: thickness,
        height: rect.height,
      };
  return {
    index: chosen.index + (before ? 0 : 1),
    markerRect: clippedRect(markerRect, parentSize),
  };
}
