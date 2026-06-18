import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react';
import { clampModalDragPosition } from './modalPosition';
import type { ModalBounds } from './modalTypes';

interface ModalDragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startBounds: ModalBounds;
}

interface UseModalDragOptions {
  bounds: ModalBounds | null;
  maximized: boolean;
  setBounds: Dispatch<SetStateAction<ModalBounds | null>>;
}

export function useModalDrag({ bounds, maximized, setBounds }: UseModalDragOptions) {
  const dragStateRef = useRef<ModalDragState | null>(null);
  const [dragging, setDragging] = useState(false);

  const stopDragging = useCallback(() => {
    dragStateRef.current = null;
    setDragging(false);
  }, []);

  const handleTitlebarPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (maximized || event.button !== 0 || !bounds) {
        return;
      }

      dragStateRef.current = {
        pointerId: event.pointerId,
        startBounds: bounds,
        startClientX: event.clientX,
        startClientY: event.clientY,
      };

      event.preventDefault();
      if (typeof event.currentTarget.setPointerCapture === 'function') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      setDragging(true);
    },
    [bounds, maximized],
  );

  useEffect(() => {
    if (!dragging) {
      return undefined;
    }

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      event.preventDefault();
      const nextPosition = clampModalDragPosition(
        {
          x: dragState.startBounds.x + (event.clientX - dragState.startClientX),
          y: dragState.startBounds.y + (event.clientY - dragState.startClientY),
        },
        dragState.startBounds,
      );

      setBounds({
        ...dragState.startBounds,
        ...nextPosition,
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (dragState && event.pointerId !== dragState.pointerId) {
        return;
      }

      stopDragging();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragging, setBounds, stopDragging]);

  return {
    handleTitlebarPointerDown,
    stopDragging,
  };
}
