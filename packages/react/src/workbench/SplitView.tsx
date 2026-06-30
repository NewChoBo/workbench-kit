import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { cx } from '../utils/cx';

export type SplitViewOrientation = 'horizontal' | 'vertical';

export interface SplitViewProps {
  className?: string;
  defaultPrimarySizePercent?: number;
  keyboardStepPercent?: number;
  maxPrimarySizePercent?: number;
  minPrimarySizePercent?: number;
  onPrimarySizePercentChange?: (primarySizePercent: number) => void;
  orientation?: SplitViewOrientation | undefined;
  primary: ReactNode;
  primarySizePercent?: number;
  secondary: ReactNode;
}

const SPLIT_VIEW_RESIZING_CLASS = 'ui-workbench-split-view-resizing';
const SPLIT_VIEW_VERTICAL_RESIZING_CLASS = 'ui-workbench-split-view-resizing--vertical';

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
  keyboardStepPercent = 5,
  maxPrimarySizePercent = 85,
  minPrimarySizePercent = 15,
  onPrimarySizePercentChange,
  orientation = 'horizontal',
  primary,
  primarySizePercent: controlledPrimarySizePercent,
  secondary,
}: SplitViewProps) {
  const [uncontrolledPrimarySizePercent, setUncontrolledPrimarySizePercent] =
    useState(defaultPrimarySizePercent);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    nextPrimarySizePercent: number;
    pointerId: number;
    separator: HTMLDivElement;
  } | null>(null);
  const previewFrameRef = useRef(0);
  const isControlled = controlledPrimarySizePercent !== undefined;

  const clampPrimarySize = (value: number) =>
    Math.max(minPrimarySizePercent, Math.min(maxPrimarySizePercent, value));

  const primarySizePercent = clampPrimarySize(
    controlledPrimarySizePercent ?? uncontrolledPrimarySizePercent,
  );

  const commitPrimarySize = (value: number) => {
    const nextValue = clampPrimarySize(value);
    if (!isControlled) {
      setUncontrolledPrimarySizePercent(nextValue);
    }
    onPrimarySizePercentChange?.(nextValue);
  };

  const resolvePrimarySize = (clientPosition: number) => {
    if (!containerRef.current) return primarySizePercent;

    const rect = containerRef.current.getBoundingClientRect();
    const totalSize = orientation === 'vertical' ? rect.height : rect.width;
    const startPosition = orientation === 'vertical' ? rect.top : rect.left;
    if (totalSize <= 0) return primarySizePercent;

    return clampPrimarySize(((clientPosition - startPosition) / totalSize) * 100);
  };

  const flushPrimarySizePreview = (nextValue: number, separator: HTMLDivElement) => {
    containerRef.current?.style.setProperty('--ui-workbench-split-primary-size', `${nextValue}%`);
    separator.setAttribute('aria-valuenow', String(Math.round(nextValue)));
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

  const schedulePrimarySizePreview = (nextValue: number, separator: HTMLDivElement) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    dragState.nextPrimarySizePercent = nextValue;
    if (previewFrameRef.current) return;

    previewFrameRef.current = requestFrame(() => {
      previewFrameRef.current = 0;
      const currentDragState = dragStateRef.current;
      if (!currentDragState) return;

      flushPrimarySizePreview(currentDragState.nextPrimarySizePercent, separator);
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
        ? dragState.nextPrimarySizePercent
        : resolvePrimarySize(orientation === 'vertical' ? event.clientY : event.clientX);
    dragState.nextPrimarySizePercent = nextValue;

    if (previewFrameRef.current) {
      cancelFrame(previewFrameRef.current);
      previewFrameRef.current = 0;
    }
    flushPrimarySizePreview(nextValue, dragState.separator);

    releasePointerCapture(dragState.separator, event.pointerId);
    dragState.separator.classList.remove('is-dragging');
    setResizeClass(false);
    dragStateRef.current = null;

    if (options.commit) {
      commitPrimarySize(nextValue);
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
      nextPrimarySizePercent: primarySizePercent,
      pointerId: event.pointerId,
      separator: event.currentTarget,
    };
    event.currentTarget.classList.add('is-dragging');
    setResizeClass(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    schedulePrimarySizePreview(
      resolvePrimarySize(orientation === 'vertical' ? event.clientY : event.clientX),
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

    if (event.key === previousKey) {
      event.preventDefault();
      commitPrimarySize(primarySizePercent - keyboardStepPercent);
      return;
    }

    if (event.key === nextKey) {
      event.preventDefault();
      commitPrimarySize(primarySizePercent + keyboardStepPercent);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      commitPrimarySize(minPrimarySizePercent);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      commitPrimarySize(maxPrimarySizePercent);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cx('ui-workbench-split-view', className)}
      data-orientation={orientation}
      style={
        {
          '--ui-workbench-split-primary-size': `${primarySizePercent}%`,
        } as CSSProperties
      }
    >
      <div className="ui-workbench-split-view__primary">{primary}</div>
      <div
        aria-orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'}
        aria-valuemax={maxPrimarySizePercent}
        aria-valuemin={minPrimarySizePercent}
        aria-valuenow={Math.round(primarySizePercent)}
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
