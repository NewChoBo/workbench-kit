import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bindWindowBoundsPersistence } from './bind-window-bounds-persistence.js';
import type { PersistableWindow, RectLike, RememberedWindowState } from './types.js';

type WindowEvent =
  | 'close'
  | 'closed'
  | 'maximize'
  | 'move'
  | 'resize'
  | 'unmaximize';

function createFakeWindow(initial: {
  bounds: RectLike;
  normalBounds?: RectLike;
  isMaximized?: boolean;
}): PersistableWindow & {
  emit: (event: WindowEvent) => void;
  setBounds: (bounds: RectLike) => void;
  setMaximized: (value: boolean) => void;
  destroy: () => void;
} {
  const listeners = new Map<WindowEvent, Set<() => void>>();
  let bounds = { ...initial.bounds };
  let normalBounds = { ...(initial.normalBounds ?? initial.bounds) };
  let maximized = initial.isMaximized ?? false;
  let destroyed = false;

  return {
    getBounds: () => ({ ...bounds }),
    getNormalBounds: () => ({ ...normalBounds }),
    isDestroyed: () => destroyed,
    isMaximized: () => maximized,
    on(event, listener) {
      const set = listeners.get(event) ?? new Set();
      set.add(listener);
      listeners.set(event, set);
    },
    emit(event) {
      for (const listener of listeners.get(event) ?? []) {
        listener();
      }
    },
    setBounds(next) {
      bounds = { ...next };
      if (!maximized) {
        normalBounds = { ...next };
      }
    },
    setMaximized(value) {
      maximized = value;
    },
    destroy() {
      destroyed = true;
    },
  };
}

describe('bindWindowBoundsPersistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces move/resize saves and uses normal bounds when maximized', () => {
    const window = createFakeWindow({
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      normalBounds: { x: 120, y: 80, width: 1100, height: 700 },
      isMaximized: true,
    });
    const saves: RememberedWindowState[] = [];

    bindWindowBoundsPersistence(window, (state) => {
      saves.push(state);
    }, 300);

    window.emit('move');
    window.emit('resize');
    expect(saves).toEqual([]);

    vi.advanceTimersByTime(300);
    expect(saves).toEqual([
      {
        bounds: { x: 120, y: 80, width: 1100, height: 700 },
        isMaximized: true,
      },
    ]);
  });

  it('persists getBounds when not maximized', () => {
    const window = createFakeWindow({
      bounds: { x: 40, y: 60, width: 900, height: 600 },
      isMaximized: false,
    });
    const saves: RememberedWindowState[] = [];

    bindWindowBoundsPersistence(window, (state) => {
      saves.push(state);
    }, 100);

    window.setBounds({ x: 50, y: 70, width: 920, height: 620 });
    window.emit('move');
    vi.advanceTimersByTime(100);

    expect(saves).toEqual([
      {
        bounds: { x: 50, y: 70, width: 920, height: 620 },
        isMaximized: false,
      },
    ]);
  });

  it('flushes pending debounce immediately on close', () => {
    const window = createFakeWindow({
      bounds: { x: 10, y: 20, width: 800, height: 500 },
    });
    const saves: RememberedWindowState[] = [];

    bindWindowBoundsPersistence(window, (state) => {
      saves.push(state);
    }, 500);

    window.setBounds({ x: 30, y: 40, width: 820, height: 520 });
    window.emit('resize');
    expect(saves).toEqual([]);

    window.emit('close');
    expect(saves).toEqual([
      {
        bounds: { x: 30, y: 40, width: 820, height: 520 },
        isMaximized: false,
      },
    ]);

    vi.advanceTimersByTime(500);
    expect(saves).toHaveLength(1);
  });

  it('clears the timer on closed and ignores saves after destroy', () => {
    const window = createFakeWindow({
      bounds: { x: 0, y: 0, width: 800, height: 500 },
    });
    const save = vi.fn();

    const handle = bindWindowBoundsPersistence(window, save, 200);
    window.emit('move');
    window.emit('closed');
    vi.advanceTimersByTime(200);
    expect(save).not.toHaveBeenCalled();

    window.destroy();
    handle.flush();
    expect(save).not.toHaveBeenCalled();
  });
});
