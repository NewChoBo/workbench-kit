import { forwardRef, useRef } from 'react';
import type {
  ComponentPropsWithRef,
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import { Button } from '../primitives/Button';
import type { ButtonProps } from '../primitives/Button';
import { Checkbox } from '../primitives/Checkbox';
import { Field } from '../primitives/Field';
import type { FieldProps } from '../primitives/Field';
import { IconButton } from '../primitives/IconButton';
import type { IconButtonProps } from '../primitives/IconButton';
import { NumberInput } from '../primitives/NumberInput';
import { Select } from '../primitives/Select';
import { TextInput } from '../primitives/TextInput';
import type { ControlWidth } from '../primitives/TextInput';
import { cx } from '../utils/cx';

export type WorkbenchRootProps = ComponentPropsWithRef<'div'>;

export function WorkbenchRoot({ className, ...props }: WorkbenchRootProps) {
  return <div className={cx('ui-workbench-root', className)} {...props} />;
}

export type WorkbenchFillProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFill({ className, ...props }: WorkbenchFillProps) {
  return <div className={cx('ui-workbench-fill', className)} {...props} />;
}

export type WorkbenchCenterProps = ComponentPropsWithRef<'main'>;

export function WorkbenchCenter({ className, ...props }: WorkbenchCenterProps) {
  return <main className={cx('ui-workbench-center', className)} {...props} />;
}

export type WorkbenchPaneProps = ComponentPropsWithRef<'div'>;

export function WorkbenchPane({ className, ...props }: WorkbenchPaneProps) {
  return <div className={cx('ui-workbench-pane', className)} {...props} />;
}

export type WorkbenchColumnProps = ComponentPropsWithRef<'div'>;

export function WorkbenchColumn({ className, ...props }: WorkbenchColumnProps) {
  return <div className={cx('ui-workbench-column', className)} {...props} />;
}

export interface WorkbenchPanelSurfaceProps extends ComponentPropsWithRef<'div'> {
  border?: 'left' | 'right' | false;
}

export function WorkbenchPanelSurface({
  border = false,
  className,
  ...props
}: WorkbenchPanelSurfaceProps) {
  return (
    <div
      className={cx(
        'ui-workbench-panel-surface',
        border === 'left' && 'ui-workbench-panel-surface--border-left',
        border === 'right' && 'ui-workbench-panel-surface--border-right',
        className,
      )}
      {...props}
    />
  );
}

export type WorkbenchPanelScrollProps = ComponentPropsWithRef<'div'>;

export function WorkbenchPanelScroll({ className, ...props }: WorkbenchPanelScrollProps) {
  return <div className={cx('ui-workbench-panel-scroll', className)} {...props} />;
}

export interface WorkbenchBannerProps extends ComponentPropsWithRef<'div'> {
  tone?: 'default' | 'warning';
}

export function WorkbenchBanner({ className, tone = 'default', ...props }: WorkbenchBannerProps) {
  return (
    <div
      className={cx(
        'ui-workbench-banner',
        tone === 'warning' && 'ui-workbench-banner--warning',
        className,
      )}
      {...props}
    />
  );
}

export interface WorkbenchBannerIconProps extends ComponentPropsWithRef<'span'> {
  icon: string;
}

export function WorkbenchBannerIcon({ className, icon, ...props }: WorkbenchBannerIconProps) {
  return (
    <span
      className={cx('codicon', `codicon-${icon}`, 'ui-workbench-banner__icon', className)}
      aria-hidden
      {...props}
    />
  );
}

export type WorkbenchBannerMessageProps = ComponentPropsWithRef<'span'>;

export function WorkbenchBannerMessage({ className, ...props }: WorkbenchBannerMessageProps) {
  return <span className={cx('ui-workbench-banner__message', className)} {...props} />;
}

export type WorkbenchSectionTitleProps = ComponentPropsWithRef<'div'>;

export function WorkbenchSectionTitle({ className, ...props }: WorkbenchSectionTitleProps) {
  return <div className={cx('ui-workbench-section-title', className)} {...props} />;
}

function toLengthValue(value: number | string) {
  return typeof value === 'number' ? `${value}px` : value;
}

function toAngleValue(value: number | string) {
  return typeof value === 'number' ? `${value}deg` : value;
}

function toLineLengthValue(start: number | string, end: number | string) {
  if (typeof start === 'number' && typeof end === 'number') {
    return `${Math.max(1, end - start)}px`;
  }
  return `max(1px, calc(${toLengthValue(end)} - ${toLengthValue(start)}))`;
}

export type WorkbenchEditorFrameProps = ComponentPropsWithRef<'div'>;

export function WorkbenchEditorFrame({ className, ...props }: WorkbenchEditorFrameProps) {
  return <div className={cx('ui-workbench-editor-frame', className)} {...props} />;
}

export type WorkbenchEditorBodyProps = ComponentPropsWithRef<'div'>;

export function WorkbenchEditorBody({ className, ...props }: WorkbenchEditorBodyProps) {
  return <div className={cx('ui-workbench-editor-body', className)} {...props} />;
}

export type WorkbenchEditorViewportProps = ComponentPropsWithRef<'div'>;

export function WorkbenchEditorViewport({ className, ...props }: WorkbenchEditorViewportProps) {
  return <div className={cx('ui-workbench-editor-viewport', className)} {...props} />;
}

export interface WorkbenchEditorBottomPanelProps extends ComponentPropsWithRef<'section'> {
  height?: number | string;
}

export function WorkbenchEditorBottomPanel({
  className,
  height = 120,
  style,
  ...props
}: WorkbenchEditorBottomPanelProps) {
  const panelStyle = {
    '--ui-workbench-editor-bottom-panel-height': toLengthValue(height),
    ...style,
  } as CSSProperties;

  return (
    <section
      className={cx('ui-workbench-editor-bottom-panel', className)}
      style={panelStyle}
      {...props}
    />
  );
}

export type WorkbenchEditorBottomPanelHeaderProps = ComponentPropsWithRef<'div'>;

export function WorkbenchEditorBottomPanelHeader({
  className,
  ...props
}: WorkbenchEditorBottomPanelHeaderProps) {
  return <div className={cx('ui-workbench-editor-bottom-panel__header', className)} {...props} />;
}

export type WorkbenchEditorBottomPanelTitleProps = ComponentPropsWithRef<'span'>;

export function WorkbenchEditorBottomPanelTitle({
  className,
  ...props
}: WorkbenchEditorBottomPanelTitleProps) {
  return <span className={cx('ui-workbench-editor-bottom-panel__title', className)} {...props} />;
}

export type WorkbenchEditorBottomPanelBodyProps = ComponentPropsWithRef<'div'>;

export function WorkbenchEditorBottomPanelBody({
  className,
  ...props
}: WorkbenchEditorBottomPanelBodyProps) {
  return <div className={cx('ui-workbench-editor-bottom-panel__body', className)} {...props} />;
}

export type WorkbenchProblemSeverity = 'error' | 'info' | 'warning';

export type WorkbenchProblemListProps = ComponentPropsWithRef<'div'>;

export function WorkbenchProblemList({ className, ...props }: WorkbenchProblemListProps) {
  return <div className={cx('ui-workbench-problem-list', className)} {...props} />;
}

export interface WorkbenchProblemItemProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children'
> {
  location?: ReactNode;
  message: ReactNode;
  severity?: WorkbenchProblemSeverity;
}

export function WorkbenchProblemItem({
  className,
  location,
  message,
  severity = 'error',
  type = 'button',
  ...props
}: WorkbenchProblemItemProps) {
  return (
    <button
      className={cx('ui-workbench-problem-item', className)}
      data-severity={severity}
      type={type}
      {...props}
    >
      {location ? <span className="ui-workbench-problem-item__location">{location}</span> : null}
      <span className="ui-workbench-problem-item__message">{message}</span>
    </button>
  );
}

export type WorkbenchFloatingMenuAlign = 'end' | 'start';
export type WorkbenchFloatingMenuPlacement = 'bottom' | 'top';

export interface WorkbenchFloatingMenuProps extends ComponentPropsWithRef<'div'> {
  align?: WorkbenchFloatingMenuAlign;
  inset?: number | string;
  offset?: number | string;
  placement?: WorkbenchFloatingMenuPlacement;
  width?: number | string;
}

export function WorkbenchFloatingMenu({
  align = 'end',
  className,
  inset = 8,
  offset = 28,
  placement = 'top',
  role = 'menu',
  style,
  width = 180,
  ...props
}: WorkbenchFloatingMenuProps) {
  const menuStyle = {
    '--ui-workbench-floating-menu-inset': toLengthValue(inset),
    '--ui-workbench-floating-menu-offset': toLengthValue(offset),
    '--ui-workbench-floating-menu-width': toLengthValue(width),
    ...style,
  } as CSSProperties;

  return (
    <div
      className={cx('ui-workbench-floating-menu', className)}
      data-align={align}
      data-placement={placement}
      role={role}
      style={menuStyle}
      {...props}
    />
  );
}

export interface WorkbenchFloatingMenuItemProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children'
> {
  icon?: ReactNode | string;
  label: ReactNode;
  meta?: ReactNode;
  selected?: boolean;
}

export function WorkbenchFloatingMenuItem({
  className,
  icon,
  label,
  meta,
  role = 'menuitem',
  selected = false,
  type = 'button',
  ...props
}: WorkbenchFloatingMenuItemProps) {
  const resolvedIcon =
    typeof icon === 'string' ? (
      <i className={cx('codicon', icon.startsWith('codicon-') ? icon : `codicon-${icon}`)} />
    ) : (
      icon
    );

  return (
    <button
      className={cx('ui-workbench-floating-menu__item', className)}
      data-selected={selected ? 'true' : 'false'}
      role={role}
      type={type}
      {...props}
    >
      <span className="ui-workbench-floating-menu__icon">{resolvedIcon}</span>
      <span className="ui-workbench-floating-menu__label">{label}</span>
      {meta ? <span className="ui-workbench-floating-menu__meta">{meta}</span> : null}
    </button>
  );
}

export interface WorkbenchCanvasItemFrameProps extends ComponentPropsWithRef<'div'> {
  cursor?: CSSProperties['cursor'] | undefined;
  height: number | string;
  hovered?: boolean | undefined;
  interactive?: boolean | undefined;
  opacity?: number | string | undefined;
  overflow?: CSSProperties['overflow'] | undefined;
  rotation?: number | string | undefined;
  selected?: boolean | undefined;
  touchAction?: CSSProperties['touchAction'] | undefined;
  transform?: string | undefined;
  transient?: boolean | undefined;
  width: number | string;
  x: number | string;
  y: number | string;
  zIndex?: number | string | undefined;
}

export const WorkbenchCanvasItemFrame = forwardRef<HTMLDivElement, WorkbenchCanvasItemFrameProps>(
  function WorkbenchCanvasItemFrame(
    {
      className,
      cursor,
      height,
      hovered = false,
      interactive = false,
      opacity,
      overflow,
      rotation,
      selected = false,
      style,
      touchAction,
      transform,
      transient = false,
      width,
      x,
      y,
      zIndex,
      ...props
    },
    ref,
  ) {
    const frameStyle = {
      '--ui-workbench-canvas-item-x': toLengthValue(x),
      '--ui-workbench-canvas-item-y': toLengthValue(y),
      '--ui-workbench-canvas-item-width': toLengthValue(width),
      '--ui-workbench-canvas-item-height': toLengthValue(height),
      ...(cursor !== undefined ? { '--ui-workbench-canvas-item-cursor': cursor } : {}),
      ...(opacity !== undefined ? { '--ui-workbench-canvas-item-opacity': String(opacity) } : {}),
      ...(overflow !== undefined ? { '--ui-workbench-canvas-item-overflow': overflow } : {}),
      ...(touchAction !== undefined
        ? { '--ui-workbench-canvas-item-touch-action': touchAction }
        : {}),
      ...(transform !== undefined
        ? { '--ui-workbench-canvas-item-transform': transform }
        : rotation !== undefined
          ? { '--ui-workbench-canvas-item-transform': `rotate(${toAngleValue(rotation)})` }
          : {}),
      ...(zIndex !== undefined ? { '--ui-workbench-canvas-item-z-index': String(zIndex) } : {}),
      ...style,
    } as CSSProperties;

    return (
      <div
        ref={ref}
        className={cx('ui-workbench-canvas-item-frame', className)}
        data-hovered={hovered ? 'true' : 'false'}
        data-interactive={interactive ? 'true' : 'false'}
        data-selected={selected ? 'true' : 'false'}
        data-transient={transient ? 'true' : 'false'}
        style={frameStyle}
        {...props}
      />
    );
  },
);

export type WorkbenchCanvasPaneSurfaceProps = ComponentPropsWithRef<'div'>;

export const WorkbenchCanvasPaneSurface = forwardRef<
  HTMLDivElement,
  WorkbenchCanvasPaneSurfaceProps
>(function WorkbenchCanvasPaneSurface({ className, ...props }, ref) {
  return <div ref={ref} className={cx('ui-workbench-canvas-pane-surface', className)} {...props} />;
});

export interface WorkbenchCanvasFrameSurfaceProps extends ComponentPropsWithRef<'div'> {
  bottom?: number | string | undefined;
  height?: number | string | undefined;
  left?: number | string | undefined;
  opacity?: number | string | undefined;
  right?: number | string | undefined;
  selected?: boolean | undefined;
  top?: number | string | undefined;
  transform?: string | undefined;
  transient?: boolean | undefined;
  width?: number | string | undefined;
}

export function WorkbenchCanvasFrameSurface({
  bottom,
  className,
  height,
  left,
  opacity,
  right,
  selected = false,
  style,
  top,
  transform,
  transient = false,
  width,
  ...props
}: WorkbenchCanvasFrameSurfaceProps) {
  const surfaceStyle = {
    ...(bottom !== undefined
      ? { '--ui-workbench-canvas-frame-bottom': toLengthValue(bottom) }
      : {}),
    ...(height !== undefined
      ? { '--ui-workbench-canvas-frame-height': toLengthValue(height) }
      : {}),
    ...(left !== undefined ? { '--ui-workbench-canvas-frame-left': toLengthValue(left) } : {}),
    ...(opacity !== undefined ? { '--ui-workbench-canvas-frame-opacity': String(opacity) } : {}),
    ...(right !== undefined ? { '--ui-workbench-canvas-frame-right': toLengthValue(right) } : {}),
    ...(top !== undefined ? { '--ui-workbench-canvas-frame-top': toLengthValue(top) } : {}),
    ...(transform !== undefined ? { '--ui-workbench-canvas-frame-transform': transform } : {}),
    ...(width !== undefined ? { '--ui-workbench-canvas-frame-width': toLengthValue(width) } : {}),
    ...style,
  } as CSSProperties;

  return (
    <div
      className={cx('ui-workbench-canvas-frame-surface', className)}
      data-selected={selected ? 'true' : 'false'}
      data-transient={transient ? 'true' : 'false'}
      style={surfaceStyle}
      {...props}
    />
  );
}

export interface WorkbenchCanvasViewportProps extends ComponentPropsWithRef<'div'> {
  grid?: boolean | undefined;
  gridSize?: number | string | undefined;
  height: number | string;
  width: number | string;
}

export const WorkbenchCanvasViewport = forwardRef<HTMLDivElement, WorkbenchCanvasViewportProps>(
  function WorkbenchCanvasViewport(
    { className, grid = true, gridSize = 20, height, style, width, ...props },
    ref,
  ) {
    const viewportStyle = {
      '--ui-workbench-canvas-viewport-width': toLengthValue(width),
      '--ui-workbench-canvas-viewport-height': toLengthValue(height),
      '--ui-workbench-canvas-viewport-grid-size': toLengthValue(gridSize),
      ...style,
    } as CSSProperties;

    return (
      <div
        ref={ref}
        className={cx('ui-workbench-canvas-viewport', className)}
        data-grid={grid ? 'true' : 'false'}
        style={viewportStyle}
        {...props}
      />
    );
  },
);

export interface WorkbenchCanvasSelectionMarqueeProps extends ComponentPropsWithRef<'div'> {
  height: number | string;
  width: number | string;
  x: number | string;
  y: number | string;
}

export function WorkbenchCanvasSelectionMarquee({
  className,
  height,
  style,
  width,
  x,
  y,
  ...props
}: WorkbenchCanvasSelectionMarqueeProps) {
  const marqueeStyle = {
    '--ui-workbench-canvas-selection-marquee-x': toLengthValue(x),
    '--ui-workbench-canvas-selection-marquee-y': toLengthValue(y),
    '--ui-workbench-canvas-selection-marquee-width': toLengthValue(width),
    '--ui-workbench-canvas-selection-marquee-height': toLengthValue(height),
    ...style,
  } as CSSProperties;

  return (
    <div
      className={cx('ui-workbench-canvas-selection-marquee', className)}
      style={marqueeStyle}
      {...props}
    />
  );
}

export type WorkbenchCanvasGuideBlockTone = 'gap' | 'padding';

export interface WorkbenchCanvasGuideBlockProps extends ComponentPropsWithRef<'div'> {
  height: number | string;
  tone?: WorkbenchCanvasGuideBlockTone | undefined;
  width: number | string;
  x: number | string;
  y: number | string;
  zIndex?: number | string | undefined;
}

export function WorkbenchCanvasGuideBlock({
  className,
  height,
  style,
  tone = 'gap',
  width,
  x,
  y,
  zIndex,
  ...props
}: WorkbenchCanvasGuideBlockProps) {
  const blockStyle = {
    '--ui-workbench-canvas-guide-block-x': toLengthValue(x),
    '--ui-workbench-canvas-guide-block-y': toLengthValue(y),
    '--ui-workbench-canvas-guide-block-width': toLengthValue(width),
    '--ui-workbench-canvas-guide-block-height': toLengthValue(height),
    ...(zIndex !== undefined
      ? { '--ui-workbench-canvas-guide-block-z-index': String(zIndex) }
      : {}),
    ...style,
  } as CSSProperties;

  return (
    <div
      className={cx('ui-workbench-canvas-guide-block', className)}
      data-tone={tone}
      style={blockStyle}
      {...props}
    />
  );
}

export interface WorkbenchCanvasPlaceholderProps extends ComponentPropsWithRef<'div'> {
  height?: number | string | undefined;
  width?: number | string | undefined;
  x?: number | string | undefined;
  y?: number | string | undefined;
}

export function WorkbenchCanvasPlaceholder({
  className,
  height,
  style,
  width,
  x,
  y,
  ...props
}: WorkbenchCanvasPlaceholderProps) {
  const positioned =
    x !== undefined || y !== undefined || width !== undefined || height !== undefined;
  const placeholderStyle = {
    ...(x !== undefined ? { '--ui-workbench-canvas-placeholder-x': toLengthValue(x) } : {}),
    ...(y !== undefined ? { '--ui-workbench-canvas-placeholder-y': toLengthValue(y) } : {}),
    ...(width !== undefined
      ? { '--ui-workbench-canvas-placeholder-width': toLengthValue(width) }
      : {}),
    ...(height !== undefined
      ? { '--ui-workbench-canvas-placeholder-height': toLengthValue(height) }
      : {}),
    ...style,
  } as CSSProperties;

  return (
    <div
      className={cx('ui-workbench-canvas-placeholder', className)}
      data-positioned={positioned ? 'true' : 'false'}
      style={placeholderStyle}
      {...props}
    />
  );
}

export interface WorkbenchCanvasDropIndicatorProps extends ComponentPropsWithRef<'div'> {
  height: number | string;
  width: number | string;
  x: number | string;
  y: number | string;
  zIndex?: number | string | undefined;
}

export function WorkbenchCanvasDropIndicator({
  className,
  height,
  style,
  width,
  x,
  y,
  zIndex,
  ...props
}: WorkbenchCanvasDropIndicatorProps) {
  const indicatorStyle = {
    '--ui-workbench-canvas-drop-indicator-x': toLengthValue(x),
    '--ui-workbench-canvas-drop-indicator-y': toLengthValue(y),
    '--ui-workbench-canvas-drop-indicator-width': toLengthValue(width),
    '--ui-workbench-canvas-drop-indicator-height': toLengthValue(height),
    ...(zIndex !== undefined
      ? { '--ui-workbench-canvas-drop-indicator-z-index': String(zIndex) }
      : {}),
    ...style,
  } as CSSProperties;

  return (
    <div
      className={cx('ui-workbench-canvas-drop-indicator', className)}
      style={indicatorStyle}
      {...props}
    />
  );
}

export interface WorkbenchCanvasDragPreviewFrameProps extends ComponentPropsWithRef<'div'> {
  height: number | string;
  opacity?: number | string | undefined;
  rotation?: number | string | undefined;
  width: number | string;
  x: number | string;
  y: number | string;
  zIndex?: number | string | undefined;
}

export function WorkbenchCanvasDragPreviewFrame({
  className,
  height,
  opacity,
  rotation,
  style,
  width,
  x,
  y,
  zIndex,
  ...props
}: WorkbenchCanvasDragPreviewFrameProps) {
  const frameStyle = {
    '--ui-workbench-canvas-drag-preview-frame-x': toLengthValue(x),
    '--ui-workbench-canvas-drag-preview-frame-y': toLengthValue(y),
    '--ui-workbench-canvas-drag-preview-frame-width': toLengthValue(width),
    '--ui-workbench-canvas-drag-preview-frame-height': toLengthValue(height),
    ...(opacity !== undefined
      ? { '--ui-workbench-canvas-drag-preview-frame-opacity': String(opacity) }
      : {}),
    ...(rotation !== undefined
      ? {
          '--ui-workbench-canvas-drag-preview-frame-transform': `rotate(${toAngleValue(rotation)})`,
        }
      : {}),
    ...(zIndex !== undefined
      ? { '--ui-workbench-canvas-drag-preview-frame-z-index': String(zIndex) }
      : {}),
    ...style,
  } as CSSProperties;

  return (
    <div
      className={cx('ui-workbench-canvas-drag-preview-frame', className)}
      style={frameStyle}
      {...props}
    />
  );
}

export type WorkbenchCanvasGuideLineAxis = 'x' | 'y';
export type WorkbenchCanvasGuideLineSource = 'grid' | 'object';

export type WorkbenchCanvasGuideLayerProps = ComponentPropsWithRef<'div'>;

export function WorkbenchCanvasGuideLayer({ className, ...props }: WorkbenchCanvasGuideLayerProps) {
  return <div className={cx('ui-workbench-canvas-guide-layer', className)} {...props} />;
}

export interface WorkbenchCanvasGuideLineProps extends ComponentPropsWithRef<'div'> {
  axis: WorkbenchCanvasGuideLineAxis;
  end: number | string;
  position: number | string;
  source?: WorkbenchCanvasGuideLineSource | undefined;
  start: number | string;
}

export function WorkbenchCanvasGuideLine({
  axis,
  className,
  end,
  position,
  source = 'grid',
  start,
  style,
  ...props
}: WorkbenchCanvasGuideLineProps) {
  const lineStyle = {
    '--ui-workbench-canvas-guide-line-position': toLengthValue(position),
    '--ui-workbench-canvas-guide-line-start': toLengthValue(start),
    '--ui-workbench-canvas-guide-line-length': toLineLengthValue(start, end),
    ...style,
  } as CSSProperties;

  return (
    <div
      className={cx('ui-workbench-canvas-guide-line', className)}
      data-axis={axis}
      data-source={source}
      style={lineStyle}
      {...props}
    />
  );
}

export interface WorkbenchCanvasDragGhostProps extends ComponentPropsWithRef<'div'> {
  height: number | string;
  opacity?: number | string | undefined;
  scale?: number | string | undefined;
  width: number | string;
  x: number | string;
  y: number | string;
  zIndex?: number | string | undefined;
}

export function WorkbenchCanvasDragGhost({
  className,
  height,
  opacity,
  scale = 1.06,
  style,
  width,
  x,
  y,
  zIndex,
  ...props
}: WorkbenchCanvasDragGhostProps) {
  const ghostStyle = {
    '--ui-workbench-canvas-drag-ghost-x': toLengthValue(x),
    '--ui-workbench-canvas-drag-ghost-y': toLengthValue(y),
    '--ui-workbench-canvas-drag-ghost-width': toLengthValue(width),
    '--ui-workbench-canvas-drag-ghost-height': toLengthValue(height),
    '--ui-workbench-canvas-drag-ghost-scale': String(scale),
    ...(opacity !== undefined
      ? { '--ui-workbench-canvas-drag-ghost-opacity': String(opacity) }
      : {}),
    ...(zIndex !== undefined ? { '--ui-workbench-canvas-drag-ghost-z-index': String(zIndex) } : {}),
    ...style,
  } as CSSProperties;

  return (
    <div
      className={cx('ui-workbench-canvas-drag-ghost', className)}
      style={ghostStyle}
      {...props}
    />
  );
}

export interface WorkbenchCanvasDragGhostContentProps extends ComponentPropsWithRef<'div'> {
  height: number | string;
  scale?: number | string | undefined;
  width: number | string;
}

export function WorkbenchCanvasDragGhostContent({
  className,
  height,
  scale = 1,
  style,
  width,
  ...props
}: WorkbenchCanvasDragGhostContentProps) {
  const contentStyle = {
    '--ui-workbench-canvas-drag-ghost-content-width': toLengthValue(width),
    '--ui-workbench-canvas-drag-ghost-content-height': toLengthValue(height),
    '--ui-workbench-canvas-drag-ghost-content-scale': String(scale),
    ...style,
  } as CSSProperties;

  return (
    <div
      className={cx('ui-workbench-canvas-drag-ghost__content', className)}
      style={contentStyle}
      {...props}
    />
  );
}

interface WorkbenchCanvasFrameHandleDrag {
  pointerId: number;
  startX: number;
  startY: number;
}

export interface WorkbenchCanvasFrameHandleProps extends Omit<
  ComponentPropsWithRef<'div'>,
  | 'children'
  | 'onDragEnd'
  | 'onDragStart'
  | 'onPointerCancel'
  | 'onPointerDown'
  | 'onPointerMove'
  | 'onPointerUp'
> {
  children?: ReactNode;
  label?: ReactNode;
  onDragCancel?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onDragEnd?: (dx: number, dy: number, event: ReactPointerEvent<HTMLDivElement>) => void;
  onDragMove?: (dx: number, dy: number, event: ReactPointerEvent<HTMLDivElement>) => void;
  onDragStart?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  stopPropagation?: boolean;
}

export function WorkbenchCanvasFrameHandle({
  children,
  className,
  label,
  onDragCancel,
  onDragEnd,
  onDragMove,
  onDragStart,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  stopPropagation = true,
  ...props
}: WorkbenchCanvasFrameHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<WorkbenchCanvasFrameHandleDrag | null>(null);
  const content = children ?? label;

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    if (event.defaultPrevented || event.button !== 0) return;

    const element = handleRef.current;
    if (!element) return;

    if (stopPropagation) event.stopPropagation();
    element.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    onDragStart?.(event);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    onDragMove?.(event.clientX - drag.startX, event.clientY - drag.startY, event);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerUp?.(event);
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    handleRef.current?.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (dx !== 0 || dy !== 0) {
      onDragEnd?.(dx, dy, event);
    } else {
      onDragCancel?.(event);
    }
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerCancel?.(event);
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    handleRef.current?.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    onDragCancel?.(event);
  };

  return (
    <div
      ref={handleRef}
      className={cx('ui-workbench-canvas-frame-handle', className)}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      {...props}
    >
      <span className="ui-workbench-canvas-frame-handle__label">{content}</span>
    </div>
  );
}

