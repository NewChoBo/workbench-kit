import './split-view.css';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';

export type SplitViewOrientation = 'horizontal' | 'vertical';
export type SplitViewPrimarySizeUnit = 'percent' | 'pixels';
export type SplitViewLayoutMode = 'primary-fixed' | 'secondary-fixed';

export interface SplitViewProps {
  className?: string;
  defaultPrimarySizePercent?: number;
  defaultPrimarySizePx?: number;
  defaultSecondarySizePx?: number;
  keyboardStepPercent?: number;
  keyboardStepPx?: number;
  /**
   * `primary-fixed` (default): primary track is sized; secondary grows.
   * `secondary-fixed`: secondary track is sized in px; primary is `1fr`.
   */
  layoutMode?: SplitViewLayoutMode;
  maxPrimarySizePercent?: number;
  maxPrimarySizePx?: number;
  maxSecondarySizePx?: number;
  minPrimarySizePx?: number;
  /** Minimum secondary track size in px when sizing in pixels. */
  minSecondarySizePx?: number;
  minPrimarySizePercent?: number;
  onPrimarySizePercentChange?: (primarySizePercent: number) => void;
  /** Fires while dragging (rAF-coalesced). Use to keep controlled hosts in sync. */
  onPrimarySizePercentPreviewChange?: (primarySizePercent: number) => void;
  onPrimarySizePxChange?: (primarySizePx: number) => void;
  /** Fires while dragging (rAF-coalesced). Use to keep controlled hosts in sync. */
  onPrimarySizePxPreviewChange?: (primarySizePx: number) => void;
  onSecondarySizePxChange?: (secondarySizePx: number) => void;
  onSecondarySizePxPreviewChange?: (secondarySizePx: number) => void;
  orientation?: SplitViewOrientation | undefined;
  primary: ReactNode;
  primarySizePercent?: number;
  primarySizePx?: number;
  /** Defaults to `percent` for backward compatibility. Ignored when `layoutMode` is `secondary-fixed`. */
  primarySizeUnit?: SplitViewPrimarySizeUnit;
  secondary: ReactNode;
  secondarySizePx?: number;
}

const SPLIT_VIEW_RESIZING_CLASS = 'ui-workbench-split-view-resizing';
const SPLIT_VIEW_VERTICAL_RESIZING_CLASS = 'ui-workbench-split-view-resizing--vertical';
const SEPARATOR_GUTTER_PX = 1;
const DEFAULT_MIN_SECONDARY_PX = 240;
const DEFAULT_MIN_PRIMARY_PX = 200;
const DEFAULT_MAX_PRIMARY_PX = 480;
const DEFAULT_MAX_SECONDARY_PX = 480;
const DEFAULT_PRIMARY_PX = 260;
const DEFAULT_SECONDARY_PX = 260;

function requestFrame(callback: FrameRequestCallback): number {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback);
  }

  return globalThis.setTimeout(() => callback(Date.now()), 0) as unknown as number;
}

function cancelFrame(id: number): void {
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(id);
    return;
  }

  globalThis.clearTimeout(id);
}

