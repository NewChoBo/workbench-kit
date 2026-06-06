import { forwardRef, useRef } from 'react';
import type {
  ComponentPropsWithRef,
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import { Button } from '../primitives/Button';
import { cx } from '../utils/cx';
import { toAngleValue, toLineLengthValue, toLengthValue } from './layoutHelpers';

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
      ...(rotation !== undefined
        ? { '--ui-workbench-canvas-item-transform': `rotate(${toAngleValue(rotation)})` }
        : {}),
      ...(touchAction !== undefined
        ? { '--ui-workbench-canvas-item-touch-action': touchAction }
        : {}),
      ...(transform !== undefined ? { '--ui-workbench-canvas-item-transform': transform } : {}),
      ...(zIndex !== undefined ? { '--ui-workbench-canvas-item-z-index': String(zIndex) } : {}),
      ...style,
    } as CSSProperties;

    return (
      <div
        ref={ref}
        aria-selected={selected}
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
  source = 'object',
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
  width: number | string;
  x: number | string;
  y: number | string;
  zIndex?: number | string | undefined;
}

export function WorkbenchCanvasDragGhost({
  className,
  height,
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
  width: number | string;
}

export function WorkbenchCanvasDragGhostContent({
  className,
  height,
  style,
  width,
  ...props
}: WorkbenchCanvasDragGhostContentProps) {
  const contentStyle = {
    '--ui-workbench-canvas-drag-ghost-content-width': toLengthValue(width),
    '--ui-workbench-canvas-drag-ghost-content-height': toLengthValue(height),
    ...style,
  } as CSSProperties;

  return (
    <div
      className={cx('ui-workbench-canvas-drag-ghost-content', className)}
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
