import { describe, expect, it, vi } from 'vitest';

import { applyWindowResidency, type ResidencyWindowSurface } from './apply-window-residency.js';

function createFakeWindow(): ResidencyWindowSurface & {
  calls: {
    setAlwaysOnTop: unknown[][];
    setFocusable: unknown[][];
    setIgnoreMouseEvents: unknown[][];
    blur: number;
  };
} {
  const calls = {
    setAlwaysOnTop: [] as unknown[][],
    setFocusable: [] as unknown[][],
    setIgnoreMouseEvents: [] as unknown[][],
    blur: 0,
  };

  return {
    calls,
    setAlwaysOnTop: (...args: unknown[]) => {
      calls.setAlwaysOnTop.push(args);
    },
    setFocusable: (...args: unknown[]) => {
      calls.setFocusable.push(args);
    },
    setIgnoreMouseEvents: (...args: unknown[]) => {
      calls.setIgnoreMouseEvents.push(args);
    },
    blur: () => {
      calls.blur += 1;
    },
  };
}

describe('applyWindowResidency', () => {
  it('applies normal residency', () => {
    const windowSurface = createFakeWindow();
    applyWindowResidency(windowSurface, 'normal');

    expect(windowSurface.calls.setAlwaysOnTop).toEqual([[false]]);
    expect(windowSurface.calls.setFocusable).toEqual([[true]]);
    expect(windowSurface.calls.setIgnoreMouseEvents).toEqual([[false]]);
    expect(windowSurface.calls.blur).toBe(0);
  });

  it('applies always-on-top residency with optional level', () => {
    const windowSurface = createFakeWindow();
    applyWindowResidency(windowSurface, 'always-on-top', { alwaysOnTopLevel: 'screen-saver' });

    expect(windowSurface.calls.setAlwaysOnTop).toEqual([[true, 'screen-saver']]);
    expect(windowSurface.calls.setFocusable).toEqual([[true]]);
    expect(windowSurface.calls.setIgnoreMouseEvents).toEqual([[false]]);
  });

  it('applies click-through with forward pointer option and blur', () => {
    const windowSurface = createFakeWindow();
    applyWindowResidency(windowSurface, 'click-through', {
      forwardPointerWhenIgnoring: true,
    });

    expect(windowSurface.calls.setAlwaysOnTop).toEqual([[true]]);
    expect(windowSurface.calls.setFocusable).toEqual([[false]]);
    expect(windowSurface.calls.setIgnoreMouseEvents).toEqual([[true, { forward: true }]]);
    expect(windowSurface.calls.blur).toBe(1);
  });

  it('allows disabling forward when ignoring mouse events', () => {
    const windowSurface = createFakeWindow();
    applyWindowResidency(windowSurface, 'click-through', {
      forwardPointerWhenIgnoring: false,
    });

    expect(windowSurface.calls.setIgnoreMouseEvents).toEqual([[true, { forward: false }]]);
  });

  it('works when blur is omitted', () => {
    const setAlwaysOnTop = vi.fn();
    const setFocusable = vi.fn();
    const setIgnoreMouseEvents = vi.fn();

    applyWindowResidency({ setAlwaysOnTop, setFocusable, setIgnoreMouseEvents }, 'click-through');

    expect(setIgnoreMouseEvents).toHaveBeenCalledWith(true, { forward: true });
  });
});
