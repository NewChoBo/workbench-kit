import type { WidgetPlacementAssetKind, WidgetPlacementPolicy } from '@workbench-kit/contracts';

import { getWidgetChildren, type GenericWidget } from './widget-tree.js';

const GRID_PLACEMENT_KEYS = ['col', 'row', 'colSpan', 'rowSpan'] as const;
const LINEAR_PLACEMENT_KEYS = ['flex', 'flexFit', 'align'] as const;
const STACK_PLACEMENT_KEYS = ['left', 'top', 'right', 'bottom'] as const;

export interface NormalizeWidgetOptions {
  /** When true, only the root node is adjusted for the parent; children are left unchanged. */
  readonly preserveInternalLayout?: boolean | undefined;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function omitKeys(widget: GenericWidget, keys: readonly string[]): GenericWidget {
  const next: GenericWidget = { ...widget };
  for (const key of keys) {
    delete next[key];
  }
  return next;
}

function hasGridPlacement(widget: GenericWidget): boolean {
  return isFiniteNumber(widget.col) && isFiniteNumber(widget.row);
}

function readPositiveInteger(value: unknown): number | null {
  if (!isFiniteNumber(value) || value < 1) return null;
  return Math.floor(value);
}

function isGenericWidget(value: unknown): value is GenericWidget {
  return (
    value !== null &&
    !Array.isArray(value) &&
    typeof value === 'object' &&
    typeof (value as GenericWidget).type === 'string'
  );
}

export function stripExternalPlacement(widget: GenericWidget, parentType: string): GenericWidget {
  switch (parentType) {
    case 'grid':
      return omitKeys(widget, [...LINEAR_PLACEMENT_KEYS, ...STACK_PLACEMENT_KEYS]);
    case 'row':
    case 'column':
      return omitKeys(widget, [...GRID_PLACEMENT_KEYS, ...STACK_PLACEMENT_KEYS]);
    case 'stack':
      return omitKeys(widget, [...GRID_PLACEMENT_KEYS, ...LINEAR_PLACEMENT_KEYS]);
    default:
      return omitKeys(widget, [
        ...GRID_PLACEMENT_KEYS,
        ...LINEAR_PLACEMENT_KEYS,
        ...STACK_PLACEMENT_KEYS,
      ]);
  }
}

export function assignGridSlot(parent: GenericWidget, child: GenericWidget): GenericWidget {
  const columns = typeof parent.columns === 'number' && parent.columns > 0 ? parent.columns : 2;
  const nextIndex = getWidgetChildren(parent).length;

  return {
    ...child,
    col: nextIndex % columns,
    row: Math.floor(nextIndex / columns),
  };
}

function gridCellKey(col: number, row: number): string {
  return `${col},${row}`;
}

function markGridOccupancy(
  occupied: Set<string>,
  col: number,
  row: number,
  colSpan: number,
  rowSpan: number,
): void {
  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
      occupied.add(gridCellKey(col + colOffset, row + rowOffset));
    }
  }
}

function collectGridOccupancy(children: readonly GenericWidget[], columns: number): Set<string> {
  const occupied = new Set<string>();
  for (const child of children) {
    if (!hasGridPlacement(child)) continue;
    const colSpan = Math.min(readPositiveInteger(child.colSpan) ?? 1, columns);
    const rowSpan = readPositiveInteger(child.rowSpan) ?? 1;
    markGridOccupancy(occupied, child.col as number, child.row as number, colSpan, rowSpan);
  }
  return occupied;
}

function findNextFreeGridSlot(
  columns: number,
  occupied: Set<string>,
  requestedColSpan: number,
): { readonly col: number; readonly row: number; readonly colSpan: number } {
  const colSpan = Math.min(Math.max(1, requestedColSpan), columns);
  let col = 0;
  let row = 0;

  for (;;) {
    if (col + colSpan > columns) {
      col = 0;
      row += 1;
      continue;
    }

    let free = true;
    for (let offset = 0; offset < colSpan; offset += 1) {
      if (occupied.has(gridCellKey(col + offset, row))) {
        free = false;
        break;
      }
    }

    if (free) {
      return { col, row, colSpan };
    }

    col += 1;
    if (col >= columns) {
      col = 0;
      row += 1;
    }
  }
}

/**
 * Ensures every direct grid child has `col`/`row` at rest (D1).
 * Existing placements are preserved; missing ones take the next free slot.
 */
