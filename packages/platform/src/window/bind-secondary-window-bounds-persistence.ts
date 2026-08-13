import type { RectLike } from './types.js';

export interface SecondaryWindowBoundsHandlers {
  readonly onBoundsLikelyChanged: () => void;
  /** Dispatch while the surface is still readable, before native destruction. */
  readonly onCloseRequested: () => void;
  /**
   * Backward-compatible close callback. Dispatch before native destruction when
   * `onCloseRequested` is not available in an existing adapter.
   */
  readonly onClosed: () => void;
}

export interface BindSecondaryWindowBoundsPersistenceOptions {
  /**
   * Host adapts Electron (or other) window events into these callbacks.
   * Return a dispose function that unsubscribes listeners.
   */
  readonly subscribe: (handlers: SecondaryWindowBoundsHandlers) => () => void;
  readonly readBounds: () => RectLike;
  readonly persist: (bounds: RectLike) => void | Promise<void>;
  readonly debounceMs?: number;
}

export interface SecondaryWindowBoundsPersistenceHandle {
  dispose(): void;
  flush(): Promise<void>;
}

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Debounced bounds-only persistence for secondary/overlay windows.
 * Unlike `bindWindowBoundsPersistence`, this helper has no maximize restore policy —
 * hosts own event adaptation via `subscribe`.
 */
export function bindSecondaryWindowBoundsPersistence(
  options: BindSecondaryWindowBoundsPersistenceOptions,
): SecondaryWindowBoundsPersistenceHandle {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let pendingFlush: Promise<void> | undefined;

  const clearTimer = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const persistBounds = async (bounds: RectLike): Promise<void> => {
    if (disposed) {
      return;
    }
    await options.persist(bounds);
  };

  const persistNow = async (): Promise<void> => {
    if (disposed) {
      return;
    }
    await persistBounds(options.readBounds());
  };

  const schedule = (): void => {
    if (disposed) {
      return;
    }
    clearTimer();
    timer = setTimeout(() => {
      timer = undefined;
      pendingFlush = persistNow().finally(() => {
        pendingFlush = undefined;
      });
    }, debounceMs);
  };

  const flush = async (): Promise<void> => {
    clearTimer();
    if (disposed) {
      return;
    }
    const bounds = options.readBounds();
    if (pendingFlush) {
      await pendingFlush;
    }
    // A snapshot captured before dispose still belongs to this flush request.
    await options.persist(bounds);
  };

  let closeSnapshotCaptured = false;
  const captureCloseSnapshot = (): void => {
    if (closeSnapshotCaptured) {
      return;
    }
    closeSnapshotCaptured = true;
    void flush();
  };

  const unsubscribe = options.subscribe({
    onBoundsLikelyChanged: schedule,
    onCloseRequested: captureCloseSnapshot,
    onClosed: captureCloseSnapshot,
  });

  return {
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      clearTimer();
      unsubscribe();
    },
    flush,
  };
}
