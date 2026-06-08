import {
  computeGridChildRect,
  computeStackChildRect,
  type GenericWidget,
  type Rect,
} from '@workbench-kit/json-widget';

import { AbsoluteBox } from '../../primitives/AbsoluteBox.js';
import type { WidgetRendererComponent, WidgetRendererProps } from './contract.js';
import { useWidgetAssetResolver } from './context.js';
import {
  positionStyle,
  readChildren,
  readNumber,
  readOptionalNumber,
  readOptionalString,
  readString,
} from './prop-readers.js';
import { WidgetRenderer } from './WidgetRenderer.js';

/**
 * Generic, domain-neutral widget types the kit renders out of the box.
 * Anything else is resolved through the consumer registry.
 */
export const BUILTIN_WIDGET_TYPES = [
  'grid',
  'row',
  'column',
  'stack',
  'box',
  'text',
  'image',
  'spacer',
  'divider',
] as const;

export type BuiltinWidgetType = (typeof BUILTIN_WIDGET_TYPES)[number];

const TEXT_ALIGN_MAP = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
} as const;

function alignSelf(value: unknown): 'stretch' | 'flex-start' | 'center' | 'flex-end' {
  switch (value) {
    case 'start':
      return 'flex-start';
    case 'center':
      return 'center';
    case 'end':
      return 'flex-end';
    default:
      return 'stretch';
  }
}

export function TextRenderer({ widget, rect, fillParent }: WidgetRendererProps) {
  const textAlign = readString(widget.textAlign, 'left') as keyof typeof TEXT_ALIGN_MAP;
  return (
    <div
      data-widget-type="text"
      style={{
        ...positionStyle(rect, fillParent),
        display: 'flex',
        alignItems: 'center',
        justifyContent: TEXT_ALIGN_MAP[textAlign] ?? 'flex-start',
        fontSize: readNumber(widget.fontSize, 14),
        color: readString(widget.color, '#e2e8f0'),
        fontWeight: readString(widget.fontWeight, 'normal'),
        backgroundColor: readOptionalString(widget.background),
        padding: '0 4px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {readString(widget.text, '')}
    </div>
  );
}

export function ImageRenderer({ widget, rect, fillParent }: WidgetRendererProps) {
  const resolveAssetSrc = useWidgetAssetResolver();
  const rawSrc = readOptionalString(widget.src);
  const fit = readString(widget.fit, 'cover') as 'cover' | 'contain' | 'fill' | 'none';

  return (
    <div
      data-widget-type="image"
      style={{
        ...positionStyle(rect, fillParent),
        backgroundColor: readOptionalString(widget.background),
        borderRadius: readOptionalNumber(widget.borderRadius),
        overflow: 'hidden',
      }}
    >
      {rawSrc !== undefined ? (
        <img
          src={resolveAssetSrc(rawSrc)}
          alt={readString(widget.alt, '')}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: fit }}
        />
      ) : null}
    </div>
  );
}

