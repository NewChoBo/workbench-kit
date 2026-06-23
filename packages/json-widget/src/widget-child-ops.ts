import type { WidgetPath, WidgetPathSegment } from './path.js';
import { appendBoxChildPath, appendChildrenPath, widgetPathKey } from './path.js';
import type { GenericWidget } from './widget-tree.js';
import { getWidgetChildAtSegment, getWidgetChildren } from './widget-tree.js';

export type ArrayChildWidget = GenericWidget;

const GRID_PLACEMENT_KEYS = ['colSpan', 'rowSpan'] as const;
const LINEAR_PLACEMENT_KEYS = ['flex', 'flexFit', 'align'] as const;
const STACK_PLACEMENT_KEYS = ['left', 'top', 'right', 'bottom'] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isGridChild(child: GenericWidget): child is GenericWidget & { col: number; row: number } {
  return isFiniteNumber(child.col) && isFiniteNumber(child.row);
}

function copyOptionalPlacement<T extends GenericWidget, K extends keyof T>(
  source: T,
  target: GenericWidget,
  keys: readonly K[],
): GenericWidget {
  const placement: Partial<Pick<T, K>> = {};

  for (const key of keys) {
    const value = source[key];
    if (value !== undefined) {
      placement[key] = value;
    }
  }

  return { ...target, ...placement };
}

function insertAtIndex<T>(items: readonly T[], index: number, item: T): T[] {
  return [...items.slice(0, index), item, ...items.slice(index)];
}

function removeAtIndex<T>(items: readonly T[], index: number): T[] {
  return [...items.slice(0, index), ...items.slice(index + 1)];
}

function isSingleChildContainerType(type: string): boolean {
  return (
    type === 'box' ||
    type === 'container' ||
    type === 'padding' ||
    type === 'align' ||
    type === 'center' ||
    type === 'sized_box'
  );
}

function containerKind(
  widget: GenericWidget,
): 'grid' | 'linear' | 'stack' | 'array' | 'box' | null {
  switch (widget.type) {
    case 'grid':
      return 'grid';
    case 'row':
    case 'column':
      return 'linear';
    case 'stack':
      return 'stack';
    case 'list-view':
      return 'array';
    default:
      if (isSingleChildContainerType(widget.type)) return 'box';
      if (isGenericWidget(widget.child)) return 'box';
      if (Array.isArray(widget.children)) return 'array';
      return null;
  }
}

export function getChildAtSegment(
  widget: GenericWidget,
  segment: WidgetPathSegment,
): GenericWidget | null {
  return getWidgetChildAtSegment(widget, segment);
}

export function getChildren(widget: GenericWidget): readonly GenericWidget[] {
  return getWidgetChildren(widget);
}

export function replaceArrayChild(
  parent: GenericWidget,
  index: number,
  next: GenericWidget,
): GenericWidget | null {
  const current = getWidgetChildren(parent)[index];
  if (!current) return null;

  switch (containerKind(parent)) {
    case 'grid': {
      const replacement = {
        ...copyOptionalPlacement(current, next, GRID_PLACEMENT_KEYS),
        col: current.col,
        row: current.row,
      };
      return {
        ...parent,
        children: getWidgetChildren(parent).map((child, childIndex) =>
          childIndex === index ? replacement : child,
        ),
      };
    }
    case 'linear': {
      const replacement = copyOptionalPlacement(current, next, LINEAR_PLACEMENT_KEYS);
      return {
        ...parent,
        children: getWidgetChildren(parent).map((child, childIndex) =>
          childIndex === index ? replacement : child,
        ),
      };
    }
    case 'stack': {
      const replacement = copyOptionalPlacement(current, next, STACK_PLACEMENT_KEYS);
      return {
        ...parent,
        children: getWidgetChildren(parent).map((child, childIndex) =>
          childIndex === index ? replacement : child,
        ),
      };
    }
    case 'array':
      return {
        ...parent,
        children: getWidgetChildren(parent).map((child, childIndex) =>
          childIndex === index ? next : child,
        ),
      };
    default:
      return null;
  }
}

