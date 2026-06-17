import { getWidgetChildren, type GenericWidget } from '../widget-tree.js';
import { computeGridChildRect } from './grid.js';
import { computeLinearChildRects } from './linear.js';
import { computeStackChildRect } from './stack.js';
import type {
  GridChildPlacement,
  LinearChildPlacement,
  Rect,
  StackChildPlacement,
} from './types.js';

export interface LayoutConstraints {
  readonly minWidth: number;
  readonly maxWidth: number;
  readonly minHeight: number;
  readonly maxHeight: number;
}

export interface LayoutNodeResult {
  readonly rect: Rect;
  readonly widget: GenericWidget;
  readonly children: readonly LayoutNodeResult[];
}

export const DEFAULT_LAYOUT_CONSTRAINTS: LayoutConstraints = {
  minWidth: 0,
  maxWidth: 400,
  minHeight: 0,
  maxHeight: 320,
};

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function constraintsToRect(constraints: LayoutConstraints): Rect {
  return {
    x: 0,
    y: 0,
    width: Math.max(0, constraints.maxWidth),
    height: Math.max(0, constraints.maxHeight),
  };
}

function rectToConstraints(rect: Rect): LayoutConstraints {
  return {
    minWidth: 0,
    maxWidth: Math.max(0, rect.width),
    minHeight: 0,
    maxHeight: Math.max(0, rect.height),
  };
}

function readLinearPlacement(child: GenericWidget): LinearChildPlacement {
  const align = child.align;
  return {
    ...(readNumber(child.flex) !== undefined ? { flex: readNumber(child.flex) } : {}),
    ...(align === 'stretch' || align === 'start' || align === 'center' || align === 'end'
      ? { align }
      : {}),
  };
}

function readGridPlacement(
  child: GenericWidget,
  index: number,
  columns: number,
): GridChildPlacement {
  const col = readNumber(child.col);
  const row = readNumber(child.row);
  if (col !== undefined && row !== undefined) {
    return {
      col,
      row,
      ...(readNumber(child.colSpan) !== undefined ? { colSpan: readNumber(child.colSpan) } : {}),
      ...(readNumber(child.rowSpan) !== undefined ? { rowSpan: readNumber(child.rowSpan) } : {}),
    };
  }

  return {
    col: index % columns,
    row: Math.floor(index / columns),
    ...(readNumber(child.colSpan) !== undefined ? { colSpan: readNumber(child.colSpan) } : {}),
    ...(readNumber(child.rowSpan) !== undefined ? { rowSpan: readNumber(child.rowSpan) } : {}),
  };
}

function readStackPlacement(child: GenericWidget): StackChildPlacement {
  return {
    ...(readNumber(child.left) !== undefined ? { left: readNumber(child.left) } : {}),
    ...(readNumber(child.top) !== undefined ? { top: readNumber(child.top) } : {}),
    ...(readNumber(child.right) !== undefined ? { right: readNumber(child.right) } : {}),
    ...(readNumber(child.bottom) !== undefined ? { bottom: readNumber(child.bottom) } : {}),
  };
}

function layoutChildren(
  widget: GenericWidget,
  parentRect: Rect,
  childRects: readonly Rect[],
): readonly LayoutNodeResult[] {
  const children = getWidgetChildren(widget);
  return children.map((child, index) => {
    const childRect = childRects[index] ?? parentRect;
    return layoutWidget(child, rectToConstraints(childRect), {
      x: childRect.x,
      y: childRect.y,
    });
  });
}

export function layoutWidget(
  widget: GenericWidget,
  constraints: LayoutConstraints = DEFAULT_LAYOUT_CONSTRAINTS,
  origin: Pick<Rect, 'x' | 'y'> = { x: 0, y: 0 },
): LayoutNodeResult {
  const sizeRect = constraintsToRect(constraints);
  const rect: Rect = {
    x: origin.x,
    y: origin.y,
    width: sizeRect.width,
    height: sizeRect.height,
  };

  if (widget.type === 'row' || widget.type === 'column') {
    const children = getWidgetChildren(widget);
    const childRects = computeLinearChildRects(
      {
        type: widget.type,
        gap: readNumber(widget.gap),
        padding: readNumber(widget.padding),
      },
      children.map(readLinearPlacement),
      rect,
    );

    return {
      rect,
      widget,
      children: layoutChildren(widget, rect, childRects),
    };
  }

  if (widget.type === 'grid') {
    const columns = Math.max(1, readNumber(widget.columns) ?? 2);
    const children = getWidgetChildren(widget);
    const layout = {
      columns,
      gap: readNumber(widget.gap),
      padding: readNumber(widget.padding),
      ...(readNumber(widget.rows) !== undefined ? { rows: readNumber(widget.rows) } : {}),
    };

    const childRects = children.map((child, index) =>
      computeGridChildRect(layout, readGridPlacement(child, index, columns), rect),
    );

    return {
      rect,
      widget,
      children: layoutChildren(widget, rect, childRects),
    };
  }

  if (widget.type === 'stack') {
    const children = getWidgetChildren(widget);
    const childRects = children.map((child) => {
      const placement = readStackPlacement(child);
      const childRect = computeStackChildRect(placement, rect.width, rect.height);
      return {
        x: rect.x + childRect.x,
        y: rect.y + childRect.y,
        width: childRect.width,
        height: childRect.height,
      };
    });

    return {
      rect,
      widget,
      children: layoutChildren(widget, rect, childRects),
    };
  }

  return {
    rect,
    widget,
    children: [],
  };
}
