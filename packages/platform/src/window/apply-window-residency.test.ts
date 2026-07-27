import { describe, expect, it, vi } from 'vitest';

import {
  applyWindowResidency,
  applyWindowResidencyPolicy,
  type ResidencyWindowSurface,
} from './apply-window-residency.js';

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

describe('applyWindowResidencyPolicy', () => {
  it('applies top z-order with pointer off', () => {
    const windowSurface = createFakeWindow();
    applyWindowResidencyPolicy(windowSurface, {
      zOrder: 'top',
      pointerPassthrough: 'off',
      alwaysOnTopLevel: 'floating',
    });

    expect(windowSurface.calls.setAlwaysOnTop).toEqual([[true, 'floating']]);
    expect(windowSurface.calls.setFocusable).toEqual([[true]]);
    expect(windowSurface.calls.setIgnoreMouseEvents).toEqual([[false]]);
    expect(windowSurface.calls.blur).toBe(0);
  });

  it('applies back z-order approximation with blur and no always-on-top', () => {
    const windowSurface = createFakeWindow();
    applyWindowResidencyPolicy(windowSurface, {
      zOrder: 'back',
      pointerPassthrough: 'off',
    });

    expect(windowSurface.calls.setAlwaysOnTop).toEqual([[false]]);
    expect(windowSurface.calls.setFocusable).toEqual([[false]]);
    expect(windowSurface.calls.blur).toBe(1);
    expect(windowSurface.calls.setIgnoreMouseEvents).toEqual([[false]]);
  });

  it('demotes back to default while positionMode is active', () => {
    const windowSurface = createFakeWindow();
    applyWindowResidencyPolicy(windowSurface, {
      zOrder: 'back',
      pointerPassthrough: 'all',
      positionMode: true,
    });

    expect(windowSurface.calls.setAlwaysOnTop).toEqual([[false]]);
    expect(windowSurface.calls.setFocusable).toEqual([[true]]);
    expect(windowSurface.calls.blur).toBe(0);
    expect(windowSurface.calls.setIgnoreMouseEvents).toEqual([[false]]);
  });

  it('ignores mouse for pointer all unless positionMode', () => {
    const windowSurface = createFakeWindow();
    applyWindowResidencyPolicy(windowSurface, {
      zOrder: 'default',
      pointerPassthrough: 'all',
      forwardPointerWhenIgnoring: true,
    });

    expect(windowSurface.calls.setIgnoreMouseEvents).toEqual([[true, { forward: true }]]);
  });

  it('gates transparent/controls ignore on dynamicPointerPassthrough', () => {
    const idle = createFakeWindow();
    applyWindowResidencyPolicy(idle, {
      zOrder: 'top',
      pointerPassthrough: 'transparent',
      dynamicPointerPassthrough: false,
    });
    expect(idle.calls.setIgnoreMouseEvents).toEqual([[false]]);

    const active = createFakeWindow();
    applyWindowResidencyPolicy(active, {
      zOrder: 'top',
      pointerPassthrough: 'controls',
      dynamicPointerPassthrough: true,
      forwardPointerWhenIgnoring: false,
    });
    expect(active.calls.setIgnoreMouseEvents).toEqual([[true]]);
  });

  it('omits forward options when forwardPointerWhenIgnoring is false', () => {
    const windowSurface = createFakeWindow();
    applyWindowResidencyPolicy(windowSurface, {
      zOrder: 'default',
      pointerPassthrough: 'all',
      forwardPointerWhenIgnoring: false,
    });

    expect(windowSurface.calls.setIgnoreMouseEvents).toEqual([[true]]);
  });
});
