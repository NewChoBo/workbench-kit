import type { WidgetTypeShape } from '@workbench-kit/contracts';

import type { WidgetPath, WidgetPathSegment } from './path.js';
import { appendBoxChildPath, appendChildrenPath, ROOT_WIDGET_PATH } from './path.js';

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
    return { ...current, child: replacement };
  }

  const children = getWidgetChildren(current);
  const nextChildren = children.map((entry, index) =>
    index === segment.index ? replacement : entry,
  );
  return { ...current, children: nextChildren };
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

export function collectWidgetNodes(root: GenericWidget): WidgetNode[] {
  const nodes: WidgetNode[] = [];

  const visit = (
    widget: GenericWidget,
    path: WidgetPath,
    parent: GenericWidget | null,
    parentPath: WidgetPath | null,
  ): void => {
    nodes.push({ widget, path, parent, parentPath });

    getWidgetChildren(widget).forEach((child, index) => {
      visit(child, appendChildrenPath(path, index), widget, path);
    });

    if (isGenericWidget(widget.child)) {
      visit(widget.child, appendBoxChildPath(path), widget, path);
    }
  };

  visit(root, ROOT_WIDGET_PATH, null, null);
  return nodes;
}

export function getWidgetDisplayLabel(widget: GenericWidget): string {
  const id = widget.id;
  if (typeof id === 'string' && id.trim().length > 0) {
    return `${widget.type} (${id})`;
  }
  return widget.type;
}