export interface WorkbenchCanvasItemBadgeProps extends ComponentPropsWithRef<'span'> {
  selected?: boolean | undefined;
}

export function WorkbenchCanvasItemBadge({
  className,
  selected = false,
  ...props
}: WorkbenchCanvasItemBadgeProps) {
  return (
    <span
      className={cx('ui-workbench-canvas-item-badge', className)}
      data-selected={selected ? 'true' : 'false'}
      {...props}
    />
  );
}

export interface WorkbenchCanvasResizeHandleProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children'
> {
  label?: string | undefined;
  position?: WorkbenchCanvasResizeHandlePosition | undefined;
}

export type WorkbenchCanvasResizeHandlePosition = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export function WorkbenchCanvasResizeHandle({
  className,
  label = 'Resize',
  position = 'se',
  type = 'button',
  ...props
}: WorkbenchCanvasResizeHandleProps) {
  return (
    <button
      aria-label={label}
      className={cx('ui-workbench-canvas-resize-handle', className)}
      data-position={position}
      title={label}
      type={type}
      {...props}
    />
  );
}

export interface WorkbenchCanvasResizeFrameProps extends ComponentPropsWithRef<'div'> {
  height: number | string;
  width: number | string;
  x: number | string;
  y: number | string;
  zIndex?: number | string;
}

