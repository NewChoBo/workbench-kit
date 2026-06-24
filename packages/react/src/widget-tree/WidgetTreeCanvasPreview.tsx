import { useMemo } from 'react';
import type { WidgetRegistryContract } from '@workbench-kit/contracts';
import {
  createWidgetDragPatch,
  createWidgetReparentPatch,
  createWidgetResizePatch,
  DEFAULT_LAYOUT_CONSTRAINTS,
  findLayoutNodeByPath,
  getWidgetAtPath,
  layoutWidget,
  widgetPathKey,
  type GenericWidget,
  type LayoutConstraints,
  type WidgetPatch,
  type WidgetPath,
  type WidgetResizeHandlePosition,
} from '@workbench-kit/jdw';

import {
  WorkbenchCanvasFrameHandle,
  WorkbenchCanvasItemFrame,
  WorkbenchPreviewCanvas,
  WorkbenchCanvasResizeHandle,
} from '../layout/WorkbenchCanvas.js';
import { JdwPreview } from '../jdw/JdwPreview.js';

const STACK_RESIZE_HANDLE_POSITIONS = [
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
  readonly onSelectPath: (path: WidgetPath) => void;
}

function canDragSelectedPath(root: GenericWidget, path: WidgetPath): boolean {
  const segment = path[path.length - 1];
  if (!segment || segment.kind !== 'children') return false;

  const parent = getWidgetAtPath(root, path.slice(0, -1));
  return parent?.type === 'stack' || parent?.type === 'grid';
}

function canResizeSelectedPath(root: GenericWidget, path: WidgetPath): boolean {
  const segment = path[path.length - 1];
  if (!segment || segment.kind !== 'children') return false;

  const parent = getWidgetAtPath(root, path.slice(0, -1));
  return parent?.type === 'stack';
}

export function WidgetTreeCanvasPreview({
  json,
  layoutConstraints = DEFAULT_LAYOUT_CONSTRAINTS,
  readOnly = false,
  registry,
  root,
  selectedPath,
  onPatch,
  onSelectPath,
}: WidgetTreeCanvasPreviewProps) {
  const layout = useMemo(
    () => (root ? layoutWidget(root, layoutConstraints, { x: 0, y: 0 }, { registry }) : null),
    [layoutConstraints, registry, root],
  );
  const selectedLayout = useMemo(
    () => (layout && selectedPath ? findLayoutNodeByPath(layout, selectedPath) : null),
    [layout, selectedPath],
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
        style={{
          width: frameWidth,
          height: frameHeight,
        }}
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
          {selectedLayout && selectedPath ? (
            <WorkbenchCanvasItemFrame
              className="widget-tree-canvas-preview__selection-frame"
              data-testid="widget-tree-canvas-selection-frame"
              data-widget-path={widgetPathKey(selectedPath)}
              data-widget-type={selectedLayout.node.widget.type}
              interactive={canDrag}
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
                ? STACK_RESIZE_HANDLE_POSITIONS.map((position) => (
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
