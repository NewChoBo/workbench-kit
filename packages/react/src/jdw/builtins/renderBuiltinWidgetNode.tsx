import { createElement, type CSSProperties, type ReactNode } from 'react';
import { getWidgetChildren, type GenericWidget } from '@workbench-kit/jdw';

import { renderBuiltinWidgetLeaf } from './renderBuiltinWidgetLeaf.js';

const LAYOUT_TYPES = new Set(['row', 'column', 'grid']);

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function layoutContainerStyle(widget: GenericWidget): CSSProperties {
  const gap = readNumber(widget.gap) ?? 8;
  const padding = readNumber(widget.padding) ?? 0;
  const background =
    typeof widget.background === 'string' && widget.background.trim().length > 0
      ? widget.background
      : undefined;

  if (widget.type === 'row') {
    return {
      display: 'flex',
      flexDirection: 'row',
      gap,
      padding,
      background,
      alignItems: 'stretch',
      minHeight: 24,
    };
  }

  if (widget.type === 'column') {
    return {
      display: 'flex',
      flexDirection: 'column',
      gap,
      padding,
      background,
      alignItems: 'stretch',
      minHeight: 24,
    };
  }

  if (widget.type === 'grid') {
    const columns = readNumber(widget.columns) ?? 2;
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
      gap,
      padding,
      background,
      minHeight: 24,
    };
  }

  return {};
}

function childPlacementStyle(child: GenericWidget, parentType: string): CSSProperties {
  if (parentType === 'grid') {
    const col = readNumber(child.col);
    const row = readNumber(child.row);
    const colSpan = readNumber(child.colSpan);
    const rowSpan = readNumber(child.rowSpan);

    return {
      gridColumn:
        col !== undefined
          ? colSpan !== undefined
            ? `${col + 1} / span ${colSpan}`
            : `${col + 1}`
          : undefined,
      gridRow:
        row !== undefined
          ? rowSpan !== undefined
            ? `${row + 1} / span ${rowSpan}`
            : `${row + 1}`
          : undefined,
      minWidth: 0,
    };
  }

  if (parentType === 'row' || parentType === 'column') {
    const flex = readNumber(child.flex);
    const align = typeof child.align === 'string' ? child.align : undefined;

    return {
      flex: flex !== undefined ? flex : undefined,
      alignSelf: align,
      minWidth: 0,
    };
  }

  return {};
}

export function renderBuiltinWidgetNode(widget: GenericWidget): ReactNode {
  const leaf = renderBuiltinWidgetLeaf(widget);
  if (leaf !== null) {
    return leaf;
  }

  if (LAYOUT_TYPES.has(widget.type)) {
    const children = getWidgetChildren(widget);
    return createElement(
      'div',
      {
        'data-widget-type': widget.type,
        style: layoutContainerStyle(widget),
      },
      children.map((child, index) =>
        createElement(
          'div',
          {
            key: index,
            'data-widget-child': true,
            style: childPlacementStyle(child, widget.type),
          },
          renderBuiltinWidgetNode(child),
        ),
      ),
    );
  }

  return null;
}