export function BoxRenderer({ widget, rect, fillParent, onEvent }: WidgetRendererProps) {
  const padding = readNumber(widget.padding, 0);
  const childRect: Rect = {
    x: padding,
    y: padding,
    width: Math.max(0, rect.width - padding * 2),
    height: Math.max(0, rect.height - padding * 2),
  };
  const child = widget.child;

  return (
    <div
      data-widget-type="box"
      style={{
        ...positionStyle(rect, fillParent),
        backgroundColor: readOptionalString(widget.background),
        borderRadius: readOptionalNumber(widget.borderRadius),
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {child !== null && typeof child === 'object' && 'type' in child ? (
        <WidgetRenderer
          widget={child as GenericWidget}
          rect={childRect}
          fillParent={Boolean(fillParent)}
          onEvent={onEvent}
        />
      ) : null}
    </div>
  );
}

export function SpacerRenderer({ rect, fillParent }: WidgetRendererProps) {
  return <div data-widget-type="spacer" style={positionStyle(rect, fillParent)} />;
}

export function DividerRenderer({ widget, rect, fillParent }: WidgetRendererProps) {
  const isHorizontal = readString(widget.direction, 'horizontal') === 'horizontal';
  const thickness = readNumber(widget.thickness, 1);
  const color = readString(widget.color, '#334155');

  return (
    <div
      data-widget-type="divider"
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
    </div>
  );
}

export function GridRenderer({ widget, rect, fillParent, onEvent }: WidgetRendererProps) {
  const columns = Math.max(1, readNumber(widget.columns, 1));
  const layout = {
    columns,
    rows: readOptionalNumber(widget.rows),
    gap: readNumber(widget.gap, 0),
    padding: readNumber(widget.padding, 0),
  };
  const children = readChildren(widget);
  const baseRect: Rect = { x: 0, y: 0, width: rect.width, height: rect.height };

  return (
    <AbsoluteBox
      rect={fillParent ? baseRect : rect}
      background={readOptionalString(widget.background)}
      style={fillParent ? { inset: 0, width: undefined, height: undefined } : undefined}
    >
      {children.map((child, index) => {
        const childRect = computeGridChildRect(
          layout,
          {
            col: readNumber(child.col, 0),
            row: readNumber(child.row, 0),
            colSpan: readOptionalNumber(child.colSpan),
            rowSpan: readOptionalNumber(child.rowSpan),
          },
          baseRect,
        );
        return <WidgetRenderer key={index} widget={child} rect={childRect} onEvent={onEvent} />;
      })}
    </AbsoluteBox>
  );
}

export function LinearRenderer({ widget, rect, fillParent, onEvent }: WidgetRendererProps) {
  const isRow = widget.type === 'row';
  const gap = readNumber(widget.gap, 0);
  const padding = readNumber(widget.padding, 0);
  const children = readChildren(widget);

  return (
    <div
      data-widget-type={isRow ? 'row' : 'column'}
      style={{
        ...positionStyle(rect, fillParent),
        display: 'flex',
        flexDirection: isRow ? 'row' : 'column',
        gap,
        padding,
        boxSizing: 'border-box',
        backgroundColor: readOptionalString(widget.background),
        overflow: 'hidden',
        alignItems: 'stretch',
      }}
    >
      {children.map((child, index) => (
        <div
          key={index}
          style={{
            flex: readNumber(child.flex, 1),
            alignSelf: alignSelf(child.align),
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <WidgetRenderer
            widget={child}
            rect={{ x: 0, y: 0, width: 0, height: 0 }}
            fillParent
            onEvent={onEvent}
          />
        </div>
      ))}
    </div>
  );
}

export function StackRenderer({ widget, rect, fillParent, onEvent }: WidgetRendererProps) {
  const children = readChildren(widget);
  const baseRect: Rect = { x: 0, y: 0, width: rect.width, height: rect.height };

  return (
    <AbsoluteBox
      rect={fillParent ? baseRect : rect}
      background={readOptionalString(widget.background)}
      style={fillParent ? { inset: 0, width: undefined, height: undefined } : undefined}
    >
      {children.map((child, index) => {
        const childRect = computeStackChildRect(
          {
            left: readOptionalNumber(child.left),
            top: readOptionalNumber(child.top),
            right: readOptionalNumber(child.right),
            bottom: readOptionalNumber(child.bottom),
          },
          rect.width,
          rect.height,
        );
        return <WidgetRenderer key={index} widget={child} rect={childRect} onEvent={onEvent} />;
      })}
    </AbsoluteBox>
  );
}

export const BUILTIN_WIDGET_RENDERER_MAP: Record<BuiltinWidgetType, WidgetRendererComponent> = {
  grid: GridRenderer,
  row: LinearRenderer,
  column: LinearRenderer,
  stack: StackRenderer,
  box: BoxRenderer,
  text: TextRenderer,
  image: ImageRenderer,
  spacer: SpacerRenderer,
  divider: DividerRenderer,
};

export function isBuiltinWidgetType(type: string): type is BuiltinWidgetType {
  return type in BUILTIN_WIDGET_RENDERER_MAP;
}

export function getBuiltinWidgetRenderer(type: string): WidgetRendererComponent | null {
  return isBuiltinWidgetType(type) ? BUILTIN_WIDGET_RENDERER_MAP[type] : null;
}
