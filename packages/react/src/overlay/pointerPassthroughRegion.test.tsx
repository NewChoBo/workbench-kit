/**
 * @vitest-environment jsdom
 */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createPointerPassthroughController,
  isPointerOverHitRegion,
} from './pointerPassthroughRegion';
import { usePointerPassthroughRegion } from './usePointerPassthroughRegion';

function mount(ui: ReactNode): { container: HTMLDivElement; root: Root } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { container, root };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('isPointerOverHitRegion', () => {
  it('matches hit and control selectors', () => {
    const { container, root } = mount(
      <div>
        <button type="button" data-hit="primary">
          Hit
        </button>
        <div data-control="chrome">Chrome</div>
        <span>Outside</span>
      </div>,
    );

    const hit = container.querySelector('[data-hit="primary"]');
    const control = container.querySelector('[data-control="chrome"]');
    const outside = container.querySelector('span');

    expect(
      isPointerOverHitRegion(hit, {
        hitSelectors: ['[data-hit]'],
        controlSelectors: ['[data-control]'],
      }),
    ).toBe(true);
    expect(
      isPointerOverHitRegion(control, {
        hitSelectors: ['[data-hit]'],
        controlSelectors: ['[data-control]'],
      }),
    ).toBe(true);
    expect(
      isPointerOverHitRegion(outside, {
        hitSelectors: ['[data-hit]'],
        controlSelectors: ['[data-control]'],
      }),
    ).toBe(false);

    act(() => {
      root.unmount();
    });
  });

  it('respects root containment', () => {
    const { container, root } = mount(
      <div>
        <div data-root>
          <button type="button" data-hit="inside">
            Inside
          </button>
        </div>
        <button type="button" data-hit="outside">
          Outside
        </button>
      </div>,
    );

    const scopedRoot = container.querySelector('[data-root]') as HTMLElement;
    const inside = container.querySelector('[data-hit="inside"]');
    const outside = container.querySelector('[data-hit="outside"]');

    expect(
      isPointerOverHitRegion(inside, {
        hitSelectors: ['[data-hit]'],
        root: scopedRoot,
      }),
    ).toBe(true);
    expect(
      isPointerOverHitRegion(outside, {
        hitSelectors: ['[data-hit]'],
        root: scopedRoot,
      }),
    ).toBe(false);

    act(() => {
      root.unmount();
    });
  });
});

describe('createPointerPassthroughController', () => {
  it('enables passthrough outside hit regions and disables over hits', () => {
    const { container, root } = mount(
      <div>
        <button type="button" data-hit="primary">
          Hit
        </button>
        <span>Outside</span>
      </div>,
    );
    const setPointerPassthrough = vi.fn();
    const controller = createPointerPassthroughController({
      enabled: true,
      port: { setPointerPassthrough },
      hitSelectors: ['[data-hit]'],
    });

    controller.handlePointerTarget(container.querySelector('span'));
    controller.handlePointerTarget(container.querySelector('[data-hit]'));
    controller.handlePointerTarget(container.querySelector('[data-hit]'));

    expect(setPointerPassthrough.mock.calls).toEqual([[true], [false]]);

    act(() => {
      root.unmount();
    });
  });

  it('forces passthrough off when disabled', () => {
    const setPointerPassthrough = vi.fn();
    const controller = createPointerPassthroughController({
      enabled: false,
      port: { setPointerPassthrough },
      hitSelectors: ['[data-hit]'],
    });

    controller.handlePointerTarget(null);
    expect(setPointerPassthrough).toHaveBeenCalledWith(false);
  });
});

function HookHarness(props: {
  enabled: boolean;
  port: { setPointerPassthrough: (enabled: boolean) => void };
  hitSelectors: readonly string[];
}) {
  usePointerPassthroughRegion(props);
  return (
    <div>
      <button type="button" data-hit="primary">
        Hit
      </button>
      <span>Outside</span>
    </div>
  );
}

describe('usePointerPassthroughRegion', () => {
  it('wires pointermove through rAF to the host port', () => {
    const setPointerPassthrough = vi.fn();
    const rafQueue: FrameRequestCallback[] = [];
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    const { container, root } = mount(
      <HookHarness enabled port={{ setPointerPassthrough }} hitSelectors={['[data-hit]']} />,
    );

    const outside = container.querySelector('span');
    act(() => {
      outside?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    });

    expect(rafQueue.length).toBeGreaterThan(0);
    act(() => {
      rafQueue.forEach((cb) => cb(0));
    });

    expect(setPointerPassthrough).toHaveBeenCalledWith(true);

    act(() => {
      root.unmount();
    });
    rafSpy.mockRestore();
    cancelSpy.mockRestore();
  });
});
