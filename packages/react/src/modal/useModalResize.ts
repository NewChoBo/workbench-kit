import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react';
import { applyModalResize } from './modalSize';
import type { ModalBounds, ModalResizeEdge } from './modalTypes';

interface ModalResizeState {
  edge: ModalResizeEdge;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startBounds: ModalBounds;
}

interface UseModalResizeOptions {
  bounds: ModalBounds | null;
  maximized: boolean;
  minHeight: number;
  minWidth: number;
  setBounds: Dispatch<SetStateAction<ModalBounds | null>>;
}

export function useModalResize({
  bounds,
  maximized,
  minHeight,
  minWidth,
  setBounds,
}: UseModalResizeOptions) {
  const resizeStateRef = useRef<ModalResizeState | null>(null);
  const [resizing, setResizing] = useState(false);
  const sizeConstraints = { minHeight, minWidth };

  const stopResizing = useCallback(() => {
    resizeStateRef.current = null;
    setResizing(false);
  }, []);

  const handleResizeStart = useCallback(
    (edge: ModalResizeEdge, event: ReactPointerEvent<HTMLDivElement>) => {
      if (maximized || !bounds) {
        return;
      }

      resizeStateRef.current = {
        edge,
        pointerId: event.pointerId,
        startBounds: bounds,
        startClientX: event.clientX,
        startClientY: event.clientY,
      };

      if (typeof event.currentTarget.setPointerCapture === 'function') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      setResizing(true);
    },
    [bounds, maximized],
  );

  useEffect(() => {
    if (!resizing) {
      return undefined;
    }

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState || event.pointerId !== resizeState.pointerId) {
        return;
      }

      event.preventDefault();
      const nextBounds = applyModalResize(
        resizeState.startBounds,
        resizeState.edge,
        event.clientX - resizeState.startClientX,
        event.clientY - resizeState.startClientY,
        sizeConstraints,
      );

      setBounds(nextBounds);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current;
      if (resizeState && event.pointerId !== resizeState.pointerId) {
        return;
      }

      stopResizing();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [minHeight, minWidth, resizing, setBounds, stopResizing]);

  return {
    handleResizeStart,
    stopResizing,
  };
}
