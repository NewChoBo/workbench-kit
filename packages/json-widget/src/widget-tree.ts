import type { WidgetTypeShape } from '@workbench-kit/contracts';

import type { WidgetPath, WidgetPathSegment } from './path.js';
import { appendBoxChildPath, appendChildrenPath, ROOT_WIDGET_PATH } from './path.js';
import type { ArrayChildWidget } from './widget-child-ops.js';
import {
  getChildren,
  insertArrayChild,
  removeArrayChild,
  replaceArrayChild,
  reorderArrayChild,
} from './widget-child-ops.js';

export type GenericWidget = WidgetTypeShape & Record<string, unknown>;

export interface WidgetNode {
  readonly widget: GenericWidget;
  readonly path: WidgetPath;
  readonly parent: GenericWidget | null;
  readonly parentPath: WidgetPath | null;
}

export interface WidgetTreeEditResult {
  readonly root: GenericWidget;
  readonly changed: boolean;
}

function isGenericWidget(value: unknown): value is GenericWidget {
  return (
    value !== null &&
    !Array.isArray(value) &&
    typeof value === 'object' &&
    typeof (value as WidgetTypeShape).type === 'string'
  );
}

export function getWidgetChildren(widget: GenericWidget): readonly GenericWidget[] {
  const children = widget.children;
  if (!Array.isArray(children)) return [];
  return children.filter(isGenericWidget);
}

export function getWidgetChildAtSegment(
  widget: GenericWidget,
  segment: WidgetPathSegment,
): GenericWidget | null {
  if (segment.kind === 'child') {
    return isGenericWidget(widget.child) ? widget.child : null;
  }

  return getWidgetChildren(widget)[segment.index] ?? null;
}

export function getWidgetAtPath(root: GenericWidget, path: WidgetPath): GenericWidget | null {
  let current: GenericWidget | null = root;

  for (const segment of path) {
    current = current ? getWidgetChildAtSegment(current, segment) : null;
  }

  return current;
}

function replaceDescendant(
  current: GenericWidget,
  path: WidgetPath,
  depth: number,
  next: GenericWidget,
): GenericWidget | null {
  const segment = path[depth];
  if (!segment) return next;

  const child = getWidgetChildAtSegment(current, segment);
  if (!child) return null;

  const replacement = replaceDescendant(child, path, depth + 1, next);
  if (!replacement) return null;

  if (segment.kind === 'child') {
    return isGenericWidget(current.child) || current.type === 'box'
      ? { ...current, child: replacement }
      : null;
  }

  return replaceArrayChild(current, segment.index, replacement);
}

export function replaceWidgetAtPath(
  root: GenericWidget,
  path: WidgetPath,
  next: GenericWidget,
): WidgetTreeEditResult {
  const updated = replaceDescendant(root, path, 0, next);
  if (!updated || updated === root) return { root, changed: false };
  return { root: updated, changed: true };
}

export function updateWidgetAtPath(
  root: GenericWidget,
  path: WidgetPath,
  update: (widget: GenericWidget) => GenericWidget,
): WidgetTreeEditResult {
  const current = getWidgetAtPath(root, path);
  if (!current) return { root, changed: false };

  const next = update(current);
  if (next === current) return { root, changed: false };
  return replaceWidgetAtPath(root, path, next);
}

export function insertWidgetChildAtPath(
  root: GenericWidget,
  parentPath: WidgetPath,
  index: number,
  child: ArrayChildWidget,
): WidgetTreeEditResult {
  return updateWidgetAtPath(
    root,
    parentPath,
    (parent) => insertArrayChild(parent, index, child) ?? parent,
  );
}

export function setBoxChildAtPath(
  root: GenericWidget,
  boxPath: WidgetPath,
  child: GenericWidget | undefined,
): WidgetTreeEditResult {
  return updateWidgetAtPath(root, boxPath, (box) => {
    if (!isGenericWidget(box.child) && box.type !== 'box' && !('child' in box)) return box;
    if (child === undefined) {
      if (!box.child) return box;
      const { child: _removedChild, ...next } = box;
      return next;
    }

    return box.child === child ? box : { ...box, child };
  });
}

