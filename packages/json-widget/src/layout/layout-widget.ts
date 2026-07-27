import type { WidgetRegistryContract } from '@workbench-kit/contracts';

import { clampNumber } from '../widget/number-utils.js';
import { getWidgetChildren, type GenericWidget } from '../widget/tree.js';
import { isGenericWidget } from '../widget/type-guards.js';
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

export interface LayoutWidgetOptions {
  readonly registry?: WidgetRegistryContract<unknown> | undefined;
  readonly useIntrinsicSize?: boolean | undefined;
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

function readMeasuredSize(
  widget: GenericWidget,
  constraints: LayoutConstraints,
  options: LayoutWidgetOptions,
): Partial<Pick<Rect, 'width' | 'height'>> {
  const measure = options.registry?.definition(widget.type)?.measure;
  if (!measure) {
    return {};
  }

  const measured = measure(widget, constraints);
  return {
    ...(readNumber(measured?.width) !== undefined
      ? {
          width: clampNumber(
            readNumber(measured?.width) ?? 0,
            Math.max(0, constraints.minWidth),
            Math.max(0, constraints.maxWidth),
          ),
        }
      : {}),
    ...(readNumber(measured?.height) !== undefined
      ? {
          height: clampNumber(
            readNumber(measured?.height) ?? 0,
            Math.max(0, constraints.minHeight),
            Math.max(0, constraints.maxHeight),
          ),
        }
      : {}),
  };
}

function widgetRect(
  widget: GenericWidget,
  constraints: LayoutConstraints,
  origin: Pick<Rect, 'x' | 'y'>,
  options: LayoutWidgetOptions,
): Rect {
  const sizeRect = constraintsToRect(constraints);
  const useConstraintSize = widget.flexFit === 'tight';
  const measured =
    options.useIntrinsicSize === false ? {} : readMeasuredSize(widget, constraints, options);
  return {
    x: origin.x,
    y: origin.y,
    width: Math.max(
      0,
      useConstraintSize
        ? sizeRect.width
        : (readNumber(widget.width) ?? measured.width ?? sizeRect.width),
    ),
    height: Math.max(
      0,
      useConstraintSize
        ? sizeRect.height
        : (readNumber(widget.height) ?? measured.height ?? sizeRect.height),
    ),
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

function readLinearPlacement(
  child: GenericWidget,
  parentType: 'row' | 'column',
  parentRect: Rect,
  options: LayoutWidgetOptions,
): LinearChildPlacement {
  const align = child.align;
  const flexFit = child.flexFit;
  const measured = readMeasuredSize(child, rectToConstraints(parentRect), options);
  let mainSize =
    readNumber(parentType === 'row' ? child.width : child.height) ??
    (parentType === 'row' ? measured.width : measured.height);
  const crossSize =
    readNumber(parentType === 'row' ? child.height : child.width) ??
    (parentType === 'row' ? measured.height : measured.width);
  const flex = readNumber(child.flex);

  // When a sibling will claim flex space, content children need an intrinsic main size
  // or they collapse to 0 under the linear allocator.
  if (mainSize === undefined && flex === undefined) {
    const intrinsic = estimateIntrinsicSize(child, rectToConstraints(parentRect), options);
    mainSize = parentType === 'row' ? intrinsic.width : intrinsic.height;
  }

  return {
    ...(flex !== undefined ? { flex } : {}),
    ...(flexFit === 'tight' || flexFit === 'loose' ? { flexFit } : {}),
    ...(align === 'stretch' || align === 'start' || align === 'center' || align === 'end'
      ? { align }
      : {}),
    ...(mainSize !== undefined ? { mainSize } : {}),
    ...(crossSize !== undefined ? { crossSize } : {}),
  };
}

function estimateIntrinsicSize(
  widget: GenericWidget,
  constraints: LayoutConstraints,
  options: LayoutWidgetOptions,
): { readonly width: number; readonly height: number } {
  const explicitWidth = readNumber(widget.width);
  const explicitHeight = readNumber(widget.height);
  const measured = readMeasuredSize(widget, constraints, {
    ...options,
    useIntrinsicSize: true,
  });
  const padding = readNumber(widget.padding) ?? 0;
  const gap = readNumber(widget.gap) ?? 0;
  const children = getWidgetChildren(widget);

  if (widget.type === 'row') {
    const childSizes = children.map((child) => estimateIntrinsicSize(child, constraints, options));
    const contentWidth =
      childSizes.reduce((sum, size) => sum + size.width, 0) +
      gap * Math.max(0, children.length - 1);
    const contentHeight = childSizes.reduce((max, size) => Math.max(max, size.height), 0);
    return {
      width: explicitWidth ?? Math.min(constraints.maxWidth, contentWidth + padding * 2),
      height: explicitHeight ?? contentHeight + padding * 2,
    };
  }

  if (widget.type === 'column') {
    const childSizes = children.map((child) => estimateIntrinsicSize(child, constraints, options));
    const contentWidth = childSizes.reduce((max, size) => Math.max(max, size.width), 0);
    const contentHeight =
      childSizes.reduce((sum, size) => sum + size.height, 0) +
      gap * Math.max(0, children.length - 1);
    return {
      width: explicitWidth ?? Math.min(constraints.maxWidth, contentWidth + padding * 2),
      height: explicitHeight ?? contentHeight + padding * 2,
    };
  }

  if (widget.type === 'grid') {
    const columns = Math.max(1, readNumber(widget.columns) ?? 2);
    const childSizes = children.map((child) => estimateIntrinsicSize(child, constraints, options));
    const rows = Math.max(1, Math.ceil(childSizes.length / columns));
    const cellWidth =
      childSizes.reduce((max, size) => Math.max(max, size.width), 0) ||
      constraints.maxWidth / columns;
    const cellHeight = childSizes.reduce((max, size) => Math.max(max, size.height), 0);
    return {
      width:
        explicitWidth ??
        Math.min(
          constraints.maxWidth,
          columns * cellWidth + gap * Math.max(0, columns - 1) + padding * 2,
        ),
      height: explicitHeight ?? rows * cellHeight + gap * Math.max(0, rows - 1) + padding * 2,
    };
  }

  if (
    widget.type === 'box' ||
    widget.type === 'container' ||
    widget.type === 'padding' ||
    widget.type === 'align' ||
    widget.type === 'center' ||
    widget.type === 'sized_box'
  ) {
    const child = getSingleChild(widget);
    if (child) {
      const childSize = estimateIntrinsicSize(child, constraints, options);
      return {
        width: explicitWidth ?? childSize.width + padding * 2,
        height: explicitHeight ?? childSize.height + padding * 2,
      };
    }
  }

  return {
    width: explicitWidth ?? measured.width ?? 0,
    height: explicitHeight ?? measured.height ?? 0,
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
  options: LayoutWidgetOptions,
): readonly LayoutNodeResult[] {
  const children = getWidgetChildren(widget);
  return children.map((child, index) => {
    const childRect = childRects[index] ?? parentRect;
    return layoutWidget(
      child,
      rectToConstraints(childRect),
      {
        x: childRect.x,
        y: childRect.y,
      },
      { ...options, useIntrinsicSize: false },
    );
  });
}

function getSingleChild(widget: GenericWidget): GenericWidget | null {
  return isGenericWidget(widget.child) ? widget.child : null;
}

function insetRect(rect: Rect, padding: number): Rect {
  return {
    x: rect.x + padding,
    y: rect.y + padding,
    width: Math.max(0, rect.width - padding * 2),
    height: Math.max(0, rect.height - padding * 2),
  };
}

function alignChildRect(
  parentRect: Rect,
  child: GenericWidget,
  alignment: unknown,
  options: LayoutWidgetOptions,
): Rect {
  const measured = readMeasuredSize(child, rectToConstraints(parentRect), options);
  const childWidth = Math.max(0, readNumber(child.width) ?? measured.width ?? parentRect.width);
  const childHeight = Math.max(0, readNumber(child.height) ?? measured.height ?? parentRect.height);
  const normalized = typeof alignment === 'string' ? alignment : 'center';
  const xFactor =
    normalized.endsWith('Right') || normalized === 'right'
      ? 1
      : normalized.endsWith('Left') || normalized === 'left'
        ? 0
        : 0.5;
  const yFactor =
    normalized.startsWith('bottom') || normalized === 'bottom'
      ? 1
      : normalized.startsWith('top') || normalized === 'top'
        ? 0
        : 0.5;

  return {
    x: parentRect.x + Math.max(0, parentRect.width - childWidth) * xFactor,
    y: parentRect.y + Math.max(0, parentRect.height - childHeight) * yFactor,
    width: Math.min(parentRect.width, childWidth),
    height: Math.min(parentRect.height, childHeight),
  };
}

function layoutSingleChildWrapper(
  widget: GenericWidget,
  rect: Rect,
  options: LayoutWidgetOptions,
): readonly LayoutNodeResult[] {
  const child = getSingleChild(widget);
  if (!child) return [];

  const padding = readNumber(widget.padding) ?? 0;
  const paddedRect = padding > 0 ? insetRect(rect, padding) : rect;
  const childRect =
    widget.type === 'align'
      ? alignChildRect(paddedRect, child, widget.alignment, options)
      : widget.type === 'center'
        ? alignChildRect(paddedRect, child, 'center', options)
        : paddedRect;

  return [
    layoutWidget(
      child,
      rectToConstraints(childRect),
      { x: childRect.x, y: childRect.y },
      { ...options, useIntrinsicSize: false },
    ),
  ];
}

export function layoutWidget(
  widget: GenericWidget,
  constraints: LayoutConstraints = DEFAULT_LAYOUT_CONSTRAINTS,
  origin: Pick<Rect, 'x' | 'y'> = { x: 0, y: 0 },
  options: LayoutWidgetOptions = {},
): LayoutNodeResult {
  const rect = widgetRect(widget, constraints, origin, options);

  if (widget.type === 'row' || widget.type === 'column') {
    const linearType = widget.type;
    const children = getWidgetChildren(widget);
    const childRects = computeLinearChildRects(
      {
        type: linearType,
        gap: readNumber(widget.gap),
        padding: readNumber(widget.padding),
        ...(widget.mainAxisAlignment === 'start' ||
        widget.mainAxisAlignment === 'center' ||
        widget.mainAxisAlignment === 'end' ||
        widget.mainAxisAlignment === 'spaceBetween' ||
        widget.mainAxisAlignment === 'spaceAround' ||
        widget.mainAxisAlignment === 'spaceEvenly'
          ? { mainAxisAlignment: widget.mainAxisAlignment }
          : {}),
        ...(widget.crossAxisAlignment === 'stretch' ||
        widget.crossAxisAlignment === 'start' ||
        widget.crossAxisAlignment === 'center' ||
        widget.crossAxisAlignment === 'end'
          ? { crossAxisAlignment: widget.crossAxisAlignment }
          : {}),
      },
      children.map((child) => readLinearPlacement(child, linearType, rect, options)),
      rect,
    );

    return {
      rect,
      widget,
      children: layoutChildren(widget, rect, childRects, options),
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
      children: layoutChildren(widget, rect, childRects, options),
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
      children: layoutChildren(widget, rect, childRects, options),
    };
  }

  if (
    widget.type === 'box' ||
    widget.type === 'container' ||
    widget.type === 'padding' ||
    widget.type === 'align' ||
    widget.type === 'center' ||
    widget.type === 'sized_box'
  ) {
    return {
      rect,
      widget,
      children: layoutSingleChildWrapper(widget, rect, options),
    };
  }

  return {
    rect,
    widget,
    children: [],
  };
}