export const WorkbenchCanvasResizeFrame = forwardRef<
  HTMLDivElement,
  WorkbenchCanvasResizeFrameProps
>(function WorkbenchCanvasResizeFrame(
  { className, height, style, width, x, y, zIndex, ...props },
  ref,
) {
  const frameStyle = {
    '--ui-workbench-canvas-resize-frame-x': toLengthValue(x),
    '--ui-workbench-canvas-resize-frame-y': toLengthValue(y),
    '--ui-workbench-canvas-resize-frame-width': toLengthValue(width),
    '--ui-workbench-canvas-resize-frame-height': toLengthValue(height),
    ...(zIndex !== undefined
      ? { '--ui-workbench-canvas-resize-frame-z-index': String(zIndex) }
      : {}),
    ...style,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={cx('ui-workbench-canvas-resize-frame', className)}
      style={frameStyle}
      {...props}
    />
  );
});

export interface WorkbenchCanvasResizePreviewProps extends ComponentPropsWithRef<'div'> {
  height: number | string;
  width: number | string;
  x: number | string;
  y: number | string;
  zIndex?: number | string;
}

export function WorkbenchCanvasResizePreview({
  className,
  height,
  style,
  width,
  x,
  y,
  zIndex,
  ...props
}: WorkbenchCanvasResizePreviewProps) {
  const previewStyle = {
    '--ui-workbench-canvas-resize-preview-x': toLengthValue(x),
    '--ui-workbench-canvas-resize-preview-y': toLengthValue(y),
    '--ui-workbench-canvas-resize-preview-width': toLengthValue(width),
    '--ui-workbench-canvas-resize-preview-height': toLengthValue(height),
    ...(zIndex !== undefined
      ? { '--ui-workbench-canvas-resize-preview-z-index': String(zIndex) }
      : {}),
    ...style,
  } as CSSProperties;

  return (
    <div
      className={cx('ui-workbench-canvas-resize-preview', className)}
      style={previewStyle}
      {...props}
    />
  );
}

