import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clampModalBoundsPosition } from './modalPosition';
import { clampModalBounds, readCssModalDimension } from './modalSize';
import type { ModalBounds } from './modalTypes';
import { useModalDrag } from './useModalDrag';
import { useModalResize } from './useModalResize';

export interface UseModalWindowFrameOptions {
  defaultMaximized: boolean;
  defaultHeight?: number | undefined;
  defaultWidth?: number | undefined;
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

  const { handleTitlebarPointerDown, stopDragging } = useModalDrag({
    bounds,
    maximized,
    setBounds,
  });

  const { handleResizeStart, stopResizing } = useModalResize({
    bounds,
    maximized,
    minHeight,
    minWidth,
    setBounds,
  });

  const resolveDefaultBounds = useCallback((): ModalBounds => {
    const element = frameRef.current;
    const width =
      defaultWidth ?? (element ? readCssModalDimension(element, '--ui-modal-width', 640) : 640);
    const height =
      defaultHeight ?? (element ? readCssModalDimension(element, '--ui-modal-height', 480) : 480);

    const x = Math.max(0, (window.innerWidth - width) / 2);
    const y = Math.max(0, (window.innerHeight - height) / 2);

    return clampModalBounds({ x, y, width, height }, { minHeight, minWidth });
  }, [defaultHeight, defaultWidth, minHeight, minWidth]);

  useLayoutEffect(() => {
    if (bounds || maximized) {
      return;
    }

    setBounds(resolveDefaultBounds());
  }, [bounds, maximized, resolveDefaultBounds]);

  useEffect(() => {
    if (maximized) {
      return undefined;
    }

    const handleResize = () => {
      setBounds((current) => (current ? clampModalBoundsPosition(current) : current));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [maximized]);

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
    bounds,
    frameRef,
    handleResizeStart,
    handleTitlebarPointerDown,
    handleToggleMaximized,
    maximized,
    windowStyle,
  };
}
