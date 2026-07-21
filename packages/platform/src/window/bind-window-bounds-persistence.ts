import type { PersistableWindow, RememberedWindowState } from './types.js';

export interface WindowBoundsPersistenceHandle {
  flush(): void;
}

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Bind debounced bounds persistence to a narrow window surface.
 * Maximized windows persist `getNormalBounds()` with `isMaximized: true`.
 */
export function bindWindowBoundsPersistence(
  window: PersistableWindow,
  save: (state: RememberedWindowState) => void,
  debounceMs: number = DEFAULT_DEBOUNCE_MS,
): WindowBoundsPersistenceHandle {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const capture = (): RememberedWindowState | null => {
    if (window.isDestroyed()) {
      return null;
    }
    const isMaximized = window.isMaximized();
    return {
      bounds: isMaximized ? window.getNormalBounds() : window.getBounds(),
      isMaximized,
    };
  };

  const persist = (): void => {
    const state = capture();
    if (state) {
      save(state);
    }
  };

  const clearTimer = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const schedule = (): void => {
    if (window.isDestroyed()) {
      return;
    }
    clearTimer();
    timer = setTimeout(() => {
      timer = undefined;
      persist();
    }, debounceMs);
  };

  const flush = (): void => {
    clearTimer();
    persist();
  };

  window.on('move', schedule);
  window.on('resize', schedule);
  window.on('maximize', schedule);
  window.on('unmaximize', schedule);
  window.on('close', flush);
  window.on('closed', clearTimer);

  return { flush };
}
