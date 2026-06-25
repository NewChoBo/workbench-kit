import { useMemo, useState, type DragEvent, type FocusEvent, type PointerEvent } from 'react';
import type { WidgetRegistryContract } from '@workbench-kit/contracts';
import type { WidgetPlacementAsset } from '@workbench-kit/contracts';
import {
  computeGridChildRect,
  createWidgetDragPatch,
  createWidgetReparentPatch,
  createWidgetResizePatch,
  DEFAULT_LAYOUT_CONSTRAINTS,
  findLayoutNodeByPath,
  getWidgetChildren,
  getWidgetAtPath,
  hitTestLayoutTree,
  layoutWidget,
  parseWidgetPathKey,
  widgetPathEquals,
  widgetPathKey,
  type GenericWidget,
  type LayoutConstraints,
  type LayoutNodeResult,
  type LayoutPoint,
  type Rect,
  type WidgetPatch,
  type WidgetPath,
  type WidgetResizeHandlePosition,
} from '@workbench-kit/jdw';

import {
  WorkbenchCanvasFrameHandle,
  WorkbenchCanvasItemFrame,
  WorkbenchPreviewCanvas,
  WorkbenchCanvasResizeHandle,
  WorkbenchCanvasDropIndicator,
  WorkbenchCanvasDragPreviewFrame,
  WorkbenchCanvasGuideLayer,
  WorkbenchCanvasGuideLine,
} from '../layout/WorkbenchCanvas.js';
import { JdwPreview } from '../jdw/JdwPreview.js';
import { readWidgetPlacementAssetDragData } from './widget-placement-asset-dnd.js';
import { canAddChildren, insertedWidgetPathForParent } from './widget-tree-layout.js';

const RESIZE_HANDLE_POSITIONS = [
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
  'nw',
] as const satisfies readonly WidgetResizeHandlePosition[];

export interface WidgetTreeCanvasPreviewProps {
  readonly json: string;
  readonly layoutConstraints?: LayoutConstraints | undefined;
  readonly readOnly?: boolean | undefined;
  readonly registry?: WidgetRegistryContract<unknown> | undefined;
  readonly root: GenericWidget | null;
  readonly selectedPath: WidgetPath | null;
  readonly onPatch: (patch: WidgetPatch) => boolean;
  readonly onPlaceAssetPath?: ((operation: WidgetTreeCanvasAssetDropOperation) => void) | undefined;
  readonly onSelectPath: (path: WidgetPath) => void;
}

export interface WidgetTreeCanvasAssetDropOperation {
  readonly asset: WidgetPlacementAsset;
  readonly parentPath: WidgetPath;
  readonly insertIndex: number;
  readonly nextPath: WidgetPath;
}

interface WidgetTreeCanvasAssetDropTarget {
  readonly insertIndex: number;
  readonly markerRect: Rect;
  readonly nextPath: WidgetPath;
  readonly parentType: string;
  readonly path: WidgetPath;
  readonly rect: Rect;
  readonly type: WidgetTreeCanvasAssetDropTargetType;
}

type WidgetTreeCanvasAssetDropTargetType =
  | 'append-column'
  | 'append-container'
  | 'append-grid'
  | 'append-row'
  | 'append-stack';

interface WidgetTreeCanvasDragPreviewState {
  readonly deltaX: number;
  readonly deltaY: number;
  readonly ghostRect: Rect;
  readonly patchType: WidgetPatch['type'] | 'none';
  readonly reparentTarget: WidgetTreeCanvasReparentDropTarget | null;
  readonly selectedPath: WidgetPath;
  readonly selectedType: string;
}

interface WidgetTreeCanvasReparentDropTarget {
  readonly insertIndex: number;
  readonly markerRect: Rect;
  readonly parentType: string;
  readonly path: WidgetPath;
  readonly rect: Rect;
  readonly type: WidgetTreeCanvasAssetDropTargetType;
}

interface WidgetTreeCanvasAppendDropTarget {
  readonly insertIndex: number;
  readonly markerRect: Rect;
  readonly parentType: string;
  readonly path: WidgetPath;
  readonly rect: Rect;
  readonly type: WidgetTreeCanvasAssetDropTargetType;
}

function canDragSelectedPath(root: GenericWidget, path: WidgetPath): boolean {
  const segment = path[path.length - 1];
  if (!segment || segment.kind !== 'children') return false;

  const parent = getWidgetAtPath(root, path.slice(0, -1));
  return parent?.type === 'stack' || parent?.type === 'grid';
}

