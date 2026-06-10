import type { WidgetPlacementAssetKind, WidgetPlacementPolicy } from '@workbench-kit/contracts';

import { getWidgetChildren, type GenericWidget } from './widget-tree.js';

const GRID_PLACEMENT_KEYS = ['col', 'row', 'colSpan', 'rowSpan'] as const;
const LINEAR_PLACEMENT_KEYS = ['flex', 'align'] as const;
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
  if (children.length === 0) {
    return next;
  }

  const normalizedChildren = children.map((child) => normalizeWidgetSubtree(child, next.type));
  return {
    ...next,
    children: normalizedChildren,
  };
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
    return 'strip-external-placement';
  }

  return 'rematerialize-grid-slot';
}

export function normalizeWidgetForPlacementPolicy(
  widget: GenericWidget,
  parent: GenericWidget,
  policy: WidgetPlacementPolicy,
): GenericWidget {
  switch (policy) {
    case 'as-root':
      return parent.type === 'grid' && !hasGridPlacement(widget)
        ? assignGridSlot(parent, { ...widget })
        : { ...widget };
    case 'strip-external-placement':
      return normalizeWidgetForParent(widget, parent, { preserveInternalLayout: true });
    case 'rematerialize-grid-slot': {
      const stripped = stripExternalPlacement({ ...widget }, parent.type);
      return parent.type === 'grid' ? assignGridSlot(parent, stripped) : stripped;
    }
    case 'preserve-internal-layout':
      return normalizeWidgetForParent(widget, parent, { preserveInternalLayout: true });
    default:
      return widget;
  }
}
