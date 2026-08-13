import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  bindSecondaryWindowBoundsPersistence,
  type SecondaryWindowBoundsHandlers,
} from './bind-secondary-window-bounds-persistence.js';
import type { RectLike } from './types.js';

describe('bindSecondaryWindowBoundsPersistence', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces rapid bounds changes into one debounced persist', async () => {
    vi.useFakeTimers();
    let bounds: RectLike = { x: 0, y: 0, width: 100, height: 80 };
    const persist = vi.fn(async (next: RectLike) => {
      bounds = next;
    });
    let handlers: {
      onBoundsLikelyChanged: () => void;
      onCloseRequested: () => void;
      onClosed: () => void;
    } | null = null;

    const handle = bindSecondaryWindowBoundsPersistence({
      debounceMs: 200,
      readBounds: () => bounds,
      persist,
      subscribe: (next) => {
        handlers = next;
        return () => {
          handlers = null;
        };
      },
    });

    bounds = { x: 1, y: 1, width: 100, height: 80 };
    handlers!.onBoundsLikelyChanged();
    bounds = { x: 2, y: 2, width: 100, height: 80 };
    handlers!.onBoundsLikelyChanged();
    bounds = { x: 3, y: 3, width: 120, height: 90 };
    handlers!.onBoundsLikelyChanged();

    expect(persist).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({ x: 3, y: 3, width: 120, height: 90 });

    handle.dispose();
  });

  it('flushes pending bounds on close', async () => {
    vi.useFakeTimers();
    let bounds: RectLike = { x: 10, y: 20, width: 300, height: 200 };
    const persist = vi.fn(async () => undefined);
    let handlers: {
      onBoundsLikelyChanged: () => void;
      onCloseRequested: () => void;
      onClosed: () => void;
    } | null = null;

    bindSecondaryWindowBoundsPersistence({
      debounceMs: 500,
      readBounds: () => bounds,
      persist,
      subscribe: (next) => {
        handlers = next;
        return () => {
          handlers = null;
        };
      },
    });

    bounds = { x: 11, y: 21, width: 301, height: 201 };
    handlers!.onBoundsLikelyChanged();
    expect(persist).not.toHaveBeenCalled();

    handlers!.onClosed();
    await Promise.resolve();
    await Promise.resolve();

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({ x: 11, y: 21, width: 301, height: 201 });
  });

  it('captures close bounds before an earlier persist settles', async () => {
    vi.useFakeTimers();
    let bounds: RectLike = { x: 10, y: 20, width: 300, height: 200 };
    let destroyed = false;
    let releaseFirstPersist!: () => void;
    const firstPersist = new Promise<void>((resolve) => {
      releaseFirstPersist = resolve;
    });
    let resolveSecondPersist!: () => void;
    const secondPersist = new Promise<void>((resolve) => {
      resolveSecondPersist = resolve;
    });
    const persist = vi
      .fn<(next: RectLike) => Promise<void>>()
      .mockImplementationOnce(async () => firstPersist)
      .mockImplementationOnce(async () => {
        resolveSecondPersist();
      });
    let handlers: SecondaryWindowBoundsHandlers | null = null;

    const handle = bindSecondaryWindowBoundsPersistence({
      debounceMs: 100,
      readBounds: () => {
        if (destroyed) {
          throw new Error('window already destroyed');
        }
        return bounds;
      },
      persist,
      subscribe: (next) => {
        handlers = next;
        return () => {
          handlers = null;
        };
      },
    });

    handlers!.onBoundsLikelyChanged();
    await vi.advanceTimersByTimeAsync(100);
    expect(persist).toHaveBeenCalledWith({ x: 10, y: 20, width: 300, height: 200 });

    bounds = { x: 11, y: 21, width: 301, height: 201 };
    handlers!.onCloseRequested();
    destroyed = true;
    handle.dispose();
    releaseFirstPersist();
    await secondPersist;

    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist).toHaveBeenLastCalledWith({ x: 11, y: 21, width: 301, height: 201 });
  });

  it('supports explicit flush and dispose unsubscribe', async () => {
    const persist = vi.fn(async () => undefined);
    const unsubscribe = vi.fn();
    let handlers: {
      onBoundsLikelyChanged: () => void;
      onCloseRequested: () => void;
      onClosed: () => void;
    } | null = null;

    const handle = bindSecondaryWindowBoundsPersistence({
      debounceMs: 50,
      readBounds: () => ({ x: 0, y: 0, width: 1, height: 1 }),
      persist,
      subscribe: (next) => {
        handlers = next;
        return unsubscribe;
      },
    });

    await handle.flush();
    expect(persist).toHaveBeenCalledTimes(1);

    handle.dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    handlers!.onBoundsLikelyChanged();
    await handle.flush();
    expect(persist).toHaveBeenCalledTimes(1);
  });
});
