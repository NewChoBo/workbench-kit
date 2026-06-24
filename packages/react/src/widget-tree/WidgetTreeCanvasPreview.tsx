import { useMemo, useState, type DragEvent, type FocusEvent, type PointerEvent } from 'react';
import type { WidgetRegistryContract } from '@workbench-kit/contracts';
import type { WidgetPlacementAsset } from '@workbench-kit/contracts';
import {
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
  readonly path: WidgetPath;
  readonly rect: Rect;
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
    !assetDropTarget,
  );
  const showFocusedLayout = Boolean(
    focusedLayout &&
    focusedPath &&
    (!selectedPath || !widgetPathEquals(focusedPath, selectedPath)) &&
    !assetDropTarget,
  );
  const canDrag = Boolean(
    root && selectedPath && !readOnly && canDragSelectedPath(root, selectedPath),
  );
  const canResize = Boolean(
    root && selectedPath && !readOnly && canResizeSelectedPath(root, selectedPath),
  );
  const frameWidth = Math.max(1, layout?.rect.width ?? layoutConstraints.maxWidth);
  const frameHeight = Math.max(1, layout?.rect.height ?? layoutConstraints.maxHeight);

  const commitDrag = (deltaX: number, deltaY: number) => {
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
    const operation = resolveAssetDrop(event);
    if (!operation || !layout) {
      setAssetDropTarget(null);
      return;
    }

    const target = findLayoutNodeByPath(layout, operation.parentPath);
    if (!target) {
      setAssetDropTarget(null);
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setAssetDropTarget({ path: operation.parentPath, rect: target.node.rect });
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
          {assetDropTarget ? (
            <WorkbenchCanvasDropIndicator
              data-testid="widget-tree-canvas-asset-drop-indicator"
              data-widget-path={widgetPathKey(assetDropTarget.path)}
              width={assetDropTarget.rect.width}
              height={assetDropTarget.rect.height}
              x={assetDropTarget.rect.x}
              y={assetDropTarget.rect.y}
              zIndex={30}
            />
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
                  onDragEnd={commitDrag}
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