function canResizeSelectedPath(root: GenericWidget, path: WidgetPath): boolean {
  const segment = path[path.length - 1];
  if (!segment) return false;

  const parent = getWidgetAtPath(root, path.slice(0, -1));
  if (segment.kind === 'child') {
    return (
      parent?.type === 'box' ||
      parent?.type === 'container' ||
      parent?.type === 'padding' ||
      parent?.type === 'align' ||
      parent?.type === 'center' ||
      parent?.type === 'sized_box'
    );
  }

  if (segment.kind !== 'children') return false;

  return (
    parent?.type === 'stack' ||
    parent?.type === 'grid' ||
    parent?.type === 'row' ||
    parent?.type === 'column'
  );
}

function widgetPathParent(path: WidgetPath): WidgetPath | null {
  if (path.length === 0) return null;
  return path.slice(0, -1);
}

function widgetPathFromEventTarget(target: EventTarget | null): WidgetPath | null {
  if (!(target instanceof Element)) return null;

  const pathKey = target.closest<HTMLElement>('[data-widget-path]')?.dataset.widgetPath;
  return pathKey ? parseWidgetPathKey(pathKey) : null;
}

function eventPointInLayout(
  event: DragEvent<HTMLElement>,
  stage: HTMLElement,
  frameWidth: number,
  frameHeight: number,
): LayoutPoint {
  const rect = stage.getBoundingClientRect();
  const scaleX = rect.width > 0 ? frameWidth / rect.width : 1;
  const scaleY = rect.height > 0 ? frameHeight / rect.height : 1;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function readPositiveInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return null;
  return Math.floor(value);
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function appendLineRect(rect: Rect, axis: 'x' | 'y', children: readonly LayoutNodeResult[]): Rect {
  const lastChildRect = children[children.length - 1]?.rect;
  if (axis === 'x') {
    const x = lastChildRect
      ? Math.min(rect.x + rect.width - 2, lastChildRect.x + lastChildRect.width)
      : rect.x;
    return { x, y: rect.y, width: 2, height: rect.height };
  }

  const y = lastChildRect
    ? Math.min(rect.y + rect.height - 2, lastChildRect.y + lastChildRect.height)
    : rect.y;
  return { x: rect.x, y, width: rect.width, height: 2 };
}

function createCanvasAppendDropTarget(
  parent: GenericWidget,
  target: LayoutNodeResult,
  path: WidgetPath,
  insertIndex: number,
): WidgetTreeCanvasAppendDropTarget {
  const rect = target.rect;

  if (parent.type === 'row') {
    return {
      insertIndex,
      markerRect: appendLineRect(rect, 'x', target.children),
      parentType: parent.type,
      path,
      rect,
      type: 'append-row',
    };
  }

  if (parent.type === 'column') {
    return {
      insertIndex,
      markerRect: appendLineRect(rect, 'y', target.children),
      parentType: parent.type,
      path,
      rect,
      type: 'append-column',
    };
  }

  if (parent.type === 'grid') {
    const columns = readPositiveInteger(parent.columns) ?? 2;
    const gap = readNumber(parent.gap);
    const padding = readNumber(parent.padding);
    const rows = readPositiveInteger(parent.rows) ?? undefined;
    const markerRect = computeGridChildRect(
      {
        columns,
        ...(gap !== undefined ? { gap } : {}),
        ...(padding !== undefined ? { padding } : {}),
        ...(rows !== undefined ? { rows } : {}),
      },
      {
        col: insertIndex % columns,
        row: Math.floor(insertIndex / columns),
      },
      rect,
    );

    return {
      insertIndex,
      markerRect,
      parentType: parent.type,
      path,
      rect,
      type: 'append-grid',
    };
  }

  return {
    insertIndex,
    markerRect: rect,
    parentType: parent.type,
    path,
    rect,
    type: parent.type === 'stack' ? 'append-stack' : 'append-container',
  };
}

function createAssetDropTarget(
  operation: WidgetTreeCanvasAssetDropOperation,
  parent: GenericWidget,
  target: LayoutNodeResult,
): WidgetTreeCanvasAssetDropTarget {
  return {
    ...createCanvasAppendDropTarget(parent, target, operation.parentPath, operation.insertIndex),
    nextPath: operation.nextPath,
  };
}

function createReparentDropTarget(
  patch: Extract<WidgetPatch, { type: 'reparent-widget' }>,
  parent: GenericWidget,
  target: LayoutNodeResult,
): WidgetTreeCanvasReparentDropTarget {
  return createCanvasAppendDropTarget(parent, target, patch.toParentPath, patch.insertIndex);
}

export function resolveWidgetCanvasAssetDropOperation(
  asset: WidgetPlacementAsset,
  root: GenericWidget,
  layout: LayoutNodeResult,
  point: LayoutPoint,
): WidgetTreeCanvasAssetDropOperation | null {
  const hit = hitTestLayoutTree(layout, point);
  if (!hit) return null;

  let candidatePath: WidgetPath | null = hit.path;
  while (candidatePath !== null) {
    const candidate = getWidgetAtPath(root, candidatePath);
    if (candidate && canAddChildren(candidate)) {
      const insertIndex = getWidgetChildren(candidate).length;
      return {
        asset,
        parentPath: candidatePath,
        insertIndex,
        nextPath: insertedWidgetPathForParent(candidate, candidatePath, insertIndex),
      };
    }

    candidatePath = widgetPathParent(candidatePath);
  }

  return null;
}

export function WidgetTreeCanvasPreview({
  json,
  layoutConstraints = DEFAULT_LAYOUT_CONSTRAINTS,
  readOnly = false,
  registry,
  root,
  selectedPath,
  onPatch,
  onPlaceAssetPath,
  onSelectPath,
}: WidgetTreeCanvasPreviewProps) {
  const [assetDropTarget, setAssetDropTarget] = useState<WidgetTreeCanvasAssetDropTarget | null>(
    null,
  );
  const [dragPreview, setDragPreview] = useState<WidgetTreeCanvasDragPreviewState | null>(null);
  const [hoveredPath, setHoveredPath] = useState<WidgetPath | null>(null);
  const [focusedPath, setFocusedPath] = useState<WidgetPath | null>(null);
  const layout = useMemo(
    () => (root ? layoutWidget(root, layoutConstraints, { x: 0, y: 0 }, { registry }) : null),
    [layoutConstraints, registry, root],
  );
  const selectedLayout = useMemo(
    () => (layout && selectedPath ? findLayoutNodeByPath(layout, selectedPath) : null),
    [layout, selectedPath],
  );
  const hoveredLayout = useMemo(
    () => (layout && hoveredPath ? findLayoutNodeByPath(layout, hoveredPath) : null),
    [hoveredPath, layout],
  );
  const focusedLayout = useMemo(
    () => (layout && focusedPath ? findLayoutNodeByPath(layout, focusedPath) : null),
    [focusedPath, layout],
  );
  const selectedLayoutFocused = Boolean(
    focusedPath && selectedPath && widgetPathEquals(focusedPath, selectedPath),
  );
  const showHoveredLayout = Boolean(
    hoveredLayout &&
    hoveredPath &&
    (!selectedPath || !widgetPathEquals(hoveredPath, selectedPath)) &&
    (!focusedPath || !widgetPathEquals(hoveredPath, focusedPath)) &&
    !assetDropTarget &&
    !dragPreview,
  );
  const showFocusedLayout = Boolean(
    focusedLayout &&
    focusedPath &&
    (!selectedPath || !widgetPathEquals(focusedPath, selectedPath)) &&
    !assetDropTarget &&
    !dragPreview,
  );
  const canDrag = Boolean(
    root && selectedPath && !readOnly && canDragSelectedPath(root, selectedPath),
  );
  const canResize = Boolean(
    root && selectedPath && !readOnly && canResizeSelectedPath(root, selectedPath),
  );
  const frameWidth = Math.max(1, layout?.rect.width ?? layoutConstraints.maxWidth);
  const frameHeight = Math.max(1, layout?.rect.height ?? layoutConstraints.maxHeight);

  const resolveDragPreview = (
    deltaX: number,
    deltaY: number,
  ): WidgetTreeCanvasDragPreviewState | null => {
    if (!root || !layout || !selectedPath || !selectedLayout) return null;
    if (deltaX === 0 && deltaY === 0) return null;

    const maybeReparentPatch = createWidgetReparentPatch({
      deltaX,
      deltaY,
      layout,
      path: selectedPath,
      root,
    });
    const reparentPatch =
      maybeReparentPatch?.type === 'reparent-widget' ? maybeReparentPatch : null;
    const dragPatch = reparentPatch
      ? null
      : createWidgetDragPatch({
          deltaX,
          deltaY,
          layout,
          path: selectedPath,
          root,
        });
    const targetLayout =
      reparentPatch !== null ? findLayoutNodeByPath(layout, reparentPatch.toParentPath) : null;
    const targetParent =
      reparentPatch !== null ? getWidgetAtPath(root, reparentPatch.toParentPath) : null;

    return {
      deltaX,
      deltaY,
      ghostRect: {
        x: selectedLayout.node.rect.x + deltaX,
        y: selectedLayout.node.rect.y + deltaY,
        width: selectedLayout.node.rect.width,
        height: selectedLayout.node.rect.height,
      },
      patchType: reparentPatch?.type ?? dragPatch?.type ?? 'none',
      reparentTarget:
        reparentPatch && targetLayout && targetParent
          ? createReparentDropTarget(reparentPatch, targetParent, targetLayout.node)
          : null,
      selectedPath,
      selectedType: selectedLayout.node.widget.type,
    };
  };

  const commitDrag = (deltaX: number, deltaY: number) => {
    setDragPreview(null);
    if (!root || !layout || !selectedPath) return;

    const reparentPatch = createWidgetReparentPatch({
      deltaX,
      deltaY,
      layout,
      path: selectedPath,
      root,
    });
    if (reparentPatch && onPatch(reparentPatch)) {
      return;
    }

    const patch = createWidgetDragPatch({
      deltaX,
      deltaY,
      layout,
      path: selectedPath,
      root,
    });
    if (patch) {
      onPatch(patch);
    }
  };

  const commitResize = (position: WidgetResizeHandlePosition, deltaX: number, deltaY: number) => {
    if (!root || !layout || !selectedPath) return;

    const patch = createWidgetResizePatch({
      deltaX,
      deltaY,
      layout,
      path: selectedPath,
      position,
      root,
    });
    if (patch) {
      onPatch(patch);
    }
  };

  const resolveAssetDrop = (
    event: DragEvent<HTMLElement>,
  ): WidgetTreeCanvasAssetDropOperation | null => {
    if (readOnly || !root || !layout || !onPlaceAssetPath) return null;

    const asset = readWidgetPlacementAssetDragData(event.dataTransfer);
    if (!asset) return null;

    const point = eventPointInLayout(event, event.currentTarget, frameWidth, frameHeight);
    return resolveWidgetCanvasAssetDropOperation(asset, root, layout, point);
  };

  const handleAssetDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (dragPreview) {
      setAssetDropTarget(null);
      return;
    }

    const operation = resolveAssetDrop(event);
    if (!operation || !layout || !root) {
      setAssetDropTarget(null);
      return;
    }

    const target = findLayoutNodeByPath(layout, operation.parentPath);
    const parent = getWidgetAtPath(root, operation.parentPath);
    if (!target || !parent) {
      setAssetDropTarget(null);
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setAssetDropTarget(createAssetDropTarget(operation, parent, target.node));
  };

  const handleAssetDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;

    setAssetDropTarget(null);
  };

  const handleAssetDrop = (event: DragEvent<HTMLDivElement>) => {
    const operation = resolveAssetDrop(event);
    setAssetDropTarget(null);
    if (!operation) return;

    event.preventDefault();
    onPlaceAssetPath?.(operation);
  };

  const handlePreviewPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const nextPath = widgetPathFromEventTarget(event.target);
    if (!nextPath) {
      setHoveredPath(null);
      return;
    }

    setHoveredPath((current) =>
      current && widgetPathEquals(current, nextPath) ? current : nextPath,
    );
  };

  const handlePreviewPointerLeave = () => {
    setHoveredPath(null);
  };

  const handlePreviewFocus = (event: FocusEvent<HTMLDivElement>) => {
    setFocusedPath(widgetPathFromEventTarget(event.target));
  };

  const handlePreviewBlur = (event: FocusEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
      setFocusedPath(widgetPathFromEventTarget(relatedTarget));
      return;
    }

    setFocusedPath(null);
  };

  return (
    <WorkbenchPreviewCanvas
      className="widget-tree-canvas-preview"
      data-testid="widget-tree-canvas-preview"
      frameHeight={frameHeight}
      frameTitle="JDW Preview"
      frameWidth={frameWidth}
      showViewportGrid
      showWindowFrame={false}
      viewportGridSize={8}
      viewportProps={{
        className: 'widget-tree-canvas-preview__viewport',
      }}
    >
      <div
        className="widget-tree-canvas-preview__stage"
        data-testid="widget-tree-canvas-stage"
        style={{
          width: frameWidth,
          height: frameHeight,
        }}
        onDragLeave={handleAssetDragLeave}
        onDragOver={handleAssetDragOver}
        onDrop={handleAssetDrop}
        onBlur={handlePreviewBlur}
        onFocus={handlePreviewFocus}
        onPointerLeave={handlePreviewPointerLeave}
        onPointerMove={handlePreviewPointerMove}
      >
        <JdwPreview
          className="widget-tree-canvas-preview__render"
          json={json}
          layoutConstraints={layoutConstraints}
          registry={registry}
          selectedPath={selectedPath}
          onSelectPath={onSelectPath}
        />
        <div className="widget-tree-canvas-preview__frames" data-testid="widget-tree-canvas-frames">
          {showHoveredLayout && hoveredPath && hoveredLayout ? (
            <WorkbenchCanvasItemFrame
              className="widget-tree-canvas-preview__hover-frame"
              data-testid="widget-tree-canvas-hover-frame"
              data-widget-path={widgetPathKey(hoveredPath)}
              data-widget-type={hoveredLayout.node.widget.type}
              hovered
              transient
              width={hoveredLayout.node.rect.width}
              height={hoveredLayout.node.rect.height}
              x={hoveredLayout.node.rect.x}
              y={hoveredLayout.node.rect.y}
            />
          ) : null}
          {showFocusedLayout && focusedPath && focusedLayout ? (
            <WorkbenchCanvasItemFrame
              className="widget-tree-canvas-preview__focus-frame"
              data-testid="widget-tree-canvas-focus-frame"
              data-widget-path={widgetPathKey(focusedPath)}
              data-widget-type={focusedLayout.node.widget.type}
              focused
              transient
              width={focusedLayout.node.rect.width}
              height={focusedLayout.node.rect.height}
              x={focusedLayout.node.rect.x}
              y={focusedLayout.node.rect.y}
              zIndex={95}
            />
          ) : null}
          {assetDropTarget && !dragPreview ? (
            <>
              <WorkbenchCanvasDropIndicator
                className="widget-tree-canvas-preview__asset-drop-target"
                data-testid="widget-tree-canvas-asset-drop-indicator"
                data-insert-index={assetDropTarget.insertIndex}
                data-next-widget-path={widgetPathKey(assetDropTarget.nextPath)}
                data-parent-type={assetDropTarget.parentType}
                data-widget-path={widgetPathKey(assetDropTarget.path)}
                width={assetDropTarget.rect.width}
                height={assetDropTarget.rect.height}
                x={assetDropTarget.rect.x}
                y={assetDropTarget.rect.y}
                zIndex={30}
              />
              <WorkbenchCanvasDropIndicator
                className="widget-tree-canvas-preview__asset-drop-marker"
                data-testid="widget-tree-canvas-asset-drop-marker"
                data-drop-target-type={assetDropTarget.type}
                data-insert-index={assetDropTarget.insertIndex}
                data-next-widget-path={widgetPathKey(assetDropTarget.nextPath)}
                data-parent-type={assetDropTarget.parentType}
                data-widget-path={widgetPathKey(assetDropTarget.path)}
                width={assetDropTarget.markerRect.width}
                height={assetDropTarget.markerRect.height}
                x={assetDropTarget.markerRect.x}
                y={assetDropTarget.markerRect.y}
                zIndex={35}
              />
            </>
          ) : null}
          {dragPreview ? (
            <>
              {dragPreview.reparentTarget ? (
                <>
                  <WorkbenchCanvasDropIndicator
                    className="widget-tree-canvas-preview__reparent-drop-target"
                    data-testid="widget-tree-canvas-reparent-drop-indicator"
                    data-drop-target-type={dragPreview.reparentTarget.type}
                    data-insert-index={dragPreview.reparentTarget.insertIndex}
                    data-parent-type={dragPreview.reparentTarget.parentType}
                    data-widget-path={widgetPathKey(dragPreview.reparentTarget.path)}
                    width={dragPreview.reparentTarget.rect.width}
                    height={dragPreview.reparentTarget.rect.height}
                    x={dragPreview.reparentTarget.rect.x}
                    y={dragPreview.reparentTarget.rect.y}
                    zIndex={40}
                  />
                  <WorkbenchCanvasDropIndicator
                    className="widget-tree-canvas-preview__reparent-drop-marker"
                    data-testid="widget-tree-canvas-reparent-drop-marker"
                    data-drop-target-type={dragPreview.reparentTarget.type}
                    data-insert-index={dragPreview.reparentTarget.insertIndex}
                    data-parent-type={dragPreview.reparentTarget.parentType}
                    data-widget-path={widgetPathKey(dragPreview.reparentTarget.path)}
                    width={dragPreview.reparentTarget.markerRect.width}
                    height={dragPreview.reparentTarget.markerRect.height}
                    x={dragPreview.reparentTarget.markerRect.x}
                    y={dragPreview.reparentTarget.markerRect.y}
                    zIndex={45}
                  />
                </>
              ) : null}
              <WorkbenchCanvasDragPreviewFrame
                className="widget-tree-canvas-preview__drag-ghost"
                data-testid="widget-tree-canvas-drag-ghost"
                data-delta-x={dragPreview.deltaX}
                data-delta-y={dragPreview.deltaY}
                data-patch-type={dragPreview.patchType}
                data-widget-path={widgetPathKey(dragPreview.selectedPath)}
                data-widget-type={dragPreview.selectedType}
                width={dragPreview.ghostRect.width}
                height={dragPreview.ghostRect.height}
                x={dragPreview.ghostRect.x}
                y={dragPreview.ghostRect.y}
                zIndex={80}
              />
              <WorkbenchCanvasGuideLayer
                className="widget-tree-canvas-preview__snap-guides"
                data-testid="widget-tree-canvas-snap-guides"
              >
                <WorkbenchCanvasGuideLine
                  axis="x"
                  data-testid="widget-tree-canvas-snap-guide-x"
                  data-widget-path={widgetPathKey(dragPreview.selectedPath)}
                  end={frameHeight}
                  position={dragPreview.ghostRect.x}
                  source="grid"
                  start={0}
                />
                <WorkbenchCanvasGuideLine
                  axis="y"
                  data-testid="widget-tree-canvas-snap-guide-y"
                  data-widget-path={widgetPathKey(dragPreview.selectedPath)}
                  end={frameWidth}
                  position={dragPreview.ghostRect.y}
                  source="grid"
                  start={0}
                />
              </WorkbenchCanvasGuideLayer>
            </>
          ) : null}
          {selectedLayout && selectedPath ? (
            <WorkbenchCanvasItemFrame
              className="widget-tree-canvas-preview__selection-frame"
              data-testid="widget-tree-canvas-selection-frame"
              data-widget-path={widgetPathKey(selectedPath)}
              data-widget-type={selectedLayout.node.widget.type}
              focused={selectedLayoutFocused}
              interactive={canDrag || canResize}
              selected
              touchAction="none"
              width={selectedLayout.node.rect.width}
              height={selectedLayout.node.rect.height}
              x={selectedLayout.node.rect.x}
              y={selectedLayout.node.rect.y}
            >
              {canDrag ? (
                <WorkbenchCanvasFrameHandle
                  aria-label="Move selected widget"
                  data-testid="widget-tree-canvas-drag-handle"
                  label={selectedLayout.node.widget.type}
                  onDragCancel={() => setDragPreview(null)}
                  onDragEnd={commitDrag}
                  onDragMove={(deltaX, deltaY) =>
                    setDragPreview(resolveDragPreview(deltaX, deltaY))
                  }
                  onDragStart={() => {
                    setAssetDropTarget(null);
                    setDragPreview(null);
                  }}
                />
              ) : null}
              {canResize
                ? RESIZE_HANDLE_POSITIONS.map((position) => (
                    <WorkbenchCanvasResizeHandle
                      key={position}
                      data-testid={`widget-tree-canvas-resize-handle-${position}`}
                      label={`Resize selected widget ${position}`}
                      position={position}
                      onResizeEnd={(deltaX, deltaY) => commitResize(position, deltaX, deltaY)}
                    />
                  ))
                : null}
            </WorkbenchCanvasItemFrame>
          ) : null}
        </div>
      </div>
    </WorkbenchPreviewCanvas>
  );
}