export interface WorkbenchRenderSurfaceProps extends ComponentPropsWithRef<'div'> {
  transparent?: boolean | undefined;
}

export function WorkbenchRenderSurface({
  className,
  transparent = false,
  ...props
}: WorkbenchRenderSurfaceProps) {
  return (
    <div
      className={cx('ui-workbench-render-surface', className)}
      data-transparent={transparent ? 'true' : 'false'}
      {...props}
    />
  );
}

export type WorkbenchFullscreenLauncherRootProps = ComponentPropsWithRef<'div'>;

export const WorkbenchFullscreenLauncherRoot = forwardRef<
  HTMLDivElement,
  WorkbenchFullscreenLauncherRootProps
>(function WorkbenchFullscreenLauncherRoot({ className, ...props }, ref) {
  return <div ref={ref} className={cx('ui-workbench-fullscreen-root', className)} {...props} />;
});

export type WorkbenchFullscreenBackdropProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenBackdrop({
  className,
  ...props
}: WorkbenchFullscreenBackdropProps) {
  return <div className={cx('ui-workbench-fullscreen-backdrop', className)} {...props} />;
}

export interface WorkbenchFullscreenBackdropImageProps extends ComponentPropsWithRef<'img'> {
  src: string;
}

export function WorkbenchFullscreenBackdropImage({
  alt = '',
  className,
  ...props
}: WorkbenchFullscreenBackdropImageProps) {
  return (
    <img
      alt={alt}
      className={cx('ui-workbench-fullscreen-backdrop__image', className)}
      {...props}
    />
  );
}

export type WorkbenchFullscreenBackdropScrimProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenBackdropScrim({
  className,
  ...props
}: WorkbenchFullscreenBackdropScrimProps) {
  return (
    <div
      aria-hidden="true"
      className={cx('ui-workbench-fullscreen-backdrop__scrim', className)}
      {...props}
    />
  );
}

export type WorkbenchFullscreenContentProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenContent({
  className,
  ...props
}: WorkbenchFullscreenContentProps) {
  return <div className={cx('ui-workbench-fullscreen-content', className)} {...props} />;
}

export type WorkbenchFullscreenHeaderProps = ComponentPropsWithRef<'header'>;

export function WorkbenchFullscreenHeader({ className, ...props }: WorkbenchFullscreenHeaderProps) {
  return <header className={cx('ui-workbench-fullscreen-header', className)} {...props} />;
}

export type WorkbenchFullscreenHeaderBrandProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenHeaderBrand({
  className,
  ...props
}: WorkbenchFullscreenHeaderBrandProps) {
  return <div className={cx('ui-workbench-fullscreen-header__brand', className)} {...props} />;
}

export type WorkbenchFullscreenHeaderTitleProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenHeaderTitle({
  className,
  ...props
}: WorkbenchFullscreenHeaderTitleProps) {
  return <div className={cx('ui-workbench-fullscreen-header__title', className)} {...props} />;
}

export type WorkbenchFullscreenHeaderSubtitleProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenHeaderSubtitle({
  className,
  ...props
}: WorkbenchFullscreenHeaderSubtitleProps) {
  return <div className={cx('ui-workbench-fullscreen-header__subtitle', className)} {...props} />;
}

export type WorkbenchFullscreenHeaderActionsProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenHeaderActions({
  className,
  ...props
}: WorkbenchFullscreenHeaderActionsProps) {
  return <div className={cx('ui-workbench-fullscreen-header__actions', className)} {...props} />;
}

export interface WorkbenchFullscreenButtonProps extends ComponentPropsWithRef<'button'> {
  icon?: string | undefined;
  prominent?: boolean | undefined;
}

export function WorkbenchFullscreenButton({
  children,
  className,
  icon,
  prominent = false,
  type = 'button',
  ...props
}: WorkbenchFullscreenButtonProps) {
  const iconClassName = icon ? (icon.startsWith('codicon-') ? icon : `codicon-${icon}`) : null;

  return (
    <button
      className={cx('ui-workbench-fullscreen-button', className)}
      data-prominent={prominent ? 'true' : 'false'}
      type={type}
      {...props}
    >
      {iconClassName ? <span className={cx('codicon', iconClassName)} aria-hidden /> : null}
      <span>{children}</span>
    </button>
  );
}

export type WorkbenchFullscreenHeroProps = ComponentPropsWithRef<'section'>;

export function WorkbenchFullscreenHero({ className, ...props }: WorkbenchFullscreenHeroProps) {
  return <section className={cx('ui-workbench-fullscreen-hero', className)} {...props} />;
}

export type WorkbenchFullscreenHeroMetaProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenHeroMeta({
  className,
  ...props
}: WorkbenchFullscreenHeroMetaProps) {
  return <div className={cx('ui-workbench-fullscreen-hero__meta', className)} {...props} />;
}

export type WorkbenchFullscreenHeroTitleProps = ComponentPropsWithRef<'h1'>;

export function WorkbenchFullscreenHeroTitle({
  className,
  ...props
}: WorkbenchFullscreenHeroTitleProps) {
  return <h1 className={cx('ui-workbench-fullscreen-hero__title', className)} {...props} />;
}

export type WorkbenchFullscreenPillRowProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenPillRow({
  className,
  ...props
}: WorkbenchFullscreenPillRowProps) {
  return <div className={cx('ui-workbench-fullscreen-pill-row', className)} {...props} />;
}

export type WorkbenchFullscreenPillProps = ComponentPropsWithRef<'span'>;

export function WorkbenchFullscreenPill({ className, ...props }: WorkbenchFullscreenPillProps) {
  return <span className={cx('ui-workbench-fullscreen-pill', className)} {...props} />;
}

export type WorkbenchFullscreenHeroActionRowProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenHeroActionRow({
  className,
  ...props
}: WorkbenchFullscreenHeroActionRowProps) {
  return <div className={cx('ui-workbench-fullscreen-hero__action-row', className)} {...props} />;
}

export type WorkbenchFullscreenHeroStatusProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenHeroStatus({
  className,
  ...props
}: WorkbenchFullscreenHeroStatusProps) {
  return <div className={cx('ui-workbench-fullscreen-hero__status', className)} {...props} />;
}

export type WorkbenchFullscreenEmptyProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenEmpty({ className, ...props }: WorkbenchFullscreenEmptyProps) {
  return <div className={cx('ui-workbench-fullscreen-empty', className)} {...props} />;
}

export type WorkbenchFullscreenEmptyTitleProps = ComponentPropsWithRef<'h1'>;

export function WorkbenchFullscreenEmptyTitle({
  className,
  ...props
}: WorkbenchFullscreenEmptyTitleProps) {
  return <h1 className={cx('ui-workbench-fullscreen-empty__title', className)} {...props} />;
}

export type WorkbenchFullscreenEmptyTextProps = ComponentPropsWithRef<'p'>;

export function WorkbenchFullscreenEmptyText({
  className,
  ...props
}: WorkbenchFullscreenEmptyTextProps) {
  return <p className={cx('ui-workbench-fullscreen-empty__text', className)} {...props} />;
}

export type WorkbenchFullscreenCarouselProps = ComponentPropsWithRef<'section'>;

export function WorkbenchFullscreenCarousel({
  className,
  ...props
}: WorkbenchFullscreenCarouselProps) {
  return <section className={cx('ui-workbench-fullscreen-carousel', className)} {...props} />;
}

export type WorkbenchFullscreenCarouselViewportProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenCarouselViewport({
  className,
  ...props
}: WorkbenchFullscreenCarouselViewportProps) {
  return <div className={cx('ui-workbench-fullscreen-carousel__viewport', className)} {...props} />;
}

export interface WorkbenchFullscreenNavButtonProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children'
> {
  icon: string;
  label: string;
}

export function WorkbenchFullscreenNavButton({
  className,
  icon,
  label,
  type = 'button',
  ...props
}: WorkbenchFullscreenNavButtonProps) {
  const iconClassName = icon.startsWith('codicon-') ? icon : `codicon-${icon}`;

  return (
    <button
      aria-label={label}
      className={cx('ui-workbench-fullscreen-nav-button', className)}
      title={label}
      type={type}
      {...props}
    >
      <span className={cx('codicon', iconClassName)} aria-hidden />
    </button>
  );
}

export interface WorkbenchFullscreenOptionProps extends ComponentPropsWithRef<'div'> {
  selected?: boolean | undefined;
}

export function WorkbenchFullscreenOption({
  className,
  selected = false,
  ...props
}: WorkbenchFullscreenOptionProps) {
  return (
    <div
      aria-selected={selected}
      className={cx('ui-workbench-fullscreen-option', className)}
      data-selected={selected ? 'true' : 'false'}
      role="option"
      tabIndex={0}
      {...props}
    />
  );
}

export type WorkbenchFullscreenArtworkTone = 'accent' | 'success';

export interface WorkbenchFullscreenOptionArtworkProps extends ComponentPropsWithRef<'div'> {
  tone?: WorkbenchFullscreenArtworkTone | undefined;
}

export function WorkbenchFullscreenOptionArtwork({
  className,
  tone = 'success',
  ...props
}: WorkbenchFullscreenOptionArtworkProps) {
  return (
    <div
      className={cx('ui-workbench-fullscreen-option__artwork', className)}
      data-tone={tone}
      {...props}
    />
  );
}

export type WorkbenchFullscreenOptionImageProps = ComponentPropsWithRef<'img'>;

export function WorkbenchFullscreenOptionImage({
  alt = '',
  className,
  ...props
}: WorkbenchFullscreenOptionImageProps) {
  return (
    <img alt={alt} className={cx('ui-workbench-fullscreen-option__image', className)} {...props} />
  );
}

export interface WorkbenchFullscreenOptionPlaceholderProps extends ComponentPropsWithRef<'span'> {
  icon?: string | undefined;
}

export function WorkbenchFullscreenOptionPlaceholder({
  className,
  icon = 'device-desktop',
  ...props
}: WorkbenchFullscreenOptionPlaceholderProps) {
  const iconClassName = icon.startsWith('codicon-') ? icon : `codicon-${icon}`;

  return (
    <span
      aria-hidden="true"
      className={cx(
        'codicon',
        iconClassName,
        'ui-workbench-fullscreen-option__placeholder',
        className,
      )}
      {...props}
    />
  );
}

export type WorkbenchFullscreenOptionBodyProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenOptionBody({
  className,
  ...props
}: WorkbenchFullscreenOptionBodyProps) {
  return <div className={cx('ui-workbench-fullscreen-option__body', className)} {...props} />;
}

export type WorkbenchFullscreenOptionTitleProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenOptionTitle({
  className,
  ...props
}: WorkbenchFullscreenOptionTitleProps) {
  return <div className={cx('ui-workbench-fullscreen-option__title', className)} {...props} />;
}

export type WorkbenchFullscreenOptionMetaProps = ComponentPropsWithRef<'div'>;

export function WorkbenchFullscreenOptionMeta({
  className,
  ...props
}: WorkbenchFullscreenOptionMetaProps) {
  return <div className={cx('ui-workbench-fullscreen-option__meta', className)} {...props} />;
}

function treeIndentOffset(depth: number, indentSize: number) {
  return `${8 + depth * indentSize}px`;
}

export interface WorkbenchTreeProps extends ComponentPropsWithRef<'div'> {
  indentSize?: number | string;
  rowHeight?: number | string;
}

export function WorkbenchTree({
  className,
  indentSize,
  role = 'tree',
  rowHeight,
  style,
  ...props
}: WorkbenchTreeProps) {
  const treeStyle = {
    ...(indentSize !== undefined
      ? { '--ui-workbench-tree-indent-size': toLengthValue(indentSize) }
      : null),
    ...(rowHeight !== undefined
      ? { '--ui-workbench-tree-row-height': toLengthValue(rowHeight) }
      : null),
    ...style,
  } as CSSProperties;

  return (
    <div className={cx('ui-workbench-tree', className)} role={role} style={treeStyle} {...props} />
  );
}

export type WorkbenchTreeInteraction = 'default' | 'draggable' | 'dragging';

export interface WorkbenchTreeItemProps extends ComponentPropsWithRef<'div'> {
  actions?: ReactNode;
  control?: ReactNode;
  depth?: number;
  icon?: ReactNode;
  indentSize?: number;
  interaction?: WorkbenchTreeInteraction;
  label: ReactNode;
  meta?: ReactNode;
  selected?: boolean;
}

export const WorkbenchTreeItem = forwardRef<HTMLDivElement, WorkbenchTreeItemProps>(
  function WorkbenchTreeItem(
    {
      actions,
      children,
      className,
      control,
      depth = 0,
      icon,
      indentSize = 14,
      interaction = 'default',
      label,
      meta,
      role = 'treeitem',
      selected = false,
      style,
      tabIndex = 0,
      ...props
    },
    ref,
  ) {
    const itemStyle = {
      '--ui-workbench-tree-depth': depth,
      '--ui-workbench-tree-indent-offset': treeIndentOffset(depth, indentSize),
      ...style,
    } as CSSProperties;

    return (
      <div
        ref={ref}
        aria-selected={selected}
        className={cx('ui-workbench-tree-item', className)}
        data-interaction={interaction}
        data-selected={selected ? 'true' : 'false'}
        role={role}
        style={itemStyle}
        tabIndex={tabIndex}
        {...props}
      >
        <span className="ui-workbench-tree-item__control">{control}</span>
        <span className="ui-workbench-tree-item__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="ui-workbench-tree-item__label">{label}</span>
        {meta ? <span className="ui-workbench-tree-item__meta">{meta}</span> : null}
        {actions ? <span className="ui-workbench-tree-item__actions">{actions}</span> : null}
        {children}
      </div>
    );
  },
);

export interface WorkbenchTreeExpanderProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children'
> {
  expanded?: boolean;
  label?: string;
  visible?: boolean;
}

export function WorkbenchTreeExpander({
  className,
  disabled,
  expanded = false,
  label,
  tabIndex,
  type = 'button',
  visible = true,
  ...props
}: WorkbenchTreeExpanderProps) {
  return (
    <button
      aria-expanded={visible ? expanded : undefined}
      aria-hidden={visible ? undefined : true}
      aria-label={visible ? label : undefined}
      className={cx('ui-workbench-tree-expander', className)}
      data-visible={visible ? 'true' : 'false'}
      disabled={!visible || disabled}
      tabIndex={visible ? tabIndex : -1}
      type={type}
      {...props}
    >
      <i
        aria-hidden="true"
        className={cx('codicon', expanded ? 'codicon-chevron-down' : 'codicon-chevron-right')}
      />
    </button>
  );
}

export interface WorkbenchTreeActionButtonProps extends IconButtonProps {
  active?: boolean;
  tone?: 'default' | 'muted' | 'warning';
  visible?: boolean;
}

export function WorkbenchTreeActionButton({
  active = false,
  className,
  compact = true,
  tabIndex,
  tone = 'default',
  visible = false,
  ...props
}: WorkbenchTreeActionButtonProps) {
  return (
    <IconButton
      className={cx('ui-workbench-tree-action', className)}
      compact={compact}
      data-active={active ? 'true' : 'false'}
      data-tone={tone}
      data-visible={visible ? 'true' : 'false'}
      tabIndex={visible ? tabIndex : -1}
      {...props}
    />
  );
}

export interface WorkbenchTreeDropLineProps extends ComponentPropsWithRef<'div'> {
  position: 'above' | 'below';
}

export function WorkbenchTreeDropLine({
  className,
  position,
  ...props
}: WorkbenchTreeDropLineProps) {
  return (
    <div
      aria-hidden="true"
      className={cx('ui-workbench-tree-drop-line', className)}
      data-position={position}
      {...props}
    />
  );
}

export interface WorkbenchTreeDropZoneProps extends ComponentPropsWithRef<'div'> {
  depth?: number;
  empty?: boolean;
  highlighted?: boolean;
  indentSize?: number;
}

export const WorkbenchTreeDropZone = forwardRef<HTMLDivElement, WorkbenchTreeDropZoneProps>(
  function WorkbenchTreeDropZone(
    { className, depth = 0, empty = false, highlighted = false, indentSize = 14, style, ...props },
    ref,
  ) {
    const zoneStyle = {
      '--ui-workbench-tree-depth': depth,
      '--ui-workbench-tree-indent-offset': treeIndentOffset(depth, indentSize),
      ...style,
    } as CSSProperties;

    return (
      <div
        ref={ref}
        className={cx('ui-workbench-tree-drop-zone', className)}
        data-empty={empty ? 'true' : 'false'}
        data-highlighted={highlighted ? 'true' : 'false'}
        style={zoneStyle}
        {...props}
      />
    );
  },
);

export interface WorkbenchTreeDragOverlayProps extends ComponentPropsWithRef<'div'> {
  rowHeight?: number | string;
}

export function WorkbenchTreeDragOverlay({
  className,
  rowHeight,
  style,
  ...props
}: WorkbenchTreeDragOverlayProps) {
  const overlayStyle = {
    ...(rowHeight !== undefined
      ? { '--ui-workbench-tree-row-height': toLengthValue(rowHeight) }
      : null),
    ...style,
  } as CSSProperties;

  return (
    <div
      className={cx('ui-workbench-tree-drag-overlay', className)}
      style={overlayStyle}
      {...props}
    />
  );
}

export interface WorkbenchDragPreviewProps extends ComponentPropsWithRef<'div'> {
  maxWidth?: number | string;
  offset?: number | string;
  x: number | string;
  y: number | string;
}

export function WorkbenchDragPreview({
  children,
  className,
  maxWidth = 160,
  offset = 8,
  style,
  x,
  y,
  ...props
}: WorkbenchDragPreviewProps) {
  const previewStyle = {
    '--ui-workbench-drag-preview-x': toLengthValue(x),
    '--ui-workbench-drag-preview-y': toLengthValue(y),
    '--ui-workbench-drag-preview-offset': toLengthValue(offset),
    '--ui-workbench-drag-preview-max-width': toLengthValue(maxWidth),
    ...style,
  } as CSSProperties;

  return (
    <div className={cx('ui-workbench-drag-preview', className)} style={previewStyle} {...props}>
      <span className="ui-workbench-drag-preview__label">{children}</span>
    </div>
  );
}

