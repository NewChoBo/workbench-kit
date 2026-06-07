import type { CSSProperties, ReactNode } from 'react';
import {
  computeGridChildRect,
  computeLinearChildRects,
  computeStackChildRect,
  type GenericWidget,
  type Rect,
  type WidgetPath,
  ROOT_WIDGET_PATH,
  widgetPathKey,
} from '@workbench-kit/json-widget';

import { AbsoluteBox } from '../../primitives/AbsoluteBox.js';

export const DEFAULT_PLAYGROUND_PREVIEW_RECT: Rect = {
  x: 0,
  y: 0,
  width: 420,
  height: 320,
};

export interface PlaygroundWidgetRendererProps {
  widget: GenericWidget;
  rect: Rect;
  fillParent?: boolean | undefined;
  onSelectPath?: ((path: WidgetPath) => void) | undefined;
  path?: WidgetPath | undefined;
  selectedPathKeys?: ReadonlySet<string> | undefined;
}

function positionStyle(rect: Rect, fillParent?: boolean): CSSProperties {
  if (fillParent) return { position: 'absolute', inset: 0 };
  return {
    position: 'absolute',
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

function selectionOutline(selected: boolean, interactive: boolean): CSSProperties {
  return selected
    ? { outline: '2px solid #6366f1', outlineOffset: -2, cursor: 'pointer' }
    : { cursor: interactive ? 'pointer' : 'default' };
}

function SelectableSurface({
  children,
  path,
  selectedPathKeys,
  onSelect,
  style,
}: {
  children: ReactNode;
  onSelect?: ((path: WidgetPath) => void) | undefined;
  path: WidgetPath;
  selectedPathKeys?: ReadonlySet<string> | undefined;
  style?: CSSProperties;
}) {
  const selected = selectedPathKeys?.has(widgetPathKey(path)) ?? false;

  return (
    <div
      data-playground-path={widgetPathKey(path)}
      data-testid={`playground-widget-${widgetPathKey(path)}`}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? -1 : undefined}
      style={{
        boxSizing: 'border-box',
        ...(onSelect ? selectionOutline(selected, true) : null),
        ...style,
      }}
      onClick={
        onSelect
          ? (event) => {
              event.stopPropagation();
              onSelect(path);
            }
          : undefined
      }
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(path);
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

function renderText(
  widget: GenericWidget,
  rect: Rect,
  fillParent: boolean | undefined,
  path: WidgetPath,
  selectedPathKeys: ReadonlySet<string> | undefined,
  onSelect: ((path: WidgetPath) => void) | undefined,
) {
  const textAlignMap = { left: 'flex-start', center: 'center', right: 'flex-end' } as const;
  const textAlign = typeof widget.textAlign === 'string' ? widget.textAlign : 'left';

  return (
    <SelectableSurface
      onSelect={onSelect}
      path={path}
      selectedPathKeys={selectedPathKeys}
      style={{
        ...positionStyle(rect, fillParent),
        display: 'flex',
        alignItems: 'center',
        justifyContent: textAlignMap[textAlign as keyof typeof textAlignMap] ?? 'flex-start',
        fontSize: typeof widget.fontSize === 'number' ? widget.fontSize : 14,
        color: typeof widget.color === 'string' ? widget.color : '#e2e8f0',
        fontWeight: typeof widget.fontWeight === 'string' ? widget.fontWeight : 'normal',
        backgroundColor: typeof widget.background === 'string' ? widget.background : undefined,
        padding: '0 6px',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {typeof widget.text === 'string' ? widget.text : ''}
    </SelectableSurface>
  );
}

function renderBox(
  widget: GenericWidget,
  rect: Rect,
  fillParent: boolean | undefined,
  path: WidgetPath,
  selectedPathKeys: ReadonlySet<string> | undefined,
  onSelect: ((path: WidgetPath) => void) | undefined,
) {
  const padding = typeof widget.padding === 'number' ? widget.padding : 0;
  const childRect: Rect = {
    x: padding,
    y: padding,
    width: Math.max(0, rect.width - padding * 2),
    height: Math.max(0, rect.height - padding * 2),
  };

  return (
    <SelectableSurface
      onSelect={onSelect}
      path={path}
      selectedPathKeys={selectedPathKeys}
      style={{
        ...positionStyle(rect, fillParent),
        backgroundColor: typeof widget.background === 'string' ? widget.background : '#1e293b',
        borderRadius: typeof widget.borderRadius === 'number' ? widget.borderRadius : 8,
        overflow: 'hidden',
      }}
    >
      {widget.child && typeof widget.child === 'object' && 'type' in widget.child ? (
        <PlaygroundWidgetRenderer
          fillParent={Boolean(fillParent)}
          path={[...path, { kind: 'child' }]}
          rect={childRect}
          selectedPathKeys={selectedPathKeys}
          widget={widget.child as GenericWidget}
          onSelectPath={onSelect}
        />
      ) : null}
    </SelectableSurface>
  );
}

function renderGrid(
  widget: GenericWidget,
  rect: Rect,
  fillParent: boolean | undefined,
  path: WidgetPath,
  selectedPathKeys: ReadonlySet<string> | undefined,
  onSelect: ((path: WidgetPath) => void) | undefined,
) {
  const columns = typeof widget.columns === 'number' ? widget.columns : 1;
  const rows = typeof widget.rows === 'number' ? widget.rows : undefined;
  const gap = typeof widget.gap === 'number' ? widget.gap : 0;
  const padding = typeof widget.padding === 'number' ? widget.padding : 0;
  const children = Array.isArray(widget.children)
    ? widget.children.filter(
        (child): child is GenericWidget =>
          child !== null && typeof child === 'object' && 'type' in child,
      )
    : [];

  const layout = { columns, rows, gap, padding };

  return (
    <SelectableSurface
      onSelect={onSelect}
      path={path}
      selectedPathKeys={selectedPathKeys}
      style={fillParent ? { position: 'absolute', inset: 0 } : positionStyle(rect, fillParent)}
    >
      <AbsoluteBox
        background={typeof widget.background === 'string' ? widget.background : '#0f172a'}
        rect={fillParent ? { x: 0, y: 0, width: rect.width, height: rect.height } : rect}
        style={fillParent ? { inset: 0, width: undefined, height: undefined } : undefined}
      >
        {children.map((child, index) => {
          const col = typeof child.col === 'number' ? child.col : 0;
          const row = typeof child.row === 'number' ? child.row : 0;
          const childRect = computeGridChildRect(layout, { col, row }, {
            x: 0,
            y: 0,
            width: rect.width,
            height: rect.height,
          });

          return (
            <PlaygroundWidgetRenderer
              key={index}
              path={[...path, { kind: 'children', index }]}
              rect={childRect}
              selectedPathKeys={selectedPathKeys}
              widget={child}
              onSelectPath={onSelect}
            />
          );
        })}
      </AbsoluteBox>
    </SelectableSurface>
  );
}

function renderStack(
  widget: GenericWidget,
  rect: Rect,
  fillParent: boolean | undefined,
  path: WidgetPath,
  selectedPathKeys: ReadonlySet<string> | undefined,
  onSelect: ((path: WidgetPath) => void) | undefined,
) {
  const children = Array.isArray(widget.children)
    ? widget.children.filter(
        (child): child is GenericWidget =>
          child !== null && typeof child === 'object' && 'type' in child,
      )
    : [];

  return (
    <SelectableSurface
      onSelect={onSelect}
      path={path}
      selectedPathKeys={selectedPathKeys}
      style={fillParent ? { position: 'absolute', inset: 0 } : positionStyle(rect, fillParent)}
    >
      <AbsoluteBox
        background={typeof widget.background === 'string' ? widget.background : undefined}
        rect={fillParent ? { x: 0, y: 0, width: rect.width, height: rect.height } : rect}
        style={fillParent ? { inset: 0, width: undefined, height: undefined } : undefined}
      >
        {children.map((child, index) => {
          const childRect = computeStackChildRect(
            {
              left: typeof child.left === 'number' ? child.left : undefined,
              top: typeof child.top === 'number' ? child.top : undefined,
              right: typeof child.right === 'number' ? child.right : undefined,
              bottom: typeof child.bottom === 'number' ? child.bottom : undefined,
            },
            rect.width,
            rect.height,
          );
          return (
            <PlaygroundWidgetRenderer
              key={index}
              path={[...path, { kind: 'children', index }]}
              rect={childRect}
              selectedPathKeys={selectedPathKeys}
              widget={child}
              onSelectPath={onSelect}
            />
          );
        })}
      </AbsoluteBox>
    </SelectableSurface>
  );
}

function renderLinear(
  widget: GenericWidget,
  rect: Rect,
  fillParent: boolean | undefined,
  path: WidgetPath,
  selectedPathKeys: ReadonlySet<string> | undefined,
  onSelect: ((path: WidgetPath) => void) | undefined,
) {
  const isRow = widget.type === 'row';
  const gap = typeof widget.gap === 'number' ? widget.gap : 0;
  const padding = typeof widget.padding === 'number' ? widget.padding : 0;
  const children = Array.isArray(widget.children)
    ? widget.children.filter(
        (child): child is GenericWidget =>
          child !== null && typeof child === 'object' && 'type' in child,
      )
    : [];

  const childRects = computeLinearChildRects(
    { type: isRow ? 'row' : 'column', gap, padding },
    children.map((child) => ({
      flex: typeof child.flex === 'number' ? child.flex : undefined,
      align:
        child.align === 'stretch' ||
        child.align === 'start' ||
        child.align === 'center' ||
        child.align === 'end'
          ? child.align
          : undefined,
    })),
    { x: 0, y: 0, width: rect.width, height: rect.height },
  );

  return (
    <SelectableSurface
      onSelect={onSelect}
      path={path}
      selectedPathKeys={selectedPathKeys}
      style={{
        ...positionStyle(rect, fillParent),
        display: 'flex',
        flexDirection: isRow ? 'row' : 'column',
        gap,
        padding,
        backgroundColor: typeof widget.background === 'string' ? widget.background : undefined,
        overflow: 'hidden',
        alignItems: 'stretch',
      }}
    >
      {children.map((child, index) => (
        <div
          key={index}
          style={{
            flex: typeof child.flex === 'number' ? child.flex : 1,
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <PlaygroundWidgetRenderer
            fillParent
            path={[...path, { kind: 'children', index }]}
            rect={childRects[index] ?? { x: 0, y: 0, width: 0, height: 0 }}
            selectedPathKeys={selectedPathKeys}
            widget={child}
            onSelectPath={onSelect}
          />
        </div>
      ))}
    </SelectableSurface>
  );
}

export function PlaygroundWidgetRenderer({
  widget,
  rect,
  fillParent,
  onSelectPath: handleSelect,
  path = ROOT_WIDGET_PATH,
  selectedPathKeys,
}: PlaygroundWidgetRendererProps) {
  switch (widget.type) {
    case 'text':
      return renderText(widget, rect, fillParent, path, selectedPathKeys, handleSelect);
    case 'box':
      return renderBox(widget, rect, fillParent, path, selectedPathKeys, handleSelect);
    case 'grid':
      return renderGrid(widget, rect, fillParent, path, selectedPathKeys, handleSelect);
    case 'stack':
      return renderStack(widget, rect, fillParent, path, selectedPathKeys, handleSelect);
    case 'row':
    case 'column':
      return renderLinear(widget, rect, fillParent, path, selectedPathKeys, handleSelect);
    default:
      return (
        <SelectableSurface
          onSelect={handleSelect}
          path={path}
          selectedPathKeys={selectedPathKeys}
          style={{
            ...positionStyle(rect, fillParent),
            display: 'grid',
            placeItems: 'center',
            color: '#94a3b8',
            fontSize: 12,
            background: '#111827',
          }}
        >
          {widget.type}
        </SelectableSurface>
      );
  }
}
