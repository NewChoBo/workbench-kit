import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import type { GenericWidget, Rect, WidgetPath, WidgetPatch } from '@workbench-kit/json-widget';
import { getWidgetAtPath, widgetPathKey } from '@workbench-kit/json-widget';

import {
  WorkbenchCanvasItemBadge,
  WorkbenchCanvasItemFrame,
  WorkbenchCanvasResizeHandle,
  type WorkbenchCanvasResizeHandlePosition,
} from '../../layout/WorkbenchCanvas.js';
import { usePlaygroundPreviewContext } from './PlaygroundPreviewContext.js';

const SELECTION_HANDLE_POSITIONS: WorkbenchCanvasResizeHandlePosition[] = ['nw', 'ne', 'se', 'sw'];

export interface PlaygroundEditorWidgetWrapperProps {
  children: ReactNode;
  path: WidgetPath;
  rect: Rect;
  fillParent?: boolean | undefined;
  onSelect?: ((path: WidgetPath) => void) | undefined;
  selectedPathKeys?: ReadonlySet<string> | undefined;
  style?: CSSProperties;
  widget: GenericWidget;
  widgetType: string;
}

function frameDimensions(
  rect: Rect,
  fillParent?: boolean,
): { x: number | string; y: number | string; width: number | string; height: number | string } {
  if (fillParent) {
    return { x: 0, y: 0, width: '100%', height: '100%' };
  }
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function PlaygroundEditorWidgetWrapper({
  children,
  path,
  rect,
  fillParent,
  onSelect,
  selectedPathKeys,
  style,
  widget,
  widgetType,
}: PlaygroundEditorWidgetWrapperProps) {
  const previewContext = usePlaygroundPreviewContext();
  const [hovered, setHovered] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [resizeOffset, setResizeOffset] = useState<{ w: number; h: number } | null>(null);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const resizeOffsetRef = useRef<{ w: number; h: number } | null>(null);
  const didDragRef = useRef(false);

  const pathKey = widgetPathKey(path);
  const selected = selectedPathKeys?.has(pathKey) ?? false;
  const interactive = Boolean(onSelect);
  const dimensions = frameDimensions(rect, fillParent);
  const canMove = interactive && path.length > 0 && Boolean(previewContext?.onPatch);

  const parentPath = path.slice(0, -1);
  const parentWidget =
    previewContext?.root && parentPath.length >= 0
      ? getWidgetAtPath(previewContext.root, parentPath)
      : null;
  const parentType = parentWidget?.type ?? null;
  const viewportScale = previewContext?.viewportScale ?? 1;

  const handleDragMouseDown = (event: ReactMouseEvent) => {
    if (!canMove || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();

    onSelect?.(path);
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    isDraggingRef.current = true;
    didDragRef.current = false;
    dragOffsetRef.current = { x: 0, y: 0 };
    setDragOffset({ x: 0, y: 0 });
  };

  const handleResizeMouseDown = (event: ReactMouseEvent) => {
    if (!canMove || parentType !== 'grid' || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();

    dragStartRef.current = { x: event.clientX, y: event.clientY };
    isResizingRef.current = true;
    didDragRef.current = true;
    resizeOffsetRef.current = { w: 0, h: 0 };
    setResizeOffset({ w: 0, h: 0 });
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isDraggingRef.current) {
        const dx = (event.clientX - dragStartRef.current.x) / viewportScale;
        const dy = (event.clientY - dragStartRef.current.y) / viewportScale;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          didDragRef.current = true;
        }
        dragOffsetRef.current = { x: dx, y: dy };
        setDragOffset({ x: dx, y: dy });
      } else if (isResizingRef.current) {
        const dw = (event.clientX - dragStartRef.current.x) / viewportScale;
        const dh = (event.clientY - dragStartRef.current.y) / viewportScale;
        resizeOffsetRef.current = { w: dw, h: dh };
        setResizeOffset({ w: dw, h: dh });
      }
    };

    const handleMouseUp = () => {
      const onPatch = previewContext?.onPatch;
      const latestDragOffset = dragOffsetRef.current;
      const latestResizeOffset = resizeOffsetRef.current;

      if (isDraggingRef.current && latestDragOffset && onPatch) {
        isDraggingRef.current = false;
        dragOffsetRef.current = null;
        const dx = latestDragOffset.x;
        const dy = latestDragOffset.y;
        setDragOffset(null);

        if (parentType === 'stack') {
          const currentLeft = readNumber(widget.left, 0);
          const currentTop = readNumber(widget.top, 0);
          const patch: WidgetPatch = {
            type: 'replace-widget',
            path,
            widget: {
              ...widget,
              left: Math.max(0, Math.round(currentLeft + dx)),
              top: Math.max(0, Math.round(currentTop + dy)),
            },
          };
          onPatch(patch);
        } else if (parentType === 'grid') {
          const colSpan = readNumber(widget.colSpan, 1);
          const rowSpan = readNumber(widget.rowSpan, 1);
          const colWidth = rect.width / colSpan;
          const rowHeight = rect.height / rowSpan;
          const deltaCol = Math.round(dx / Math.max(colWidth, 1));
          const deltaRow = Math.round(dy / Math.max(rowHeight, 1));
          const currentCol = readNumber(widget.col, 0);
          const currentRow = readNumber(widget.row, 0);
          const patch: WidgetPatch = {
            type: 'replace-widget',
            path,
            widget: {
              ...widget,
              col: Math.max(0, currentCol + deltaCol),
              row: Math.max(0, currentRow + deltaRow),
            },
          };
          onPatch(patch);
        }
      } else if (isResizingRef.current && latestResizeOffset && onPatch && parentType === 'grid') {
        isResizingRef.current = false;
        resizeOffsetRef.current = null;
        const dw = latestResizeOffset.w;
        const dh = latestResizeOffset.h;
        setResizeOffset(null);

        const colSpan = readNumber(widget.colSpan, 1);
        const rowSpan = readNumber(widget.rowSpan, 1);
        const colWidth = rect.width / colSpan;
        const rowHeight = rect.height / rowSpan;
        const deltaColSpan = Math.round(dw / Math.max(colWidth, 1));
        const deltaRowSpan = Math.round(dh / Math.max(rowHeight, 1));
        const patch: WidgetPatch = {
          type: 'replace-widget',
          path,
          widget: {
            ...widget,
            colSpan: Math.max(1, colSpan + deltaColSpan),
            rowSpan: Math.max(1, rowSpan + deltaRowSpan),
          },
        };
        onPatch(patch);
      }

      isDraggingRef.current = false;
      isResizingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [parentType, path, previewContext?.onPatch, rect.height, rect.width, viewportScale, widget]);

  const renderedX =
    typeof dimensions.x === 'number' ? dimensions.x + (dragOffset?.x ?? 0) : dimensions.x;
  const renderedY =
    typeof dimensions.y === 'number' ? dimensions.y + (dragOffset?.y ?? 0) : dimensions.y;
  const renderedW =
    typeof dimensions.width === 'number'
      ? Math.max(20, dimensions.width + (resizeOffset?.w ?? 0))
      : dimensions.width;
  const renderedH =
    typeof dimensions.height === 'number'
      ? Math.max(20, dimensions.height + (resizeOffset?.h ?? 0))
      : dimensions.height;

  if (!interactive) {
    return (
      <div
        data-playground-path={pathKey}
        data-testid={`playground-widget-${pathKey}`}
        style={{
          boxSizing: 'border-box',
          position: 'absolute',
          ...(fillParent
            ? { inset: 0 }
            : {
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
              }),
          ...style,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <WorkbenchCanvasItemFrame
      cursor={canMove ? 'grab' : undefined}
      data-playground-path={pathKey}
      data-testid={`playground-widget-${pathKey}`}
      height={renderedH}
      hovered={hovered}
      interactive
      role="button"
      selected={selected}
      tabIndex={-1}
      touchAction="none"
      transient={Boolean(dragOffset || resizeOffset)}
      width={renderedW}
      x={renderedX}
      y={renderedY}
      style={{ boxSizing: 'border-box', overflow: 'hidden', ...style }}
      onClick={(event) => {
        event.stopPropagation();
        if (!didDragRef.current) {
          onSelect?.(path);
        }
        didDragRef.current = false;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.(path);
        }
      }}
      onMouseDown={canMove ? handleDragMouseDown : undefined}
      onMouseEnter={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onMouseLeave={(event) => {
        event.stopPropagation();
        setHovered(false);
      }}
    >
      {children}
      {selected || hovered ? (
        <WorkbenchCanvasItemBadge
          data-testid={`playground-widget-badge-${pathKey}`}
          selected={selected}
        >
          {widgetType}
        </WorkbenchCanvasItemBadge>
      ) : null}
      {selected
        ? SELECTION_HANDLE_POSITIONS.map((position) => (
            <WorkbenchCanvasResizeHandle
              key={position}
              aria-hidden={position !== 'se'}
              className="ui-playground-selection-handle"
              position={position}
              tabIndex={-1}
              onMouseDown={position === 'se' ? handleResizeMouseDown : undefined}
            />
          ))
        : null}
    </WorkbenchCanvasItemFrame>
  );
}
