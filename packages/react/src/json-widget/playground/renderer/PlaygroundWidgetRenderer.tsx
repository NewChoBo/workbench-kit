import type { CSSProperties, ReactNode } from 'react';
import {
  computeGridChildRect,
  computeLinearChildRects,
  computeStackChildRect,
  type GenericWidget,
  type Rect,
  type WidgetPath,
  type WidgetPathSelectOptions,
  ROOT_WIDGET_PATH,
} from '@workbench-kit/json-widget';

import { AbsoluteBox } from '../../../primitives/AbsoluteBox.js';
import { PlaygroundEditorWidgetWrapper } from './PlaygroundEditorWidgetWrapper.js';
import { usePlaygroundPreviewContext } from './PlaygroundPreviewContext.js';

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
  onSelectPath?: ((path: WidgetPath, options?: WidgetPathSelectOptions) => void) | undefined;
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

interface WidgetSurfaceProps {
  children: ReactNode;
  fillParent?: boolean | undefined;
  onSelect?: ((path: WidgetPath, options?: WidgetPathSelectOptions) => void) | undefined;
  path: WidgetPath;
  rect: Rect;
  selectedPathKeys?: ReadonlySet<string> | undefined;
  style?: CSSProperties;
  widget: GenericWidget;
}

function WidgetSurface({
  children,
  fillParent,
  onSelect,
  path,
  rect,
  selectedPathKeys,
  style,
  widget,
}: WidgetSurfaceProps) {
  return (
    <PlaygroundEditorWidgetWrapper
      fillParent={fillParent}
      path={path}
      rect={rect}
      selectedPathKeys={selectedPathKeys}
      style={style}
      widget={widget}
      widgetType={widget.type}
      onSelect={onSelect}
    >
      {children}
    </PlaygroundEditorWidgetWrapper>
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
    <WidgetSurface
      fillParent={fillParent}
      path={path}
      rect={rect}
      selectedPathKeys={selectedPathKeys}
      widget={widget}
      onSelect={onSelect}
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
    </WidgetSurface>
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
  const border =
    widget.border && typeof widget.border === 'object'
      ? (widget.border as { color?: string; width?: number })
      : undefined;
  const childRect: Rect = {
    x: padding,
    y: padding,
    width: Math.max(0, rect.width - padding * 2),
    height: Math.max(0, rect.height - padding * 2),
  };

  return (
    <WidgetSurface
      fillParent={fillParent}
      path={path}
      rect={rect}
      selectedPathKeys={selectedPathKeys}
      widget={widget}
      onSelect={onSelect}
      style={{
        ...positionStyle(rect, fillParent),
        backgroundColor: typeof widget.background === 'string' ? widget.background : '#1e293b',
        borderRadius: typeof widget.borderRadius === 'number' ? widget.borderRadius : 8,
        border:
          border && typeof border.width === 'number' && border.width > 0
            ? `${border.width}px solid ${border.color ?? '#64748b'}`
            : undefined,
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
    </WidgetSurface>
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
    <WidgetSurface
      fillParent={fillParent}
      path={path}
      rect={rect}
      selectedPathKeys={selectedPathKeys}
      widget={widget}
      onSelect={onSelect}
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
          const childRect = computeGridChildRect(
            layout,
            { col, row },
            {
              x: 0,
              y: 0,
              width: rect.width,
              height: rect.height,
            },
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
    </WidgetSurface>
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
    <WidgetSurface
      fillParent={fillParent}
      path={path}
      rect={rect}
      selectedPathKeys={selectedPathKeys}
      widget={widget}
      onSelect={onSelect}
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
    </WidgetSurface>
  );
}

function renderButton(
  widget: GenericWidget,
  rect: Rect,
  fillParent: boolean | undefined,
  path: WidgetPath,
  selectedPathKeys: ReadonlySet<string> | undefined,
  onSelect: ((path: WidgetPath) => void) | undefined,
) {
  const variant =
    widget.variant === 'secondary' || widget.variant === 'ghost' || widget.variant === 'danger'
      ? widget.variant
      : 'primary';
  const variantStyles: Record<string, { background: string; color: string }> = {
    primary: { background: '#2563eb', color: '#eff6ff' },
    secondary: { background: '#334155', color: '#e2e8f0' },
    ghost: { background: 'transparent', color: '#cbd5e1' },
    danger: { background: '#dc2626', color: '#fef2f2' },
  };
  const palette = variantStyles[variant] ?? variantStyles.primary;
  const disabled = widget.disabled === true;

  return (
    <WidgetSurface
      fillParent={fillParent}
      path={path}
      rect={rect}
      selectedPathKeys={selectedPathKeys}
      widget={widget}
      onSelect={onSelect}
      style={{
        ...positionStyle(rect, fillParent),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor:
          typeof widget.background === 'string' ? widget.background : palette.background,
        color: typeof widget.color === 'string' ? widget.color : palette.color,
        borderRadius: typeof widget.borderRadius === 'number' ? widget.borderRadius : 8,
        fontSize: 13,
        fontWeight: 600,
        opacity: disabled ? 0.55 : 1,
        userSelect: 'none',
      }}
    >
      {typeof widget.label === 'string' ? widget.label : 'Button'}
    </WidgetSurface>
  );
}

function renderListView(
  widget: GenericWidget,
  rect: Rect,
  fillParent: boolean | undefined,
  path: WidgetPath,
  selectedPathKeys: ReadonlySet<string> | undefined,
  onSelect: ((path: WidgetPath) => void) | undefined,
) {
  const isHorizontal = widget.direction === 'horizontal';
  const itemExtent = typeof widget.itemExtent === 'number' ? widget.itemExtent : 80;
  const gap = typeof widget.gap === 'number' ? widget.gap : 0;
  const padding = typeof widget.padding === 'number' ? widget.padding : 0;
  const children = Array.isArray(widget.children)
    ? widget.children.filter(
        (child): child is GenericWidget =>
          child !== null && typeof child === 'object' && 'type' in child,
      )
    : [];

  return (
    <WidgetSurface
      fillParent={fillParent}
      path={path}
      rect={rect}
      selectedPathKeys={selectedPathKeys}
      widget={widget}
      onSelect={onSelect}
      style={{
        ...positionStyle(rect, fillParent),
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        gap,
        padding,
        backgroundColor: typeof widget.background === 'string' ? widget.background : '#0f172a',
        overflow: 'hidden',
      }}
    >
      {children.map((child, index) => (
        <div
          key={index}
          style={{
            flex: '0 0 auto',
            ...(isHorizontal
              ? { width: itemExtent, height: '100%' }
              : { height: itemExtent, width: '100%' }),
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <PlaygroundWidgetRenderer
            fillParent
            path={[...path, { kind: 'children', index }]}
            rect={{ x: 0, y: 0, width: itemExtent, height: itemExtent }}
            selectedPathKeys={selectedPathKeys}
            widget={child}
            onSelectPath={onSelect}
          />
        </div>
      ))}
    </WidgetSurface>
  );
}

function resolveTileBackground(
  widget: GenericWidget,
  resolveColor?: (value: string) => string,
): string {
  if (!Array.isArray(widget.layers)) return '#1e293b';
  for (const layer of widget.layers) {
    if (
      layer &&
      typeof layer === 'object' &&
      'type' in layer &&
      layer.type === 'color' &&
      typeof layer.color === 'string'
    ) {
      return resolveColor ? resolveColor(layer.color) : layer.color;
    }
  }
  return '#1e293b';
}

function resolveTileOverlayText(widget: GenericWidget): string | null {
  if (typeof widget.label === 'string' && widget.label.trim().length > 0) {
    return widget.label;
  }
  if (!Array.isArray(widget.layers)) return null;
  for (const layer of widget.layers) {
    if (
      layer &&
      typeof layer === 'object' &&
      'type' in layer &&
      layer.type === 'text' &&
      typeof layer.text === 'string'
    ) {
      return layer.text;
    }
  }
  return null;
}

function TileWidgetSurface({
  widget,
  rect,
  fillParent,
  path,
  selectedPathKeys,
  onSelect,
}: {
  widget: GenericWidget;
  rect: Rect;
  fillParent: boolean | undefined;
  path: WidgetPath;
  selectedPathKeys: ReadonlySet<string> | undefined;
  onSelect: ((path: WidgetPath) => void) | undefined;
}) {
  const preview = usePlaygroundPreviewContext();
  const overlayText = resolveTileOverlayText(widget);
  const resolveColor = preview?.resolveAssetSrc;

  return (
    <WidgetSurface
      fillParent={fillParent}
      path={path}
      rect={rect}
      selectedPathKeys={selectedPathKeys}
      widget={widget}
      onSelect={onSelect}
      style={{
        ...positionStyle(rect, fillParent),
        display: 'grid',
        placeItems: 'center',
        backgroundColor: resolveTileBackground(widget, resolveColor),
        borderRadius: 12,
        color: '#f8fafc',
        fontSize: 14,
        fontWeight: 600,
        userSelect: 'none',
      }}
    >
      {overlayText ?? 'Tile'}
    </WidgetSurface>
  );
}

function renderTile(
  widget: GenericWidget,
  rect: Rect,
  fillParent: boolean | undefined,
  path: WidgetPath,
  selectedPathKeys: ReadonlySet<string> | undefined,
  onSelect: ((path: WidgetPath) => void) | undefined,
) {
  return (
    <TileWidgetSurface
      fillParent={fillParent}
      path={path}
      rect={rect}
      selectedPathKeys={selectedPathKeys}
      widget={widget}
      onSelect={onSelect}
    />
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
    <WidgetSurface
      fillParent={fillParent}
      path={path}
      rect={rect}
      selectedPathKeys={selectedPathKeys}
      widget={widget}
      onSelect={onSelect}
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
    </WidgetSurface>
  );
}

function renderDivider(
  widget: GenericWidget,
  rect: Rect,
  fillParent: boolean | undefined,
  path: WidgetPath,
  selectedPathKeys: ReadonlySet<string> | undefined,
  onSelect: ((path: WidgetPath) => void) | undefined,
) {
  const isHorizontal = widget.direction !== 'vertical';
  const thickness = typeof widget.thickness === 'number' ? widget.thickness : 1;
  const color = typeof widget.color === 'string' ? widget.color : '#334155';

  return (
    <WidgetSurface
      fillParent={fillParent}
      path={path}
      rect={rect}
      selectedPathKeys={selectedPathKeys}
      widget={widget}
      onSelect={onSelect}
      style={{
        ...positionStyle(rect, fillParent),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: color,
          width: isHorizontal ? '100%' : thickness,
          height: isHorizontal ? thickness : '100%',
        }}
      />
    </WidgetSurface>
  );
}

function ImageWidgetSurface({
  widget,
  rect,
  fillParent,
  path,
  selectedPathKeys,
  onSelect,
}: {
  widget: GenericWidget;
  rect: Rect;
  fillParent: boolean | undefined;
  path: WidgetPath;
  selectedPathKeys: ReadonlySet<string> | undefined;
  onSelect: ((path: WidgetPath) => void) | undefined;
}) {
  const preview = usePlaygroundPreviewContext();
  const rawSrc = typeof widget.src === 'string' ? widget.src : '';
  const src = preview?.resolveAssetSrc ? preview.resolveAssetSrc(rawSrc) : rawSrc;
  const fit = widget.fit === 'contain' || widget.fit === 'fill' ? widget.fit : ('cover' as const);

  return (
    <WidgetSurface
      fillParent={fillParent}
      path={path}
      rect={rect}
      selectedPathKeys={selectedPathKeys}
      widget={widget}
      onSelect={onSelect}
      style={{
        ...positionStyle(rect, fillParent),
        backgroundColor: typeof widget.background === 'string' ? widget.background : '#0f172a',
        borderRadius: typeof widget.borderRadius === 'number' ? widget.borderRadius : 8,
        overflow: 'hidden',
      }}
    >
      {src ? (
        <img
          alt={typeof widget.alt === 'string' ? widget.alt : 'Image'}
          src={src}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: fit }}
        />
      ) : (
        <span style={{ color: '#64748b', fontSize: 12 }}>No image source</span>
      )}
    </WidgetSurface>
  );
}

function renderDocument(
  widget: GenericWidget,
  rect: Rect,
  fillParent: boolean | undefined,
  path: WidgetPath,
  selectedPathKeys: ReadonlySet<string> | undefined,
  onSelect: ((path: WidgetPath) => void) | undefined,
) {
  const padding = typeof widget.padding === 'number' ? widget.padding : 12;
  const title = typeof widget.title === 'string' ? widget.title : 'Document';
  const childRect: Rect = {
    x: padding,
    y: padding + 28,
    width: Math.max(0, rect.width - padding * 2),
    height: Math.max(0, rect.height - padding * 2 - 28),
  };

  return (
    <WidgetSurface
      fillParent={fillParent}
      path={path}
      rect={rect}
      selectedPathKeys={selectedPathKeys}
      widget={widget}
      onSelect={onSelect}
      style={{
        ...positionStyle(rect, fillParent),
        backgroundColor: typeof widget.background === 'string' ? widget.background : '#111827',
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid #334155',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: padding,
          top: padding,
          right: padding,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          color: '#e2e8f0',
          fontSize: 12,
          fontWeight: 600,
          borderBottom: '1px solid #334155',
        }}
      >
        {title}
      </div>
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
    </WidgetSurface>
  );
}

function renderInput(
  widget: GenericWidget,
  rect: Rect,
  fillParent: boolean | undefined,
  path: WidgetPath,
  selectedPathKeys: ReadonlySet<string> | undefined,
  onSelect: ((path: WidgetPath) => void) | undefined,
) {
  const label = typeof widget.label === 'string' ? widget.label : '';
  const placeholder = typeof widget.placeholder === 'string' ? widget.placeholder : 'Enter text';
  const value = typeof widget.value === 'string' ? widget.value : '';

  return (
    <WidgetSurface
      fillParent={fillParent}
      path={path}
      rect={rect}
      selectedPathKeys={selectedPathKeys}
      widget={widget}
      onSelect={onSelect}
      style={{
        ...positionStyle(rect, fillParent),
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 4,
        padding: '6px 8px',
        backgroundColor: typeof widget.background === 'string' ? widget.background : '#1e293b',
        borderRadius: typeof widget.borderRadius === 'number' ? widget.borderRadius : 8,
        userSelect: 'none',
      }}
    >
      {label ? (
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{label}</span>
      ) : null}
      <span
        style={{
          display: 'block',
          padding: '6px 8px',
          borderRadius: 6,
          background: '#0f172a',
          color: typeof widget.color === 'string' ? widget.color : '#e2e8f0',
          fontSize: 13,
          border: '1px solid #334155',
        }}
      >
        {value || placeholder}
      </span>
    </WidgetSurface>
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
    case 'button':
      return renderButton(widget, rect, fillParent, path, selectedPathKeys, handleSelect);
    case 'list-view':
      return renderListView(widget, rect, fillParent, path, selectedPathKeys, handleSelect);
    case 'tile':
      return renderTile(widget, rect, fillParent, path, selectedPathKeys, handleSelect);
    case 'input':
      return renderInput(widget, rect, fillParent, path, selectedPathKeys, handleSelect);
    case 'divider':
      return renderDivider(widget, rect, fillParent, path, selectedPathKeys, handleSelect);
    case 'image':
      return (
        <ImageWidgetSurface
          fillParent={fillParent}
          path={path}
          rect={rect}
          selectedPathKeys={selectedPathKeys}
          widget={widget}
          onSelect={handleSelect}
        />
      );
    case 'document':
      return renderDocument(widget, rect, fillParent, path, selectedPathKeys, handleSelect);
    default:
      return (
        <WidgetSurface
          fillParent={fillParent}
          path={path}
          rect={rect}
          selectedPathKeys={selectedPathKeys}
          widget={widget}
          onSelect={handleSelect}
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
        </WidgetSurface>
      );
  }
}
