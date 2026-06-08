import type { GenericWidget, WidgetPatch, WidgetPath } from '@workbench-kit/json-widget';
import {
  ROOT_WIDGET_PATH,
  applyWidgetPatchToDocument,
  createJsonWidgetEditorSyncSnapshot,
  emptyWidgetSelection,
  getWidgetAtPath,
  getWidgetChildren,
  isContainerWidget,
} from '@workbench-kit/json-widget';

import type { PlaygroundWidgetTemplate } from './demo-registry.js';

export interface InsertTarget {
  parentPath: WidgetPath;
  index: number;
  mode: 'insert-child' | 'set-box-child';
}

function isGenericWidget(value: unknown): value is GenericWidget {
  return (
    value !== null &&
    !Array.isArray(value) &&
    typeof value === 'object' &&
    typeof (value as GenericWidget).type === 'string'
  );
}

function documentInnerContainerPath(
  documentPath: WidgetPath,
  document: GenericWidget,
): { parentPath: WidgetPath; widget: GenericWidget } | null {
  if (document.type !== 'document' || !isGenericWidget(document.child)) return null;

  const inner = document.child;
  if (inner.type === 'box' || !isContainerWidget(inner)) return null;

  return {
    parentPath: [...documentPath, { kind: 'child' }],
    widget: inner,
  };
}

export function resolveInsertTarget(
  root: GenericWidget,
  selectedPath: WidgetPath | null,
): InsertTarget {
  if (selectedPath !== null) {
    const selected = getWidgetAtPath(root, selectedPath);
    if (!selected) {
      return {
        parentPath: ROOT_WIDGET_PATH,
        index: getWidgetChildren(root).length,
        mode: 'insert-child',
      };
    }

    if (selected.type === 'document') {
      const inner = documentInnerContainerPath(selectedPath, selected);
      if (inner) {
        return {
          parentPath: inner.parentPath,
          index: getWidgetChildren(inner.widget).length,
          mode: 'insert-child',
        };
      }
    }

    if (selected.type === 'box') {
      if (!isGenericWidget(selected.child)) {
        return { parentPath: selectedPath, index: 0, mode: 'set-box-child' };
      }
    } else if (isContainerWidget(selected)) {
      return {
        parentPath: selectedPath,
        index: getWidgetChildren(selected).length,
        mode: 'insert-child',
      };
    }

    if (selectedPath.length > 0) {
      const parentPath = selectedPath.slice(0, -1);
      const lastSegment = selectedPath[selectedPath.length - 1];
      if (lastSegment?.kind === 'children') {
        return { parentPath, index: lastSegment.index + 1, mode: 'insert-child' };
      }
      if (lastSegment?.kind === 'child') {
        return { parentPath: selectedPath.slice(0, -1), index: 0, mode: 'insert-child' };
      }
    }
  }

  if (root.type === 'document') {
    const inner = documentInnerContainerPath(ROOT_WIDGET_PATH, root);
    if (inner) {
      return {
        parentPath: inner.parentPath,
        index: getWidgetChildren(inner.widget).length,
        mode: 'insert-child',
      };
    }
  }

  if (root.type === 'box' && !isGenericWidget(root.child)) {
    return { parentPath: ROOT_WIDGET_PATH, index: 0, mode: 'set-box-child' };
  }

  return {
    parentPath: ROOT_WIDGET_PATH,
    index: getWidgetChildren(root).length,
    mode: 'insert-child',
  };
}

export interface InsertPlaygroundWidgetOptions {
  childOverride?: GenericWidget | undefined;
  gridPosition?: { col: number; row: number } | undefined;
  stackPosition?: { left: number; top: number } | undefined;
}

function applyPlacement(
  child: GenericWidget,
  options?: InsertPlaygroundWidgetOptions,
): GenericWidget {
  let next = child;
  if (options?.gridPosition) {
    next = { ...next, col: options.gridPosition.col, row: options.gridPosition.row };
  }
  if (options?.stackPosition) {
    next = {
      ...next,
      left: options.stackPosition.left,
      top: options.stackPosition.top,
    };
  }
  return next;
}

export function insertPlaygroundWidget(
  document: string,
  template: PlaygroundWidgetTemplate,
  selectedPath: WidgetPath | null,
  options?: InsertPlaygroundWidgetOptions,
): string | null {
  const snapshot = createJsonWidgetEditorSyncSnapshot({
    document,
    selection: emptyWidgetSelection(),
  });
  if (!snapshot.root) return null;

  const { parentPath, index, mode } = resolveInsertTarget(snapshot.root, selectedPath);
  const parent = getWidgetAtPath(snapshot.root, parentPath);
  const siblingCount = parent ? getWidgetChildren(parent).length : 0;
  const child = applyPlacement(
    options?.childOverride ?? template.create({ siblingCount }),
    options,
  );

  const patch: WidgetPatch =
    mode === 'set-box-child'
      ? { type: 'set-box-child', boxPath: parentPath, child }
      : { type: 'insert-child', parentPath, index, child };

  return applyWidgetPatchToDocument(snapshot, patch);
}

export function resolveGridCellFromCanvasPoint(
  root: GenericWidget,
  point: { x: number; y: number },
  canvasSize: { width: number; height: number },
): { col: number; row: number } | null {
  if (root.type !== 'grid') return null;

  const columns = typeof root.columns === 'number' && root.columns > 0 ? root.columns : 1;
  const rows = typeof root.rows === 'number' && root.rows > 0 ? root.rows : 1;
  const padding = typeof root.padding === 'number' ? root.padding : 0;
  const gap = typeof root.gap === 'number' ? root.gap : 0;

  const innerWidth = canvasSize.width - padding * 2 - gap * (columns - 1);
  const innerHeight = canvasSize.height - padding * 2 - gap * (rows - 1);
  const cellWidth = innerWidth / columns;
  const cellHeight = innerHeight / rows;

  const localX = point.x - padding;
  const localY = point.y - padding;
  if (localX < 0 || localY < 0) return null;

  const col = Math.min(columns - 1, Math.max(0, Math.floor(localX / (cellWidth + gap))));
  const row = Math.min(rows - 1, Math.max(0, Math.floor(localY / (cellHeight + gap))));

  return { col, row };
}

export function resolveStackPositionFromCanvasPoint(point: { x: number; y: number }): {
  left: number;
  top: number;
} {
  return {
    left: Math.max(0, Math.round(point.x)),
    top: Math.max(0, Math.round(point.y)),
  };
}