export function insertArrayChild(
  parent: GenericWidget,
  index: number,
  child: ArrayChildWidget,
): GenericWidget | null {
  const insertAt = (children: readonly GenericWidget[]): number | null =>
    index >= 0 && index <= children.length ? index : null;

  switch (containerKind(parent)) {
    case 'grid': {
      const targetIndex = insertAt(getWidgetChildren(parent));
      if (targetIndex === null || !isGridChild(child)) return null;
      return {
        ...parent,
        children: insertAtIndex(getWidgetChildren(parent), targetIndex, child),
      };
    }
    case 'linear': {
      const targetIndex = insertAt(getWidgetChildren(parent));
      if (targetIndex === null) return null;
      return {
        ...parent,
        children: insertAtIndex(getWidgetChildren(parent), targetIndex, child),
      };
    }
    case 'stack': {
      const targetIndex = insertAt(getWidgetChildren(parent));
      if (targetIndex === null) return null;
      return {
        ...parent,
        children: insertAtIndex(getWidgetChildren(parent), targetIndex, child),
      };
    }
    case 'array': {
      const targetIndex = insertAt(getWidgetChildren(parent));
      if (targetIndex === null) return null;
      return {
        ...parent,
        children: insertAtIndex(getWidgetChildren(parent), targetIndex, child),
      };
    }
    case 'box': {
      if (index !== 0 || isGenericWidget(parent.child)) return null;
      return { ...parent, child };
    }
    default:
      return null;
  }
}

export function removeArrayChild(parent: GenericWidget, index: number): GenericWidget | null {
  if (!getWidgetChildren(parent)[index]) return null;

  switch (containerKind(parent)) {
    case 'grid':
    case 'linear':
    case 'stack':
    case 'array':
      return {
        ...parent,
        children: removeAtIndex(getWidgetChildren(parent), index),
      };
    default:
      return null;
  }
}

export function reorderArrayChild(
  parent: GenericWidget,
  fromIndex: number,
  toIndex: number,
): GenericWidget | null {
  const reorder = <T>(children: readonly T[]): T[] | null => {
    const child = children[fromIndex];
    if (!child || toIndex < 0 || toIndex >= children.length) return null;
    if (fromIndex === toIndex) return null;

    const withoutSource = removeAtIndex(children, fromIndex);
    return insertAtIndex(withoutSource, toIndex, child);
  };

  switch (containerKind(parent)) {
    case 'grid':
    case 'linear':
    case 'stack':
    case 'array': {
      const children = reorder(getWidgetChildren(parent));
      return children ? { ...parent, children } : null;
    }
    default:
      return null;
  }
}

export function isContainerWidget(widget: GenericWidget): boolean {
  return containerKind(widget) !== null;
}

export function collectAllContainerKeys(
  widget: GenericWidget,
  path: WidgetPath,
  keys: Set<string> = new Set(),
): Set<string> {
  const key = widgetPathKey(path);
  if (isContainerWidget(widget)) {
    keys.add(key);
  }

  if (widget.type === 'box' && isGenericWidget(widget.child)) {
    collectAllContainerKeys(widget.child, appendBoxChildPath(path), keys);
  } else if (isGenericWidget(widget.child)) {
    collectAllContainerKeys(widget.child, appendBoxChildPath(path), keys);
  } else {
    getWidgetChildren(widget).forEach((child, index) => {
      collectAllContainerKeys(child, appendChildrenPath(path, index), keys);
    });
  }

  return keys;
}

function isGenericWidget(value: unknown): value is GenericWidget {
  return (
    value !== null &&
    !Array.isArray(value) &&
    typeof value === 'object' &&
    typeof (value as GenericWidget).type === 'string'
  );
}
