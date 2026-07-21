import { useCallback, useState } from 'react';

export interface ContextMenuPointerState<T> {
  readonly target: T;
  readonly x: number;
  readonly y: number;
}

/** Minimal pointer event shape accepted by `open` (React or DOM). */
export interface ContextMenuPointerEvent {
  readonly clientX: number;
  readonly clientY: number;
  preventDefault(): void;
  stopPropagation(): void;
}

export interface UseContextMenuStateResult<T> {
  readonly close: () => void;
  readonly open: (event: ContextMenuPointerEvent, target: T) => void;
  readonly openAt: (position: { readonly x: number; readonly y: number }, target: T) => void;
  readonly state: ContextMenuPointerState<T> | null;
}

/**
 * Host-owned context-menu pointer state (target + viewport coordinates).
 * Does not build menu items or change selection — callers own those policies.
 */
export function useContextMenuState<T>(): UseContextMenuStateResult<T> {
  const [state, setState] = useState<ContextMenuPointerState<T> | null>(null);

  const close = useCallback(() => {
    setState(null);
  }, []);

  const openAt = useCallback((position: { readonly x: number; readonly y: number }, target: T) => {
    setState({
      target,
      x: position.x,
      y: position.y,
    });
  }, []);

  const open = useCallback((event: ContextMenuPointerEvent, target: T) => {
    event.preventDefault();
    event.stopPropagation();
    setState({
      target,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  return {
    close,
    open,
    openAt,
    state,
  };
}