export function ensureGridChildPlacements(widget: GenericWidget): GenericWidget {
  if (widget.type !== 'grid') return widget;

  const children = getWidgetChildren(widget);
  if (children.length === 0) return widget;

  const columns = readPositiveInteger(widget.columns) ?? 2;
  const occupied = collectGridOccupancy(children, columns);
  let changed = false;

  const nextChildren = children.map((child) => {
    if (hasGridPlacement(child)) {
      return child;
    }

    changed = true;
    const slot = findNextFreeGridSlot(columns, occupied, readPositiveInteger(child.colSpan) ?? 1);
    markGridOccupancy(occupied, slot.col, slot.row, slot.colSpan, 1);

    return {
      ...child,
      col: slot.col,
      row: slot.row,
      ...(isFiniteNumber(child.colSpan) ? { colSpan: slot.colSpan } : {}),
    };
  });

  return changed ? { ...widget, children: nextChildren } : widget;
}

export function reflowGridChildren(widget: GenericWidget): GenericWidget {
  if (widget.type !== 'grid') return widget;

  const children = getWidgetChildren(widget);
  if (children.length === 0) return widget;

  const columns = readPositiveInteger(widget.columns) ?? 1;
  let nextCol = 0;
  let nextRow = 0;
  const nextChildren = children.map((child) => {
    const span = Math.min(readPositiveInteger(child.colSpan) ?? 1, columns);
    if (nextCol + span > columns) {
      nextCol = 0;
      nextRow += 1;
    }

    const nextChild: GenericWidget = {
      ...child,
      col: nextCol,
      row: nextRow,
      ...(isFiniteNumber(child.colSpan) ? { colSpan: span } : {}),
    };

    nextCol += span;
    if (nextCol >= columns) {
      nextCol = 0;
      nextRow += 1;
    }

    return nextChild;
  });

  return {
    ...widget,
    children: nextChildren,
  };
}

export function normalizeWidgetForParent(
  widget: GenericWidget,
  parent: GenericWidget,
  options: NormalizeWidgetOptions = {},
): GenericWidget {
  let next = stripExternalPlacement({ ...widget }, parent.type);

  if (parent.type === 'grid' && !hasGridPlacement(next)) {
    next = assignGridSlot(parent, next);
  }

  if (options.preserveInternalLayout) {
    return next;
  }

  return normalizeWidgetSubtree(next, parent.type);
}

export function normalizeWidgetSubtree(
  widget: GenericWidget,
  parentType?: string | null,
  options: NormalizeWidgetOptions = {},
): GenericWidget {
  const next = parentType ? stripExternalPlacement({ ...widget }, parentType) : { ...widget };

  if (options.preserveInternalLayout) {
    return next;
  }

  const children = getWidgetChildren(next);
  const child = isGenericWidget(next.child) ? next.child : null;
  if (children.length === 0 && child === null) {
    return next;
  }

  const normalizedChildren = children.map((child) => normalizeWidgetSubtree(child, next.type));
  const withChildren: GenericWidget = {
    ...next,
    ...(children.length > 0 ? { children: normalizedChildren } : {}),
    ...(child ? { child: normalizeWidgetSubtree(child, next.type) } : {}),
  };

  return ensureGridChildPlacements(withChildren);
}

export function resolvePlacementPolicy(
  policy: WidgetPlacementPolicy | undefined,
  kind: WidgetPlacementAssetKind | undefined,
): WidgetPlacementPolicy {
  if (policy) {
    return policy;
  }

  if (kind === 'template') {
    return 'preserve-internal-layout';
  }

  if (kind === 'container') {
    return 'preserve-internal-layout';
  }

  return 'rematerialize-grid-slot';
}

export function normalizeWidgetForPlacementPolicy(
  widget: GenericWidget,
  parent: GenericWidget,
  policy: WidgetPlacementPolicy,
): GenericWidget {
  switch (policy) {
    case 'preserve-internal-layout':
      return normalizeWidgetForParent(widget, parent, { preserveInternalLayout: true });
    case 'rematerialize-grid-slot': {
      const stripped = stripExternalPlacement({ ...widget }, parent.type);
      return parent.type === 'grid' ? assignGridSlot(parent, stripped) : stripped;
    }
    default:
      return widget;
  }
}
