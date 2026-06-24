import { appendBoxChildPath, appendChildrenPath, widgetPathEquals } from '../path.js';
import type { WidgetPath } from '../path.js';
import type { WidgetPatch } from '../widget-patch.js';
import { getWidgetAtPath, getWidgetChildren } from '../widget-tree.js';
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

export interface WidgetReparentMappingOptions {
  readonly deltaX: number;
  readonly deltaY: number;
  readonly layout: LayoutNodeResult;
  readonly path: WidgetPath;
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

function readPositiveInteger(value: unknown): number | null {
  if (!isFiniteNumber(value) || value < 1) return null;
  return Math.floor(value);
}

function pathStartsWith(path: WidgetPath, prefix: WidgetPath): boolean {
  if (prefix.length > path.length) return false;
  return prefix.every((segment, index) => {
    const candidate = path[index];
    if (!candidate || candidate.kind !== segment.kind) return false;
    if (segment.kind === 'child') return true;
    return candidate.kind === 'children' && candidate.index === segment.index;
  });
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

function canReceiveReparentedChild(widget: GenericWidget): boolean {
  if (isSingleChildContainerType(widget.type)) {
    return widget.child === undefined;
  }

  return (
    widget.type === 'grid' ||
    widget.type === 'row' ||
    widget.type === 'column' ||
    widget.type === 'stack' ||
    widget.type === 'list-view' ||
    Array.isArray(widget.children)
  );
}

function reparentInsertIndex(widget: GenericWidget): number {
  return isSingleChildContainerType(widget.type) ? 0 : getWidgetChildren(widget).length;
}

function findReparentTarget(
  root: GenericWidget,
  hitPath: WidgetPath,
  sourcePath: WidgetPath,
): { readonly path: WidgetPath; readonly insertIndex: number } | null {
  const sourceParentPath = sourcePath.slice(0, -1);

  for (let depth = hitPath.length; depth >= 0; depth -= 1) {
    const candidatePath = hitPath.slice(0, depth);
    if (widgetPathEquals(candidatePath, sourceParentPath)) continue;
    if (pathStartsWith(candidatePath, sourcePath)) continue;

    const candidate = getWidgetAtPath(root, candidatePath);
    if (!candidate || !canReceiveReparentedChild(candidate)) continue;

    return {
      path: candidatePath,
      insertIndex: reparentInsertIndex(candidate),
    };
  }

  return null;
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

interface GridSlotSpan {
  readonly colSpan: number;
  readonly rowSpan: number;
}

interface GridSlotPlacement {
  readonly col: number;
  readonly row: number;
}

interface GridSlotPlacementWriteOptions {
  readonly writeColSpan?: boolean | undefined;
  readonly writeRowSpan?: boolean | undefined;
}

function readGridPlacementAtPoint(
  parent: GenericWidget,
  parentRect: Rect,
  point: LayoutPoint,
  child: GenericWidget,
): GridSlotPlacement | null {
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

function gridCellKey(col: number, row: number): string {
  return `${col}:${row}`;
}

function readGridSlotSpan(child: GenericWidget, columns: number): GridSlotSpan {
  return {
    colSpan: Math.min(readPositiveInteger(child.colSpan) ?? 1, columns),
    rowSpan: readPositiveInteger(child.rowSpan) ?? 1,
  };
}

function readGridSlotPlacement(
  child: GenericWidget,
  fallbackIndex: number,
  columns: number,
  span: GridSlotSpan,
): GridSlotPlacement {
  const maxCol = Math.max(0, columns - span.colSpan);
  const col = isFiniteNumber(child.col)
    ? clampNumber(Math.floor(child.col), 0, maxCol)
    : fallbackIndex % columns;
  const row = isFiniteNumber(child.row)
    ? Math.max(0, Math.floor(child.row))
    : Math.floor(fallbackIndex / columns);

  return { col, row };
}

function gridSlotIndex(placement: GridSlotPlacement, columns: number): number {
  return placement.row * columns + placement.col;
}

function gridSlotConflicts(
  occupied: ReadonlySet<string>,
  placement: GridSlotPlacement,
  span: GridSlotSpan,
): boolean {
  for (let rowOffset = 0; rowOffset < span.rowSpan; rowOffset += 1) {
    for (let colOffset = 0; colOffset < span.colSpan; colOffset += 1) {
      if (occupied.has(gridCellKey(placement.col + colOffset, placement.row + rowOffset))) {
        return true;
      }
    }
  }

  return false;
}

function occupyGridSlot(
  occupied: Set<string>,
  placement: GridSlotPlacement,
  span: GridSlotSpan,
): void {
  for (let rowOffset = 0; rowOffset < span.rowSpan; rowOffset += 1) {
    for (let colOffset = 0; colOffset < span.colSpan; colOffset += 1) {
      occupied.add(gridCellKey(placement.col + colOffset, placement.row + rowOffset));
    }
  }
}

function nextFreeGridSlot(
  occupied: ReadonlySet<string>,
  startSlot: number,
  columns: number,
  span: GridSlotSpan,
  childCount: number,
): GridSlotPlacement {
  const start = Math.max(0, startSlot);
  const maxSearch = Math.max(columns * (childCount + 16) * Math.max(1, span.rowSpan), columns * 64);

  for (let slot = start; slot <= start + maxSearch; slot += 1) {
    const placement = {
      col: slot % columns,
      row: Math.floor(slot / columns),
    };
    if (placement.col + span.colSpan > columns) continue;
    if (!gridSlotConflicts(occupied, placement, span)) return placement;
  }

  return {
    col: 0,
    row: Math.floor((start + maxSearch) / columns) + 1,
  };
}

function withGridSlotPlacement(
  child: GenericWidget,
  placement: GridSlotPlacement,
  span: GridSlotSpan,
  options: GridSlotPlacementWriteOptions = {},
): GenericWidget {
  return {
    ...child,
    col: placement.col,
    row: placement.row,
    ...(options.writeColSpan || isFiniteNumber(child.colSpan) ? { colSpan: span.colSpan } : {}),
    ...(options.writeRowSpan || isFiniteNumber(child.rowSpan) ? { rowSpan: span.rowSpan } : {}),
  };
}

function reflowGridChildrenAroundSlot(
  parent: GenericWidget,
  selectedIndex: number,
  targetPlacement: GridSlotPlacement,
  targetSpan?: GridSlotSpan,
  selectedWriteOptions?: GridSlotPlacementWriteOptions,
): GenericWidget {
  const children = getWidgetChildren(parent);
  const selected = children[selectedIndex];
  if (!selected || parent.type !== 'grid') return parent;

  const columns = Math.max(1, readPositiveInteger(parent.columns) ?? 2);
  const selectedSpan = targetSpan ?? readGridSlotSpan(selected, columns);
  const occupied = new Set<string>();
  occupyGridSlot(occupied, targetPlacement, selectedSpan);

  const nextChildren = [...children];
  nextChildren[selectedIndex] = withGridSlotPlacement(
    selected,
    targetPlacement,
    selectedSpan,
    selectedWriteOptions,
  );

  children.forEach((child, index) => {
    if (index === selectedIndex) return;

    const span = readGridSlotSpan(child, columns);
    const currentPlacement = readGridSlotPlacement(child, index, columns, span);
    const placement = gridSlotConflicts(occupied, currentPlacement, span)
      ? nextFreeGridSlot(
          occupied,
          gridSlotIndex(currentPlacement, columns),
          columns,
          span,
          children.length,
        )
      : currentPlacement;

    occupyGridSlot(occupied, placement, span);
    nextChildren[index] = withGridSlotPlacement(child, placement, span);
  });

  return {
    ...parent,
    children: nextChildren,
  };
}

function isGridSlotOccupied(
  parent: GenericWidget,
  selectedIndex: number,
  targetPlacement: GridSlotPlacement,
  selectedSpan: GridSlotSpan,
): boolean {
  const children = getWidgetChildren(parent);
  return children.some((child, index) => {
    if (index === selectedIndex) return false;
    const span = readGridSlotSpan(child, Math.max(1, readPositiveInteger(parent.columns) ?? 2));
    const placement = readGridSlotPlacement(
      child,
      index,
      Math.max(1, readPositiveInteger(parent.columns) ?? 2),
      span,
    );
    const occupied = new Set<string>();
    occupyGridSlot(occupied, placement, span);
    return gridSlotConflicts(occupied, targetPlacement, selectedSpan);
  });
}

function createGridDragPatch(
  parent: GenericWidget,
  child: GenericWidget,
  childNode: LayoutNodeResult,
  parentNode: LayoutNodeResult,
  parentPath: WidgetPath,
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

  const segment = path[path.length - 1];
  const selectedIndex = segment?.kind === 'children' ? segment.index : -1;
  const columns = Math.max(1, readPositiveInteger(parent.columns) ?? 2);
  const selectedSpan = readGridSlotSpan(child, columns);
  if (selectedIndex >= 0 && isGridSlotOccupied(parent, selectedIndex, placement, selectedSpan)) {
    return {
      type: 'replace-widget',
      path: parentPath,
      widget: reflowGridChildrenAroundSlot(parent, selectedIndex, placement),
    };
  }

  return {
    type: 'replace-widget',
    path,
    widget: {
      ...child,
      ...placement,
    },
  };
}

function readGridResizeStepSize(
  parent: GenericWidget,
  parentRect: Rect,
): {
  readonly columns: number;
  readonly rows?: number | undefined;
  readonly xStep: number;
  readonly yStep: number;
} | null {
  const columns = Math.max(1, readPositiveInteger(parent.columns) ?? 2);
  const rows = readPositiveInteger(parent.rows) ?? undefined;
  const gap = isFiniteNumber(parent.gap) ? parent.gap : 0;
  const padding = isFiniteNumber(parent.padding) ? parent.padding : 0;
  const cellWidth = (parentRect.width - padding * 2 - gap * (columns - 1)) / columns;
  const cellHeight = rows ? (parentRect.height - padding * 2 - gap * (rows - 1)) / rows : cellWidth;

  if (cellWidth <= 0 || cellHeight <= 0) return null;

  return {
    columns,
    ...(rows ? { rows } : {}),
    xStep: cellWidth + gap,
    yStep: cellHeight + gap,
  };
}

function clampGridLine(line: number, min: number, max: number | undefined): number {
  if (max === undefined) return Math.max(min, line);
  return clampNumber(line, min, max);
}

function createGridResizePatch(
  parent: GenericWidget,
  child: GenericWidget,
  parentNode: LayoutNodeResult,
  parentPath: WidgetPath,
  path: WidgetPath,
  position: WidgetResizeHandlePosition,
  deltaX: number,
  deltaY: number,
): WidgetPatch | null {
  const segment = path[path.length - 1];
  const selectedIndex = segment?.kind === 'children' ? segment.index : -1;
  if (selectedIndex < 0) return null;

  const metrics = readGridResizeStepSize(parent, parentNode.rect);
  if (!metrics) return null;

  const currentSpan = readGridSlotSpan(child, metrics.columns);
  const currentPlacement = readGridSlotPlacement(
    child,
    selectedIndex,
    metrics.columns,
    currentSpan,
  );
  let targetCol = currentPlacement.col;
  let targetRow = currentPlacement.row;
  let targetColSpan = currentSpan.colSpan;
  let targetRowSpan = currentSpan.rowSpan;
  const horizontalStep = Math.round(deltaX / metrics.xStep);
  const verticalStep = Math.round(deltaY / metrics.yStep);

  if (position.includes('e')) {
    const currentRight = currentPlacement.col + currentSpan.colSpan;
    const nextRight = clampGridLine(
      currentRight + horizontalStep,
      currentPlacement.col + 1,
      metrics.columns,
    );
    targetColSpan = nextRight - currentPlacement.col;
  }

  if (position.includes('w')) {
    const currentRight = currentPlacement.col + currentSpan.colSpan;
    const nextCol = clampGridLine(currentPlacement.col + horizontalStep, 0, currentRight - 1);
    targetCol = nextCol;
    targetColSpan = currentRight - nextCol;
  }

  if (position.includes('s')) {
    const currentBottom = currentPlacement.row + currentSpan.rowSpan;
    const nextBottom = clampGridLine(
      currentBottom + verticalStep,
      currentPlacement.row + 1,
      metrics.rows,
    );
    targetRowSpan = nextBottom - currentPlacement.row;
  }

  if (position.includes('n')) {
    const currentBottom = currentPlacement.row + currentSpan.rowSpan;
    const nextRow = clampGridLine(currentPlacement.row + verticalStep, 0, currentBottom - 1);
    targetRow = nextRow;
    targetRowSpan = currentBottom - nextRow;
  }

  if (
    targetCol === currentPlacement.col &&
    targetRow === currentPlacement.row &&
    targetColSpan === currentSpan.colSpan &&
    targetRowSpan === currentSpan.rowSpan
  ) {
    return null;
  }

  const colSpanChanged = targetColSpan !== currentSpan.colSpan;
  const rowSpanChanged = targetRowSpan !== currentSpan.rowSpan;

  return {
    type: 'replace-widget',
    path: parentPath,
    widget: reflowGridChildrenAroundSlot(
      parent,
      selectedIndex,
      { col: targetCol, row: targetRow },
      { colSpan: targetColSpan, rowSpan: targetRowSpan },
      {
        writeColSpan: colSpanChanged,
        writeRowSpan: rowSpanChanged,
      },
    ),
  };
}

export function createWidgetReparentPatch({
  deltaX,
  deltaY,
  layout,
  path,
  root,
}: WidgetReparentMappingOptions): WidgetPatch | null {
  const segment = path[path.length - 1];
  if (!segment || segment.kind !== 'children') return null;

  const child = getWidgetAtPath(root, path);
  const childNode = findLayoutNodeByPath(layout, path);
  if (!child || !childNode) return null;

  const dropPoint = {
    x: childNode.node.rect.x + childNode.node.rect.width / 2 + deltaX,
    y: childNode.node.rect.y + childNode.node.rect.height / 2 + deltaY,
  };
  const hit = hitTestLayoutTree(layout, dropPoint);
  if (!hit) return null;

  const target = findReparentTarget(root, hit.path, path);
  if (!target) return null;

  return {
    type: 'reparent-widget',
    fromPath: path,
    toParentPath: target.path,
    insertIndex: target.insertIndex,
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
      parentPath,
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

  if (parent.type === 'stack') {
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

  if (parent.type === 'grid') {
    return createGridResizePatch(
      parent,
      child,
      parentNode.node,
      parentPath,
      path,
      position,
      deltaX,
      deltaY,
    );
  }

  return null;
}