export function removeWidgetAtPath(root: GenericWidget, path: WidgetPath): WidgetTreeEditResult {
  const segment = path[path.length - 1];
  if (!segment) return { root, changed: false };

  const parentPath = path.slice(0, -1);
  if (segment.kind === 'child') return setBoxChildAtPath(root, parentPath, undefined);

  return updateWidgetAtPath(
    root,
    parentPath,
    (parent) => removeArrayChild(parent, segment.index) ?? parent,
  );
}

export function reorderWidgetChildAtPath(
  root: GenericWidget,
  parentPath: WidgetPath,
  fromIndex: number,
  toIndex: number,
): WidgetTreeEditResult {
  return updateWidgetAtPath(
    root,
    parentPath,
    (parent) => reorderArrayChild(parent, fromIndex, toIndex) ?? parent,
  );
}

export function collectWidgetNodes(root: GenericWidget): WidgetNode[] {
  const nodes: WidgetNode[] = [];

  const visit = (
    widget: GenericWidget,
    path: WidgetPath,
    parent: GenericWidget | null,
    parentPath: WidgetPath | null,
  ): void => {
    nodes.push({ widget, path, parent, parentPath });

    getChildren(widget).forEach((child, index) => {
      visit(child, appendChildrenPath(path, index), widget, path);
    });

    if (widget.type === 'box' && isGenericWidget(widget.child)) {
      visit(widget.child, appendBoxChildPath(path), widget, path);
    } else if (isGenericWidget(widget.child)) {
      visit(widget.child, appendBoxChildPath(path), widget, path);
    }
  };

  visit(root, ROOT_WIDGET_PATH, null, null);
  return nodes;
}

export function reparentWidgetAtPath(
  root: GenericWidget,
  fromPath: WidgetPath,
  toParentPath: WidgetPath,
  insertIndex: number,
): WidgetTreeEditResult {
  const child = getWidgetAtPath(root, fromPath);
  if (!child) return { root, changed: false };

  if (toParentPath.length >= fromPath.length) {
    const isSubPath = fromPath.every((seg, idx) => {
      const otherSeg = toParentPath[idx];
      if (!otherSeg) return false;
      if (seg.kind !== otherSeg.kind) return false;
      if (seg.kind === 'children' && otherSeg.kind === 'children') {
        return seg.index === otherSeg.index;
      }
      return true;
    });
    if (isSubPath) return { root, changed: false };
  }

  const fromParentPath = fromPath.slice(0, -1);
  const isSameParent =
    fromParentPath.length === toParentPath.length &&
    fromParentPath.every((seg, idx) => {
      const otherSeg = toParentPath[idx];
      return (
        seg.kind === otherSeg?.kind &&
        (seg.kind !== 'children' || seg.index === (otherSeg as { index: number }).index)
      );
    });

  const fromSeg = fromPath[fromPath.length - 1];
  if (isSameParent && fromSeg && fromSeg.kind === 'children') {
    const fromIndex = fromSeg.index;
    const reorderIndex = insertIndex > fromIndex ? insertIndex - 1 : insertIndex;
    if (fromIndex === reorderIndex) return { root, changed: false };
    return reorderWidgetChildAtPath(root, fromParentPath, fromIndex, reorderIndex);
  }

  const removeResult = removeWidgetAtPath(root, fromPath);
  if (!removeResult.changed) return { root, changed: false };

  const adjustedToParentPath = toParentPath.map((seg, depth) => {
    if (seg.kind !== 'children') return seg;
    if (fromPath.length > depth) {
      const fromPathSeg = fromPath[depth];
      if (fromPathSeg && fromPathSeg.kind === 'children') {
        const match = fromPath.slice(0, depth).every((s, i) => {
          const ts = toParentPath[i];
          return (
            s.kind === ts?.kind &&
            (s.kind !== 'children' || s.index === (ts as { index: number }).index)
          );
        });
        if (match && fromPathSeg.index < seg.index) {
          return { kind: 'children', index: seg.index - 1 } as const;
        }
      }
    }
    return seg;
  });

  return insertWidgetChildAtPath(removeResult.root, adjustedToParentPath, insertIndex, child);
}

export function getWidgetDisplayLabel(widget: GenericWidget): string {
  const id = widget.id;
  if (typeof id === 'string' && id.trim().length > 0) {
    return `${widget.type} (${id})`;
  }
  return widget.type;
}
