import { useState, type CSSProperties, type ReactNode } from 'react';
import type { Rect, WidgetPath } from '@workbench-kit/json-widget';
import { widgetPathKey } from '@workbench-kit/json-widget';

import {
  WorkbenchCanvasItemBadge,
  WorkbenchCanvasItemFrame,
  WorkbenchCanvasResizeHandle,
  type WorkbenchCanvasResizeHandlePosition,
} from '../../layout/WorkbenchCanvas.js';

const SELECTION_HANDLE_POSITIONS: WorkbenchCanvasResizeHandlePosition[] = ['nw', 'ne', 'se', 'sw'];

export interface PlaygroundEditorWidgetWrapperProps {
  children: ReactNode;
  path: WidgetPath;
  rect: Rect;
  fillParent?: boolean | undefined;
  onSelect?: ((path: WidgetPath) => void) | undefined;
  selectedPathKeys?: ReadonlySet<string> | undefined;
  style?: CSSProperties;
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

export function PlaygroundEditorWidgetWrapper({
  children,
  path,
  rect,
  fillParent,
  onSelect,
  selectedPathKeys,
  style,
  widgetType,
}: PlaygroundEditorWidgetWrapperProps) {
  const [hovered, setHovered] = useState(false);
  const pathKey = widgetPathKey(path);
  const selected = selectedPathKeys?.has(pathKey) ?? false;
  const interactive = Boolean(onSelect);
  const dimensions = frameDimensions(rect, fillParent);

  if (!interactive) {
    return (
      <div
        data-playground-path={pathKey}
        data-testid={`playground-widget-${pathKey}`}
        style={{
          boxSizing: 'border-box',
          position: fillParent ? 'absolute' : 'absolute',
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
      data-playground-path={pathKey}
      data-testid={`playground-widget-${pathKey}`}
      height={dimensions.height}
      hovered={hovered}
      interactive
      role="button"
      selected={selected}
      tabIndex={-1}
      width={dimensions.width}
      x={dimensions.x}
      y={dimensions.y}
      style={{ boxSizing: 'border-box', overflow: 'hidden', ...style }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(path);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.(path);
        }
      }}
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
              aria-hidden
              className="ui-playground-selection-handle"
              position={position}
              tabIndex={-1}
            />
          ))
        : null}
    </WorkbenchCanvasItemFrame>
  );
}
