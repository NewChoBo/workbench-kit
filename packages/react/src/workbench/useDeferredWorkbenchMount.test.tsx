/** @vitest-environment jsdom */

import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useDeferredWorkbenchMount,
  type UseDeferredWorkbenchMountOptions,
} from './useDeferredWorkbenchMount';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const originalRequestAnimationFrame = window.requestAnimationFrame;
const originalCancelAnimationFrame = window.cancelAnimationFrame;

function DeferredMountProbe({
  onReady,
  ...options
}: UseDeferredWorkbenchMountOptions & {
  readonly onReady?: (() => void) | undefined;
}) {
  const isReady = useDeferredWorkbenchMount(options);

  useEffect(() => {
    if (isReady) {
      onReady?.();
    }
  }, [isReady, onReady]);

  return <output data-ready={isReady ? 'true' : 'false'} />;
}

describe('useDeferredWorkbenchMount', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(Date.now()), 16) as unknown as number;
    window.cancelAnimationFrame = (handle) => {
      window.clearTimeout(handle);
    };
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    vi.useRealTimers();
  });

  it('defers readiness until the next frame and configured delay pass', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<DeferredMountProbe delayMs={50} />);
    });

    expect(container.querySelector('output')?.dataset.ready).toBe('false');

    await act(async () => {
      vi.advanceTimersByTime(16);
    });
    expect(container.querySelector('output')?.dataset.ready).toBe('false');

    await act(async () => {
      vi.advanceTimersByTime(49);
    });
    expect(container.querySelector('output')?.dataset.ready).toBe('false');

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(container.querySelector('output')?.dataset.ready).toBe('true');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('cancels stale timers when the host unmounts before readiness', async () => {
    const onReady = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<DeferredMountProbe delayMs={50} onReady={onReady} />);
    });

    await act(async () => {
      root.unmount();
      vi.runAllTimers();
    });

    expect(onReady).not.toHaveBeenCalled();
    container.remove();
  });

  it('can opt out of deferral for already stable hosts', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<DeferredMountProbe delayMs={1000} disabled />);
    });

    expect(container.querySelector('output')?.dataset.ready).toBe('true');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
