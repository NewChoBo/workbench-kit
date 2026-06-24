import { appendBoxChildPath, appendChildrenPath, widgetPathEquals } from '../path.js';
import type { WidgetPath } from '../path.js';
import type { WidgetPatch } from '../widget-patch.js';
import { getWidgetAtPath } from '../widget-tree.js';
import type { GenericWidget } from '../widget-tree.js';
import type { LayoutNodeResult } from './layout-widget.js';
import type { Rect } from './types.js';

export interface LayoutPoint {
  readonly x: number;
  readonly y: number;
}

export interface LayoutHitTestResult {
  readonly node: LayoutNodeResult;
  readonly path: WidgetPath;
}

export interface WidgetDragMappingOptions {
  readonly deltaX: number;
  readonly deltaY: number;
  readonly layout: LayoutNodeResult;
  readonly path: WidgetPath;
  readonly root: GenericWidget;
}

export type WidgetResizeHandlePosition = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export interface WidgetResizeMappingOptions {
  readonly deltaX: number;
  readonly deltaY: number;
  readonly layout: LayoutNodeResult;
  readonly minHeight?: number | undefined;
  readonly minWidth?: number | undefined;
  readonly path: WidgetPath;
  readonly position: WidgetResizeHandlePosition;
  readonly root: GenericWidget;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function containsPoint(rect: Rect, point: LayoutPoint): boolean {
  return (
    point.x >= rect.x &&
    point.y >= rect.y &&
    point.x <= rect.x + rect.width &&
    point.y <= rect.y + rect.height
  );
}

function childPath(parentWidget: GenericWidget, parentPath: WidgetPath, index: number): WidgetPath {
  if (Array.isArray(parentWidget.children)) {
    return appendChildrenPath(parentPath, index);
  }

  if (parentWidget.child && typeof parentWidget.child === 'object') {
    return appendBoxChildPath(parentPath);
  }

  return appendChildrenPath(parentPath, index);
}

export function hitTestLayoutTree(
  node: LayoutNodeResult,
  point: LayoutPoint,
  path: WidgetPath = [],
): LayoutHitTestResult | null {
  if (!containsPoint(node.rect, point)) return null;

  for (let index = node.children.length - 1; index >= 0; index -= 1) {
    const child = node.children[index];
    if (!child) continue;

    const childHit = hitTestLayoutTree(child, point, childPath(node.widget, path, index));
    if (childHit) return childHit;
  }

  return { node, path };
}

export function findLayoutNodeByPath(
  node: LayoutNodeResult,
  targetPath: WidgetPath,
  path: WidgetPath = [],
): LayoutHitTestResult | null {
  if (widgetPathEquals(path, targetPath)) {
    return { node, path };
  }

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    if (!child) continue;

    const found = findLayoutNodeByPath(child, targetPath, childPath(node.widget, path, index));
    if (found) return found;
  }

  return null;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createStackDragPatch(
  child: GenericWidget,
  childNode: LayoutNodeResult,
  parentNode: LayoutNodeResult,
  path: WidgetPath,
  deltaX: number,
  deltaY: number,
): WidgetPatch {
  const nextLeft = childNode.rect.x - parentNode.rect.x + deltaX;
  const nextTop = childNode.rect.y - parentNode.rect.y + deltaY;
  const next: GenericWidget = {
    ...child,
    left: nextLeft,
    top: nextTop,
  };

  if (isFiniteNumber(child.right)) {
    next.right = parentNode.rect.width - nextLeft - childNode.rect.width;
  }

  if (isFiniteNumber(child.bottom)) {
    next.bottom = parentNode.rect.height - nextTop - childNode.rect.height;
  }

  return {
    type: 'replace-widget',
    path,
    widget: next,
  };
}

function createStackResizePatch(
  child: GenericWidget,
  childNode: LayoutNodeResult,
  parentNode: LayoutNodeResult,
  path: WidgetPath,
  position: WidgetResizeHandlePosition,
  deltaX: number,
  deltaY: number,
  minWidth: number,
  minHeight: number,
): WidgetPatch {
  const left = childNode.rect.x - parentNode.rect.x;
  const top = childNode.rect.y - parentNode.rect.y;
  const right = parentNode.rect.width - left - childNode.rect.width;
  const bottom = parentNode.rect.height - top - childNode.rect.height;
  let nextLeft = left;
  let nextTop = top;
  let nextWidth = childNode.rect.width;
  let nextHeight = childNode.rect.height;

  if (position.includes('e')) {
    nextWidth = Math.max(minWidth, childNode.rect.width + deltaX);
  }
  if (position.includes('s')) {
    nextHeight = Math.max(minHeight, childNode.rect.height + deltaY);
  }
  if (position.includes('w')) {
    nextWidth = Math.max(minWidth, childNode.rect.width - deltaX);
    nextLeft = left + childNode.rect.width - nextWidth;
  }
  if (position.includes('n')) {
    nextHeight = Math.max(minHeight, childNode.rect.height - deltaY);
    nextTop = top + childNode.rect.height - nextHeight;
  }

  return {
    type: 'replace-widget',
    path,
    widget: {
      ...child,
      left: nextLeft,
      top: nextTop,
      right: position.includes('w') ? right : parentNode.rect.width - nextLeft - nextWidth,
      bottom: position.includes('n') ? bottom : parentNode.rect.height - nextTop - nextHeight,
    },
  };
}

function readGridPlacementAtPoint(
  parent: GenericWidget,
  parentRect: Rect,
  point: LayoutPoint,
  child: GenericWidget,
): Pick<GenericWidget, 'col' | 'row'> | null {
  const columns = Math.max(1, isFiniteNumber(parent.columns) ? parent.columns : 2);
  const gap = isFiniteNumber(parent.gap) ? parent.gap : 0;
  const padding = isFiniteNumber(parent.padding) ? parent.padding : 0;
  const rows = isFiniteNumber(parent.rows) && parent.rows > 0 ? parent.rows : undefined;
  const colSpan = isFiniteNumber(child.colSpan) ? child.colSpan : 1;
  const rowSpan = isFiniteNumber(child.rowSpan) ? child.rowSpan : 1;
  const cellWidth = (parentRect.width - padding * 2 - gap * (columns - 1)) / columns;
  const cellHeight = rows ? (parentRect.height - padding * 2 - gap * (rows - 1)) / rows : cellWidth;

  if (cellWidth <= 0 || cellHeight <= 0) return null;

  const relativeX = point.x - parentRect.x - padding;
  const relativeY = point.y - parentRect.y - padding;
  const maxCol = Math.max(0, columns - colSpan);
  const maxRow = rows ? Math.max(0, rows - rowSpan) : Number.POSITIVE_INFINITY;
  const col = clampNumber(Math.floor(relativeX / (cellWidth + gap)), 0, maxCol);
  const row = clampNumber(Math.floor(relativeY / (cellHeight + gap)), 0, maxRow);

  return {
    col,
    row,
  };
}

function createGridDragPatch(
  parent: GenericWidget,
  child: GenericWidget,
  childNode: LayoutNodeResult,
  parentNode: LayoutNodeResult,
  path: WidgetPath,
  deltaX: number,
  deltaY: number,
): WidgetPatch | null {
  const nextCenter = {
    x: childNode.rect.x + childNode.rect.width / 2 + deltaX,
    y: childNode.rect.y + childNode.rect.height / 2 + deltaY,
  };
  const placement = readGridPlacementAtPoint(parent, parentNode.rect, nextCenter, child);
  if (!placement) return null;

  return {
    type: 'replace-widget',
    path,
    widget: {
      ...child,
      ...placement,
    },
  };
}

export function createWidgetDragPatch({
  deltaX,
  deltaY,
  layout,
  path,
  root,
}: WidgetDragMappingOptions): WidgetPatch | null {
  const segment = path[path.length - 1];
  if (!segment || segment.kind !== 'children') return null;

  const parentPath = path.slice(0, -1);
  const parent = getWidgetAtPath(root, parentPath);
  const child = getWidgetAtPath(root, path);
  const parentNode = findLayoutNodeByPath(layout, parentPath);
  const childNode = findLayoutNodeByPath(layout, path);
  if (!parent || !child || !parentNode || !childNode) return null;

  if (parent.type === 'stack') {
    return createStackDragPatch(child, childNode.node, parentNode.node, path, deltaX, deltaY);
  }

  if (parent.type === 'grid') {
    return createGridDragPatch(
      parent,
      child,
      childNode.node,
      parentNode.node,
      path,
      deltaX,
      deltaY,
    );
  }

  return null;
}

export function createWidgetResizePatch({
  deltaX,
  deltaY,
  layout,
  minHeight = 1,
  minWidth = 1,
  path,
  position,
  root,
}: WidgetResizeMappingOptions): WidgetPatch | null {
  const segment = path[path.length - 1];
  if (!segment || segment.kind !== 'children') return null;

  const parentPath = path.slice(0, -1);
  const parent = getWidgetAtPath(root, parentPath);
  const child = getWidgetAtPath(root, path);
  const parentNode = findLayoutNodeByPath(layout, parentPath);
  const childNode = findLayoutNodeByPath(layout, path);
  if (!parent || !child || !parentNode || !childNode) return null;

  if (parent.type !== 'stack') return null;

  return createStackResizePatch(
    child,
    childNode.node,
    parentNode.node,
    path,
    position,
    deltaX,
    deltaY,
    minWidth,
    minHeight,
  );
}