export type WorkbenchTemplateGlyphIcon =
  | 'badge'
  | 'color'
  | 'flex'
  | 'frame'
  | 'grid'
  | 'image'
  | 'list'
  | 'text';

export interface WorkbenchTemplateGlyphProps extends ComponentPropsWithRef<'span'> {
  accent: string;
  icon: WorkbenchTemplateGlyphIcon;
}

export function WorkbenchTemplateGlyph({
  accent,
  className,
  icon,
  style,
  ...props
}: WorkbenchTemplateGlyphProps) {
  const glyphStyle = {
    '--ui-workbench-template-glyph-accent': accent,
    ...style,
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      className={cx('ui-workbench-template-glyph', className)}
      data-icon={icon}
      style={glyphStyle}
      {...props}
    >
      {icon === 'text' ? <span className="ui-workbench-template-glyph__text">T</span> : null}
      {icon === 'list'
        ? [0, 1, 2].map((index) => (
            <span key={index} className="ui-workbench-template-glyph__list-line" />
          ))
        : null}
      {icon === 'flex'
        ? [0, 1, 2].map((index) => (
            <span key={index} className="ui-workbench-template-glyph__flex-bar" />
          ))
        : null}
      {icon === 'image' ? <span className="ui-workbench-template-glyph__image-mark" /> : null}
      {icon === 'badge' ? <span className="ui-workbench-template-glyph__badge-mark" /> : null}
    </span>
  );
}

export type WorkbenchDividerProps = ComponentPropsWithRef<'div'>;

export function WorkbenchDivider({ className, ...props }: WorkbenchDividerProps) {
  return <div className={cx('ui-workbench-divider', className)} {...props} />;
}

export type WorkbenchPropertyRowProps = FieldProps;

export function WorkbenchPropertyRow({ className, ...props }: WorkbenchPropertyRowProps) {
  return <Field className={cx('ui-workbench-property-row', className)} {...props} />;
}

export interface WorkbenchPropertyTextRowProps extends Omit<WorkbenchPropertyRowProps, 'children'> {
  controlWidth?: ControlWidth;
  disabled?: boolean | undefined;
  onValueChange?: (value: string) => void;
  placeholder?: string | undefined;
  readOnly?: boolean | undefined;
  value: string;
}

export function WorkbenchPropertyTextRow({
  controlWidth = 'full',
  disabled,
  onValueChange,
  placeholder,
  readOnly,
  value,
  ...props
}: WorkbenchPropertyTextRowProps) {
  return (
    <WorkbenchPropertyRow {...props}>
      <TextInput
        controlWidth={controlWidth}
        disabled={disabled}
        placeholder={placeholder}
        readOnly={readOnly}
        value={value}
        onValueChange={onValueChange}
      />
    </WorkbenchPropertyRow>
  );
}

export interface WorkbenchPropertyNumberRowProps extends Omit<
  WorkbenchPropertyRowProps,
  'children'
> {
  controlWidth?: ControlWidth;
  disabled?: boolean | undefined;
  max?: number | undefined;
  min?: number | undefined;
  onValueChange: (value: number) => void;
  step?: number | string | undefined;
  value?: number | undefined;
}

export function WorkbenchPropertyNumberRow({
  controlWidth = 'full',
  disabled,
  max,
  min,
  onValueChange,
  step,
  value,
  ...props
}: WorkbenchPropertyNumberRowProps) {
  return (
    <WorkbenchPropertyRow {...props}>
      <NumberInput
        controlWidth={controlWidth}
        disabled={disabled}
        max={max}
        min={min}
        step={step}
        value={value}
        onValueChange={onValueChange}
      />
    </WorkbenchPropertyRow>
  );
}

export interface WorkbenchPropertyRangeRowProps extends Omit<
  WorkbenchPropertyRowProps,
  'children'
> {
  controlWidth?: ControlWidth;
  disabled?: boolean | undefined;
  max?: number | undefined;
  min?: number | undefined;
  onValueChange: (value: number) => void;
  step?: number | string | undefined;
  value?: number | undefined;
}

export function WorkbenchPropertyRangeRow({
  controlWidth = 'full',
  disabled,
  max,
  min,
  onValueChange,
  step,
  value,
  ...props
}: WorkbenchPropertyRangeRowProps) {
  return (
    <WorkbenchPropertyRow {...props}>
      <TextInput
        controlWidth={controlWidth}
        disabled={disabled}
        max={max}
        min={min}
        step={step}
        type="range"
        value={value}
        onValueChange={(next) => {
          const parsed = Number.parseFloat(next);
          if (!Number.isNaN(parsed)) {
            onValueChange(parsed);
          }
        }}
      />
    </WorkbenchPropertyRow>
  );
}

export interface WorkbenchPropertyColorRowProps extends Omit<
  WorkbenchPropertyRowProps,
  'children'
> {
  disabled?: boolean | undefined;
  fallbackValue?: string;
  onValueChange: (value: string) => void;
  value?: string | undefined;
}

export function WorkbenchPropertyColorRow({
  disabled,
  fallbackValue,
  onValueChange,
  value,
  ...props
}: WorkbenchPropertyColorRowProps) {
  return (
    <WorkbenchPropertyRow {...props}>
      <WorkbenchColorInput
        disabled={disabled}
        fallbackValue={fallbackValue ?? '#000000'}
        value={value}
        onValueChange={onValueChange}
      />
    </WorkbenchPropertyRow>
  );
}

export interface WorkbenchPropertySelectOption<TValue extends string = string> {
  disabled?: boolean | undefined;
  label: ReactNode;
  value: TValue;
}

export interface WorkbenchPropertySelectRowProps<TValue extends string = string> extends Omit<
  WorkbenchPropertyRowProps,
  'children'
> {
  controlWidth?: ControlWidth;
  disabled?: boolean | undefined;
  onValueChange: (value: TValue) => void;
  options: readonly WorkbenchPropertySelectOption<TValue>[];
  value?: TValue | undefined;
}

