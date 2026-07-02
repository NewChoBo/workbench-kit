/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScrollAreaInfiniteSentinel } from './ScrollAreaInfiniteSentinel';
import { useScrollAreaInfiniteLoad } from './useScrollAreaInfiniteLoad';

type ObserverCallback = IntersectionObserverCallback;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly callback: ObserverCallback;
  readonly options: IntersectionObserverInit | undefined;
  readonly observed: Element[] = [];

  constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  observe(element: Element): void {
    this.observed.push(element);
  }

  disconnect(): void {
    this.observed.length = 0;
  }

  trigger(isIntersecting: boolean): void {
    const entry = {
      isIntersecting,
      target: this.observed[0] ?? document.createElement('div'),
    } as IntersectionObserverEntry;

    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

interface HarnessProps {
  hasMore: boolean;
  isLoadingMore?: boolean;
  onLoadMore: () => void | Promise<void>;
}

function InfiniteScrollHarness({ hasMore, isLoadingMore = false, onLoadMore }: HarnessProps) {
  const { sentinelRef } = useScrollAreaInfiniteLoad({
    hasMore,
    isLoadingMore,
    onLoadMore,
  });

  return (
    <div className="ui-scroll-area">
      <div>Item</div>
      {hasMore ? <ScrollAreaInfiniteSentinel ref={sentinelRef} /> : null}
    </div>
  );
}

function mountHarness(props: HarnessProps): {
  rerender: (next: HarnessProps) => void;
  unmount: () => void;
} {
  const container = document.createElement('div');
  document.body.append(container);
  let root: Root | null = null;

  act(() => {
    root = createRoot(container);
    root.render(<InfiniteScrollHarness {...props} />);
  });

  return {
    rerender: (next) => {
      act(() => {
        root?.render(<InfiniteScrollHarness {...next} />);
      });
    },
    unmount: () => {
      act(() => {
        root?.unmount();
      });
      container.remove();
    },
  };
}

describe('useScrollAreaInfiniteLoad', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('observes a sentinel inside a scroll area and loads more when intersecting', async () => {
    const onLoadMore = vi.fn().mockResolvedValue(undefined);
    const harness = mountHarness({
      hasMore: true,
      onLoadMore,
    });

    const observer =
      MockIntersectionObserver.instances[MockIntersectionObserver.instances.length - 1];
    expect(observer).toBeDefined();
    expect(observer?.observed).toHaveLength(1);

    await act(async () => {
      observer?.trigger(true);
      await Promise.resolve();
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);

    await act(async () => {
      observer?.trigger(true);
      await Promise.resolve();
    });

    expect(onLoadMore).toHaveBeenCalledTimes(2);
    harness.unmount();
  });

  it('does not observe or load when hasMore is false', () => {
    const onLoadMore = vi.fn();
    const harness = mountHarness({
      hasMore: false,
      onLoadMore,
    });

    expect(MockIntersectionObserver.instances).toHaveLength(0);
    expect(onLoadMore).not.toHaveBeenCalled();
    harness.unmount();
  });

  it('ignores duplicate intersection callbacks while a load is in flight', async () => {
    let resolveLoad: (() => void) | undefined;
    const onLoadMore = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const harness = mountHarness({
      hasMore: true,
      onLoadMore,
    });

    const observer =
      MockIntersectionObserver.instances[MockIntersectionObserver.instances.length - 1];

    await act(async () => {
      observer?.trigger(true);
      observer?.trigger(true);
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLoad?.();
      await Promise.resolve();
    });
    harness.unmount();
  });

  it('disconnects the observer when loading more starts', () => {
    const onLoadMore = vi.fn().mockResolvedValue(undefined);
    const harness = mountHarness({
      hasMore: true,
      onLoadMore,
    });

    const observer =
      MockIntersectionObserver.instances[MockIntersectionObserver.instances.length - 1];
    expect(observer?.observed).toHaveLength(1);

    harness.rerender({
      hasMore: true,
      isLoadingMore: true,
      onLoadMore,
    });

    expect(observer?.observed).toHaveLength(0);
    harness.unmount();
  });
});