export function SplitView({
  className,
  defaultPrimarySizePercent = 40,
  defaultPrimarySizePx = DEFAULT_PRIMARY_PX,
  defaultSecondarySizePx = DEFAULT_SECONDARY_PX,
  keyboardStepPercent = 5,
  keyboardStepPx = 16,
  layoutMode = 'primary-fixed',
  maxPrimarySizePercent = 85,
  maxPrimarySizePx = DEFAULT_MAX_PRIMARY_PX,
  maxSecondarySizePx = DEFAULT_MAX_SECONDARY_PX,
  minPrimarySizePercent = 15,
  minPrimarySizePx = DEFAULT_MIN_PRIMARY_PX,
  minSecondarySizePx = DEFAULT_MIN_SECONDARY_PX,
  onPrimarySizePercentChange,
  onPrimarySizePercentPreviewChange,
  onPrimarySizePxChange,
  onPrimarySizePxPreviewChange,
  onSecondarySizePxChange,
  onSecondarySizePxPreviewChange,
  orientation = 'horizontal',
  primary,
  primarySizePercent: controlledPrimarySizePercent,
  primarySizePx: controlledPrimarySizePx,
  primarySizeUnit = 'percent',
  secondary,
  secondarySizePx: controlledSecondarySizePx,
}: SplitViewProps) {
  const isSecondaryFixed = layoutMode === 'secondary-fixed';
  const isPixels = isSecondaryFixed || primarySizeUnit === 'pixels';
  const [uncontrolledPrimarySizePercent, setUncontrolledPrimarySizePercent] =
    useState(defaultPrimarySizePercent);
  const [uncontrolledPrimarySizePx, setUncontrolledPrimarySizePx] = useState(defaultPrimarySizePx);
  const [uncontrolledSecondarySizePx, setUncontrolledSecondarySizePx] =
    useState(defaultSecondarySizePx);
  const [containerSizePx, setContainerSizePx] = useState(0);
  /**
   * Live drag size kept in React state. DOM-only CSS previews get overwritten when a
   * parent re-render reapplies the controlled size style.
   */
  const [dragSize, setDragSize] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    nextSize: number;
    pointerId: number;
    separator: HTMLDivElement;
  } | null>(null);
  const previewFrameRef = useRef(0);
  const onPrimarySizePxPreviewChangeRef = useRef(onPrimarySizePxPreviewChange);
  const onPrimarySizePercentPreviewChangeRef = useRef(onPrimarySizePercentPreviewChange);
  const onSecondarySizePxPreviewChangeRef = useRef(onSecondarySizePxPreviewChange);
  onPrimarySizePxPreviewChangeRef.current = onPrimarySizePxPreviewChange;
  onPrimarySizePercentPreviewChangeRef.current = onPrimarySizePercentPreviewChange;
  onSecondarySizePxPreviewChangeRef.current = onSecondarySizePxPreviewChange;

  const isControlled = isSecondaryFixed
    ? controlledSecondarySizePx !== undefined
    : isPixels
      ? controlledPrimarySizePx !== undefined
      : controlledPrimarySizePercent !== undefined;

  const getContainerSize = () => {
    if (containerSizePx > 0) return containerSizePx;
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    return orientation === 'vertical' ? rect.height : rect.width;
  };

  const clampPercent = (value: number) =>
    Math.max(minPrimarySizePercent, Math.min(maxPrimarySizePercent, value));

  const clampPrimaryPixels = (value: number, containerSize: number) => {
    const maxForContainer =
      containerSize > 0
        ? Math.max(minPrimarySizePx, containerSize - SEPARATOR_GUTTER_PX - minSecondarySizePx)
        : maxPrimarySizePx;
    const hardMax = Math.min(maxPrimarySizePx, maxForContainer);
    return Math.max(minPrimarySizePx, Math.min(hardMax, value));
  };

  const clampSecondaryPixels = (value: number, containerSize: number) => {
    const maxForContainer =
      containerSize > 0
        ? Math.max(minSecondarySizePx, containerSize - SEPARATOR_GUTTER_PX - minPrimarySizePx)
        : maxSecondarySizePx;
    const hardMax = Math.min(maxSecondarySizePx, maxForContainer);
    return Math.max(minSecondarySizePx, Math.min(hardMax, value));
  };

  const committedSize = isSecondaryFixed
    ? clampSecondaryPixels(
        controlledSecondarySizePx ?? uncontrolledSecondarySizePx,
        containerSizePx,
      )
    : isPixels
      ? clampPrimaryPixels(controlledPrimarySizePx ?? uncontrolledPrimarySizePx, containerSizePx)
      : clampPercent(controlledPrimarySizePercent ?? uncontrolledPrimarySizePercent);
  const displayedSize = dragSize ?? committedSize;

  useEffect(() => {
    if (!isPixels || !containerRef.current || typeof ResizeObserver === 'undefined') {
      return;
    }

    const element = containerRef.current;
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      const next = orientation === 'vertical' ? rect.height : rect.width;
      setContainerSizePx((current) => (current === next ? current : next));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isPixels, orientation]);

  // Drop drag preview only after the committed size is reflected in props/state.
  useLayoutEffect(() => {
    if (dragSize === null || dragStateRef.current) {
      return;
    }
    if (dragSize === committedSize) {
      setDragSize(null);
    }
  }, [committedSize, dragSize]);

  const commitSize = (value: number) => {
    if (isSecondaryFixed) {
      const nextValue = clampSecondaryPixels(value, getContainerSize());
      if (!isControlled) {
        setUncontrolledSecondarySizePx(nextValue);
      }
      onSecondarySizePxChange?.(nextValue);
      return;
    }
    if (isPixels) {
      const nextValue = clampPrimaryPixels(value, getContainerSize());
      if (!isControlled) {
        setUncontrolledPrimarySizePx(nextValue);
      }
      onPrimarySizePxChange?.(nextValue);
      return;
    }
    const nextValue = clampPercent(value);
    if (!isControlled) {
      setUncontrolledPrimarySizePercent(nextValue);
    }
    onPrimarySizePercentChange?.(nextValue);
  };

  const resolveSize = (clientPosition: number) => {
    if (!containerRef.current) return committedSize;

    const rect = containerRef.current.getBoundingClientRect();
    const totalSize = orientation === 'vertical' ? rect.height : rect.width;
    const startPosition = orientation === 'vertical' ? rect.top : rect.left;
    if (totalSize <= 0) return committedSize;

    const offset = clientPosition - startPosition;
    if (isSecondaryFixed) {
      return clampSecondaryPixels(totalSize - SEPARATOR_GUTTER_PX - offset, totalSize);
    }
    if (isPixels) {
      return clampPrimaryPixels(offset, totalSize);
    }
    return clampPercent((offset / totalSize) * 100);
  };

  const cssSizeValue = isPixels ? `${Math.round(displayedSize)}px` : `${displayedSize}%`;

  const flushSizePreview = (nextValue: number, separator: HTMLDivElement) => {
    const preview = isPixels ? `${Math.round(nextValue)}px` : `${nextValue}%`;
    if (isSecondaryFixed) {
      containerRef.current?.style.setProperty('--ui-workbench-split-secondary-size', preview);
      onSecondarySizePxPreviewChangeRef.current?.(nextValue);
    } else {
      containerRef.current?.style.setProperty('--ui-workbench-split-primary-size', preview);
      if (isPixels) {
        onPrimarySizePxPreviewChangeRef.current?.(nextValue);
      } else {
        onPrimarySizePercentPreviewChangeRef.current?.(nextValue);
      }
    }
    separator.setAttribute('aria-valuenow', String(Math.round(nextValue)));
    setDragSize(nextValue);
  };

  const setResizeClass = (isResizing: boolean) => {
    containerRef.current?.classList.toggle('is-dragging', isResizing);

    if (typeof document === 'undefined') return;

    document.documentElement.classList.toggle(SPLIT_VIEW_RESIZING_CLASS, isResizing);
    document.documentElement.classList.toggle(
      SPLIT_VIEW_VERTICAL_RESIZING_CLASS,
      isResizing && orientation === 'vertical',
    );
  };

  useEffect(() => {
    return () => {
      if (previewFrameRef.current) {
        cancelFrame(previewFrameRef.current);
        previewFrameRef.current = 0;
      }

      const dragState = dragStateRef.current;
      dragState?.separator.classList.remove('is-dragging');
      containerRef.current?.classList.remove('is-dragging');
      dragStateRef.current = null;

      if (typeof document === 'undefined') return;
      document.documentElement.classList.remove(
        SPLIT_VIEW_RESIZING_CLASS,
        SPLIT_VIEW_VERTICAL_RESIZING_CLASS,
      );
    };
  }, []);

  const scheduleSizePreview = (nextValue: number, separator: HTMLDivElement) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    dragState.nextSize = nextValue;
    if (previewFrameRef.current) return;

    previewFrameRef.current = requestFrame(() => {
      previewFrameRef.current = 0;
      const currentDragState = dragStateRef.current;
      if (!currentDragState) return;

      flushSizePreview(currentDragState.nextSize, separator);
    });
  };

  const releasePointerCapture = (separator: HTMLDivElement, pointerId: number) => {
    try {
      if (separator.hasPointerCapture(pointerId)) {
        separator.releasePointerCapture(pointerId);
      }
    } catch {
      // Browsers can release pointer capture before React receives the final event.
    }
  };

  const finishPointerDrag = (
    event: PointerEvent<HTMLDivElement>,
    options: { commit: boolean; resolveFromEvent?: boolean },
  ) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const nextValue =
      options.resolveFromEvent === false
        ? dragState.nextSize
        : resolveSize(orientation === 'vertical' ? event.clientY : event.clientX);
    dragState.nextSize = nextValue;

    if (previewFrameRef.current) {
      cancelFrame(previewFrameRef.current);
      previewFrameRef.current = 0;
    }
    flushSizePreview(nextValue, dragState.separator);

    releasePointerCapture(dragState.separator, event.pointerId);
    dragState.separator.classList.remove('is-dragging');
    setResizeClass(false);
    dragStateRef.current = null;

    if (options.commit) {
      commitSize(nextValue);
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best effort in browser-like test environments.
    }
    dragStateRef.current = {
      nextSize: committedSize,
      pointerId: event.pointerId,
      separator: event.currentTarget,
    };
    setDragSize(committedSize);
    event.currentTarget.classList.add('is-dragging');
    setResizeClass(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    scheduleSizePreview(
      resolveSize(orientation === 'vertical' ? event.clientY : event.clientX),
      event.currentTarget,
    );
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    finishPointerDrag(event, { commit: true });
  };

  const onPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    finishPointerDrag(event, { commit: true, resolveFromEvent: false });
  };

  const onSeparatorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const previousKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
    const step = isPixels ? keyboardStepPx : keyboardStepPercent;
    const min = isSecondaryFixed
      ? minSecondarySizePx
      : isPixels
        ? minPrimarySizePx
        : minPrimarySizePercent;
    const max = isSecondaryFixed
      ? maxSecondarySizePx
      : isPixels
        ? maxPrimarySizePx
        : maxPrimarySizePercent;

    if (event.key === previousKey) {
      event.preventDefault();
      // Move separator toward primary origin: shrink primary / grow secondary.
      commitSize(isSecondaryFixed ? committedSize + step : committedSize - step);
      return;
    }

    if (event.key === nextKey) {
      event.preventDefault();
      // Move separator toward secondary: grow primary / shrink secondary.
      commitSize(isSecondaryFixed ? committedSize - step : committedSize + step);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      commitSize(min);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      commitSize(max);
    }
  };

  const ariaMin = isSecondaryFixed
    ? minSecondarySizePx
    : isPixels
      ? minPrimarySizePx
      : minPrimarySizePercent;
  const ariaMax = isSecondaryFixed
    ? maxSecondarySizePx
    : isPixels
      ? maxPrimarySizePx
      : maxPrimarySizePercent;

  const style = {
    ...(isSecondaryFixed
      ? {
          '--ui-workbench-split-min-primary-size': `${minPrimarySizePx}px`,
          '--ui-workbench-split-secondary-size': cssSizeValue,
        }
      : {
          '--ui-workbench-split-primary-size': cssSizeValue,
        }),
  } as CSSProperties;

  return (
    <div
      ref={containerRef}
      className={cx('ui-workbench-split-view', className)}
      data-layout-mode={layoutMode}
      data-orientation={orientation}
      data-primary-size-unit={isSecondaryFixed ? 'pixels' : primarySizeUnit}
      style={style}
    >
      <div className="ui-workbench-split-view__primary">{primary}</div>
      <div
        aria-orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'}
        aria-valuemax={ariaMax}
        aria-valuemin={ariaMin}
        aria-valuenow={Math.round(displayedSize)}
        className="ui-workbench-split-view__separator"
        role="separator"
        tabIndex={0}
        onKeyDown={onSeparatorKeyDown}
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="ui-workbench-split-view__handle" />
      </div>
      <div className="ui-workbench-split-view__secondary">{secondary}</div>
    </div>
  );
}
