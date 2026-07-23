import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { readModalContainerBounds, resolveModalContainer } from './modalContainer';
import { clampModalBoundsPosition } from './modalPosition';
import { clampModalBounds, readCssModalDimension } from './modalSize';
import type { ModalBounds } from './modalTypes';
import { useModalContainerViewport } from './useModalContainerViewport';
import { useModalDrag } from './useModalDrag';
import { useModalResize } from './useModalResize';

export interface UseModalWindowFrameOptions {
  defaultMaximized: boolean;
  defaultHeight?: number;
  defaultWidth?: number;
  minHeight: number;
  minWidth: number;
}

export function useModalWindowFrame({
  defaultHeight,
  defaultMaximized,
  defaultWidth,
  minHeight,
  minWidth,
}: UseModalWindowFrameOptions) {
  const frameRef = useRef<HTMLDivElement | HTMLFormElement | null>(null);
  const restoredBoundsRef = useRef<ModalBounds | null>(null);
  const [bounds, setBounds] = useState<ModalBounds | null>(null);
  const [maximized, setMaximized] = useState(defaultMaximized);
  const [frameVersion, setFrameVersion] = useState(0);

  const assignFrameRef = useCallback((node: HTMLDivElement | HTMLFormElement | null) => {
    frameRef.current = node;
    setFrameVersion((current) => current + 1);
  }, []);

  const viewport = useModalContainerViewport(frameRef, frameVersion);
  const isContained = resolveModalContainer(frameRef.current) !== null;

  const { handleTitlebarPointerDown, stopDragging } = useModalDrag({
    bounds,
    maximized,
    setBounds,
    viewport,
  });

  const { handleResizeStart, stopResizing } = useModalResize({
    bounds,
    maximized,
    minHeight,
    minWidth,
    setBounds,
    viewport,
  });

  const resolveDefaultBounds = useCallback((): ModalBounds => {
    const element = frameRef.current;
    const width =
      defaultWidth ?? (element ? readCssModalDimension(element, '--ui-modal-width', 640) : 640);
    const height =
      defaultHeight ?? (element ? readCssModalDimension(element, '--ui-modal-height', 480) : 480);
    const container = resolveModalContainer(element);
    const containerBounds = readModalContainerBounds(container);

    const x = Math.max(0, (containerBounds.width - width) / 2);
    const y = Math.max(0, (containerBounds.height - height) / 2);

    return clampModalBounds({ x, y, width, height }, { minHeight, minWidth }, containerBounds);
  }, [defaultHeight, defaultWidth, minHeight, minWidth]);

  useLayoutEffect(() => {
    if (bounds || maximized) {
      return;
    }

    setBounds(resolveDefaultBounds());
  }, [bounds, maximized, resolveDefaultBounds, frameVersion, viewport.height, viewport.width]);

  useEffect(() => {
    if (maximized) {
      return undefined;
    }

    setBounds((current) => (current ? clampModalBoundsPosition(current, viewport) : current));
  }, [maximized, viewport.height, viewport.width]);

  const handleToggleMaximized = useCallback(() => {
    if (maximized) {
      setMaximized(false);
      setBounds(restoredBoundsRef.current ?? resolveDefaultBounds());
      restoredBoundsRef.current = null;
    } else {
      if (bounds) {
        restoredBoundsRef.current = bounds;
      }
      setMaximized(true);
    }

    stopDragging();
    stopResizing();
  }, [bounds, maximized, resolveDefaultBounds, stopDragging, stopResizing]);

  const windowStyle =
    bounds && !maximized
      ? {
          height: `${bounds.height}px`,
          left: `${bounds.x}px`,
          top: `${bounds.y}px`,
          width: `${bounds.width}px`,
        }
      : undefined;

  return {
    assignFrameRef,
    bounds,
    handleResizeStart,
    handleTitlebarPointerDown,
    handleToggleMaximized,
    isContained,
    maximized,
    windowStyle,
  };
}
