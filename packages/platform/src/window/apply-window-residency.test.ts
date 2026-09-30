import { describe, expect, it, vi } from 'vitest';

import {
  applyWindowFocusablePolicy,
  applyWindowResidencyPolicy,
  resolveWindowZOrderPolicy,
  type ResidencyWindowSurface,
} from './apply-window-residency.js';

function createFakeWindow(): ResidencyWindowSurface & {
  calls: {
    setAlwaysOnTop: unknown[][];
    setFocusable: unknown[][];
    setIgnoreMouseEvents: unknown[][];
    setSkipTaskbar: unknown[][];
    blur: number;
  };
} {
  const calls = {
    setAlwaysOnTop: [] as unknown[][],
    setFocusable: [] as unknown[][],
    setIgnoreMouseEvents: [] as unknown[][],
    setSkipTaskbar: [] as unknown[][],
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
    setSkipTaskbar: (...args: unknown[]) => {
      calls.setSkipTaskbar.push(args);
    },
    blur: () => {
      calls.blur += 1;
    },
  };
}

describe('applyWindowResidencyPolicy', () => {
  it('uses normal focusable ordering for an unsupported back request and preserves pointer policy', () => {
    const windowSurface = createFakeWindow();
    applyWindowResidencyPolicy(windowSurface, {
      zOrder: 'back',
      supportsUnfocusableBack: false,
      pointerPassthrough: 'all',
      forwardPointerWhenIgnoring: false,
      skipTaskbar: true,
    });
    expect(windowSurface.calls.setAlwaysOnTop).toEqual([[false]]);
    expect(windowSurface.calls.setFocusable).toEqual([[true]]);
    expect(windowSurface.calls.setSkipTaskbar).toEqual([[true]]);
    expect(windowSurface.calls.blur).toBe(0);
    expect(windowSurface.calls.setIgnoreMouseEvents).toEqual([[true]]);
  });

  it('reapplies the same requested mode when host capability changes', () => {
    const windowSurface = createFakeWindow();
    applyWindowResidencyPolicy(windowSurface, { zOrder: 'back', pointerPassthrough: 'off' });
    applyWindowResidencyPolicy(windowSurface, {
      zOrder: 'back',
      pointerPassthrough: 'off',
      supportsUnfocusableBack: false,
    });
    expect(windowSurface.calls.setFocusable).toEqual([[false], [true]]);
    expect(windowSurface.calls.blur).toBe(1);
  });
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

  it('re-applies taskbar visibility after focusability', () => {
    const calls: string[] = [];
    const windowSurface: ResidencyWindowSurface = {
      setAlwaysOnTop: () => calls.push('always-on-top'),
      setFocusable: () => calls.push('focusable'),
      setSkipTaskbar: () => calls.push('skip-taskbar'),
      setIgnoreMouseEvents: () => calls.push('ignore-mouse'),
    };

    applyWindowResidencyPolicy(windowSurface, {
      pointerPassthrough: 'off',
      skipTaskbar: true,
      zOrder: 'default',
    });

    expect(calls).toEqual(['always-on-top', 'focusable', 'skip-taskbar', 'ignore-mouse']);
  });

  it('rejects taskbar policy when the injected surface lacks the capability', () => {
    const windowSurface = createFakeWindow();
    delete windowSurface.setSkipTaskbar;

    expect(() =>
      applyWindowResidencyPolicy(windowSurface, {
        pointerPassthrough: 'off',
        skipTaskbar: true,
        zOrder: 'default',
      }),
    ).toThrow(/does not support taskbar visibility/u);
    expect(windowSurface.calls.setAlwaysOnTop).toEqual([]);
    expect(windowSurface.calls.setFocusable).toEqual([]);
    expect(windowSurface.calls.setIgnoreMouseEvents).toEqual([]);
  });
});

describe('resolveWindowZOrderPolicy', () => {
  it.each(['top', 'default'] as const)(
    'keeps %s intent with or without focusability support',
    (zOrder) => {
      for (const supportsUnfocusableBack of [undefined, false, true]) {
        expect(
          resolveWindowZOrderPolicy({
            zOrder,
            ...(supportsUnfocusableBack === undefined ? {} : { supportsUnfocusableBack }),
          }),
        ).toEqual({
          requestedZOrder: zOrder,
          effectiveZOrder: zOrder,
          focusable: true,
          reason: null,
        });
      }
    },
  );

  it('names legacy back behavior as approximation, never native always-bottom', () => {
    expect(resolveWindowZOrderPolicy({ zOrder: 'back' })).toEqual({
      requestedZOrder: 'back',
      effectiveZOrder: 'back-approximation',
      focusable: false,
      reason: 'back-approximation',
    });
  });

  it('keeps requested back while resolving an explicit unavailable fallback', () => {
    const input = Object.freeze({ zOrder: 'back', supportsUnfocusableBack: false } as const);
    expect(resolveWindowZOrderPolicy(input)).toEqual({
      requestedZOrder: 'back',
      effectiveZOrder: 'default',
      focusable: true,
      reason: 'back-unavailable',
    });
    expect(input.zOrder).toBe('back');
  });

  it('position mode is temporary and the unchanged request resolves again on exit', () => {
    for (const supportsUnfocusableBack of [true, false]) {
      expect(
        resolveWindowZOrderPolicy({ zOrder: 'back', positionMode: true, supportsUnfocusableBack }),
      ).toEqual({
        requestedZOrder: 'back',
        effectiveZOrder: 'default',
        focusable: true,
        reason: 'position-mode',
      });
      expect(resolveWindowZOrderPolicy({ zOrder: 'back', supportsUnfocusableBack }).reason).toBe(
        supportsUnfocusableBack ? 'back-approximation' : 'back-unavailable',
      );
    }
  });
});

describe('applyWindowFocusablePolicy', () => {
  it('applies focusability before taskbar visibility', () => {
    const calls: string[] = [];

    applyWindowFocusablePolicy(
      {
        setFocusable: () => calls.push('focusable'),
        setSkipTaskbar: () => calls.push('skip-taskbar'),
      },
      { focusable: true, skipTaskbar: true },
    );

    expect(calls).toEqual(['focusable', 'skip-taskbar']);
  });

  it('preserves the injected surface receiver for taskbar visibility', () => {
    const windowSurface = {
      calls: [] as boolean[],
      setFocusable: () => undefined,
      setSkipTaskbar(this: { calls: boolean[] }, skip: boolean) {
        this.calls.push(skip);
      },
    };

    applyWindowFocusablePolicy(windowSurface, { focusable: true, skipTaskbar: true });

    expect(windowSurface.calls).toEqual([true]);
  });

  it('fails before changing focusability when taskbar capability is absent', () => {
    const setFocusable = vi.fn();

    expect(() =>
      applyWindowFocusablePolicy({ setFocusable }, { focusable: true, skipTaskbar: true }),
    ).toThrow(/does not support taskbar visibility/u);
    expect(setFocusable).not.toHaveBeenCalled();
  });
});