export function WorkbenchPropertySelectRow<TValue extends string = string>({
  controlWidth = 'full',
  disabled,
  onValueChange,
  options,
  value,
  ...props
}: WorkbenchPropertySelectRowProps<TValue>) {
  return (
    <WorkbenchPropertyRow {...props}>
      <Select
        controlWidth={controlWidth}
        disabled={disabled}
        value={value ?? options[0]?.value ?? ''}
        onValueChange={(next) => onValueChange(next as TValue)}
      >
        {options.map((option) => (
          <option key={option.value} disabled={option.disabled} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </WorkbenchPropertyRow>
  );
}

export interface WorkbenchPropertySelectActionRowProps<TValue extends string = string> extends Omit<
  WorkbenchPropertyRowProps,
  'children'
> {
  actionDisabled?: boolean | undefined;
  actionLabel: ReactNode;
  actionTitle?: string | undefined;
  controlWidth?: ControlWidth;
  disabled?: boolean | undefined;
  onAction: () => void;
  onValueChange: (value: TValue) => void;
  options: readonly WorkbenchPropertySelectOption<TValue>[];
  value?: TValue | undefined;
}

export function WorkbenchPropertySelectActionRow<TValue extends string = string>({
  actionDisabled,
  actionLabel,
  actionTitle,
  controlWidth = 'full',
  disabled,
  onAction,
  onValueChange,
  options,
  value,
  ...props
}: WorkbenchPropertySelectActionRowProps<TValue>) {
  return (
    <WorkbenchPropertyRow {...props}>
      <WorkbenchPropertyInline>
        <Select
          controlWidth={controlWidth}
          disabled={disabled}
          value={value ?? options[0]?.value ?? ''}
          onValueChange={(next) => onValueChange(next as TValue)}
        >
          {options.map((option) => (
            <option key={option.value} disabled={option.disabled} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <WorkbenchPropertyToggleButton
          disabled={actionDisabled}
          title={actionTitle}
          type="button"
          onClick={onAction}
        >
          {actionLabel}
        </WorkbenchPropertyToggleButton>
      </WorkbenchPropertyInline>
    </WorkbenchPropertyRow>
  );
}

export interface WorkbenchPropertyCheckboxRowProps extends Omit<
  WorkbenchPropertyRowProps,
  'children'
> {
  checked?: boolean | undefined;
  checkboxLabel?: ReactNode;
  disabled?: boolean | undefined;
  onCheckedChange: (checked: boolean) => void;
}

export function WorkbenchPropertyCheckboxRow({
  checked,
  checkboxLabel,
  disabled,
  onCheckedChange,
  ...props
}: WorkbenchPropertyCheckboxRowProps) {
  return (
    <WorkbenchPropertyRow {...props}>
      <Checkbox
        checked={Boolean(checked)}
        disabled={disabled}
        label={checkboxLabel}
        onCheckedChange={onCheckedChange}
      />
    </WorkbenchPropertyRow>
  );
}

export interface WorkbenchPropertyPanelProps extends ComponentPropsWithRef<'div'> {
  empty?: boolean;
}

export function WorkbenchPropertyPanel({
  className,
  empty = false,
  ...props
}: WorkbenchPropertyPanelProps) {
  return (
    <div
      className={cx(
        'ui-workbench-property-panel',
        empty && 'ui-workbench-property-panel--empty',
        className,
      )}
      {...props}
    />
  );
}

export interface WorkbenchPropertySectionProps extends Omit<
  ComponentPropsWithRef<'section'>,
  'title'
> {
  actions?: ReactNode;
  bodyClassName?: string;
  title?: ReactNode;
}

export function WorkbenchPropertySection({
  actions,
  bodyClassName,
  children,
  className,
  title,
  ...props
}: WorkbenchPropertySectionProps) {
  return (
    <section className={cx('ui-workbench-property-section', className)} {...props}>
      {title || actions ? (
        <div className="ui-workbench-property-section__header">
          {title ? <WorkbenchSectionTitle>{title}</WorkbenchSectionTitle> : null}
          {actions ? <div className="ui-workbench-property-section__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cx('ui-workbench-property-section__body', bodyClassName)}>{children}</div>
    </section>
  );
}

export interface WorkbenchPropertyStackProps extends ComponentPropsWithRef<'div'> {
  gap?: 'xs' | 'sm' | 'md' | 'lg';
}

export function WorkbenchPropertyStack({
  className,
  gap = 'md',
  ...props
}: WorkbenchPropertyStackProps) {
  return <div className={cx('ui-workbench-property-stack', className)} data-gap={gap} {...props} />;
}

export interface WorkbenchPropertyGridProps extends ComponentPropsWithRef<'div'> {
  columns?: 2 | 3;
  gap?: 'xs' | 'sm' | 'md';
}

export function WorkbenchPropertyGrid({
  className,
  columns = 2,
  gap = 'sm',
  ...props
}: WorkbenchPropertyGridProps) {
  return (
    <div
      className={cx('ui-workbench-property-grid', className)}
      data-columns={columns}
      data-gap={gap}
      {...props}
    />
  );
}

export interface WorkbenchPropertyInlineProps extends ComponentPropsWithRef<'div'> {
  justify?: 'start' | 'between';
}

export function WorkbenchPropertyInline({
  className,
  justify = 'start',
  ...props
}: WorkbenchPropertyInlineProps) {
  return (
    <div
      className={cx('ui-workbench-property-inline', className)}
      data-justify={justify}
      {...props}
    />
  );
}

export type WorkbenchPropertyHintProps = ComponentPropsWithRef<'span'>;

export function WorkbenchPropertyHint({ className, ...props }: WorkbenchPropertyHintProps) {
  return <span className={cx('ui-workbench-property-hint', className)} {...props} />;
}

export type WorkbenchPropertyCardProps = ComponentPropsWithRef<'div'>;

export function WorkbenchPropertyCard({ className, ...props }: WorkbenchPropertyCardProps) {
  return <div className={cx('ui-workbench-property-card', className)} {...props} />;
}

export interface WorkbenchPropertyKeyValueProps extends ComponentPropsWithRef<'div'> {
  name: ReactNode;
  value: ReactNode;
}

export function WorkbenchPropertyKeyValue({
  className,
  name,
  value,
  ...props
}: WorkbenchPropertyKeyValueProps) {
  return (
    <div className={cx('ui-workbench-property-key-value', className)} {...props}>
      <span className="ui-workbench-property-key-value__name">{name}</span>
      <span className="ui-workbench-property-key-value__value">{value}</span>
    </div>
  );
}

export interface WorkbenchPropertyToggleButtonProps extends ButtonProps {
  active?: boolean;
}

export function WorkbenchPropertyToggleButton({
  active = false,
  className,
  compact = true,
  ...props
}: WorkbenchPropertyToggleButtonProps) {
  return (
    <Button
      className={cx('ui-workbench-property-toggle', className)}
      compact={compact}
      data-active={active ? 'true' : 'false'}
      {...props}
    />
  );
}

export type WorkbenchColorRowProps = ComponentPropsWithRef<'div'>;

export function WorkbenchColorRow({ className, ...props }: WorkbenchColorRowProps) {
  return <div className={cx('ui-workbench-color-row', className)} {...props} />;
}

export interface WorkbenchColorInputProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'onChange'
> {
  disabled?: boolean | undefined;
  fallbackValue?: string;
  onValueChange: (value: string) => void;
  value?: string | undefined;
}

export function WorkbenchColorInput({
  disabled = false,
  fallbackValue = '#000000',
  onValueChange,
  value,
  ...props
}: WorkbenchColorInputProps) {
  const currentValue = value ?? fallbackValue;

  return (
    <WorkbenchColorRow {...props}>
      <TextInput
        className="ui-workbench-color-input"
        disabled={disabled}
        type="color"
        value={currentValue}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <TextInput
        controlWidth="full"
        disabled={disabled}
        type="text"
        value={currentValue}
        onChange={(event) => onValueChange(event.target.value)}
      />
    </WorkbenchColorRow>
  );
}

export type WorkbenchParseErrorProps = ComponentPropsWithRef<'div'>;

export function WorkbenchParseError({ className, ...props }: WorkbenchParseErrorProps) {
  return <div className={cx('ui-workbench-parse-error', className)} {...props} />;
}

export interface WorkbenchPreviewCanvasProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  children: ReactNode;
  frameHeight: number;
  frameTitle?: ReactNode;
  frameWidth: number;
  help?: ReactNode;
  isPanning?: boolean;
  onResetView?: () => void;
  resetLabel?: ReactNode;
  resetTitle?: string;
  showWindowFrame?: boolean;
  stageStyle?: CSSProperties;
  viewportProps?: ComponentPropsWithRef<'div'>;
}

export function WorkbenchPreviewCanvas({
  children,
  className,
  frameHeight,
  frameTitle = 'Preview',
  frameWidth,
  help,
  isPanning = false,
  onResetView,
  resetLabel = 'Reset',
  resetTitle = 'Reset View',
  showWindowFrame = true,
  stageStyle,
  viewportProps,
  ...props
}: WorkbenchPreviewCanvasProps) {
  const { className: viewportClassName, ...restViewportProps } = viewportProps ?? {};

  return (
    <div className={cx('ui-workbench-preview-canvas', className)} {...props}>
      {onResetView ? (
        <Button
          compact
          className="ui-workbench-preview-canvas__reset"
          type="button"
          onClick={onResetView}
          title={resetTitle}
        >
          {resetLabel}
        </Button>
      ) : null}

      <div
        className="ui-workbench-preview-canvas__stage"
        data-panning={isPanning ? 'true' : 'false'}
        style={stageStyle}
      >
        <div
          className="ui-workbench-preview-canvas__frame"
          style={{
            width: frameWidth,
            height: frameHeight,
          }}
        >
          {showWindowFrame ? (
            <div className="ui-workbench-preview-canvas__titlebar">
              <div className="ui-workbench-preview-canvas__window-controls">
                <div className="ui-workbench-preview-canvas__dot" data-tone="close" />
                <div className="ui-workbench-preview-canvas__dot" data-tone="minimize" />
                <div className="ui-workbench-preview-canvas__dot" data-tone="maximize" />
              </div>
              <span className="ui-workbench-preview-canvas__title">{frameTitle}</span>
            </div>
          ) : null}
          <div
            className={cx('ui-workbench-preview-canvas__viewport', viewportClassName)}
            {...restViewportProps}
          >
            {children}
          </div>
        </div>
      </div>

      {help ? <div className="ui-workbench-preview-canvas__help">{help}</div> : null}
    </div>
  );
}
