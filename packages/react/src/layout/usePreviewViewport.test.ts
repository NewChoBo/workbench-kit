/** @vitest-environment jsdom */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clampPreviewViewportZoom,
  computePreviewViewportFitScale,
  computeZoomPanTowardPoint,
  shouldStartPreviewViewportPan,
  usePreviewViewport,
  type UsePreviewViewportOptions,
  type UsePreviewViewportResult,
} from './usePreviewViewport';

describe('usePreviewViewport helpers', () => {
  it('clamps zoom between configured bounds', () => {
    expect(clampPreviewViewportZoom(0.1, 0.2, 6)).toBe(0.2);
    expect(clampPreviewViewportZoom(8, 0.2, 6)).toBe(6);
    expect(clampPreviewViewportZoom(1.5, 0.2, 6)).toBe(1.5);
  });

  it('computes fit scale to contain content inside the viewport', () => {
    expect(
      computePreviewViewportFitScale(
        { width: 960, height: 640 },
        { width: 1920, height: 1080 },
        48,
      ),
    ).toBeCloseTo(0.475, 2);

    expect(
      computePreviewViewportFitScale({ width: 400, height: 300 }, { width: 200, height: 100 }, 0),
    ).toBe(1);
  });

  it('returns unit fit scale for unmeasured viewports so callers can ignore zero sizes', () => {
    expect(
      computePreviewViewportFitScale({ width: 0, height: 0 }, { width: 1920, height: 1080 }, 48),
    ).toBe(1);
    expect(
      computePreviewViewportFitScale({ width: 960, height: 0 }, { width: 1920, height: 1080 }, 48),
    ).toBe(1);
  });

  it('preserves legacy results and permits passive fits below five percent', () => {
    const viewport = { width: 72, height: 52 };
    const content = { width: 10000, height: 4000 };
    expect(computePreviewViewportFitScale(viewport, content, 0)).toBe(0.05);
    expect(computePreviewViewportFitScale(viewport, content, 0, 0)).toBe(0.0072);
    for (const width of [0, -1, 72, Infinity, NaN]) {
      for (const height of [0, 52, Infinity, NaN]) {
        const legacy =
          width <= 0 || height <= 0
            ? 1
            : Math.min(
                1,
                Math.max(0.05, Math.max(0, width - 48) / 10000),
                Math.max(0.05, Math.max(0, height - 48) / 4000),
              );
        expect(computePreviewViewportFitScale({ width, height }, content)).toBe(legacy);
      }
    }
    for (const minimum of [-1, 1.1, Infinity, NaN]) {
      expect(() => computePreviewViewportFitScale(viewport, content, 0, minimum)).toThrow(
        RangeError,
      );
    }
  });

  it('keeps the cursor point stable when zooming toward a point', () => {
    const nextPan = computeZoomPanTowardPoint({
      currentPan: { x: 10, y: -20 },
      currentZoom: 1,
      nextZoom: 2,
      pointFromCenter: { x: 100, y: 50 },
    });

    expect(nextPan.x).toBeCloseTo(100 - 2 * (100 - 10), 6);
    expect(nextPan.y).toBeCloseTo(50 - 2 * (50 - -20), 6);
  });

  it('allows drag pan from non-interactive surface targets', () => {
    const target = document.createElement('div');
    const image = document.createElement('img');

    expect(
      shouldStartPreviewViewportPan({
        button: 0,
        pointerType: 'mouse',
        target,
      } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>),
    ).toBe(true);
    expect(
      shouldStartPreviewViewportPan({
        button: 0,
        pointerType: 'mouse',
        target: image,
      } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>),
    ).toBe(true);
  });

  it('blocks drag pan from interactive controls unless ignored', () => {
    const button = document.createElement('button');
    const icon = document.createElement('span');
    button.append(icon);
    const filterOverlay = document.createElement('div');
    filterOverlay.setAttribute('data-library-filter-overlay', 'true');
    const filterInput = document.createElement('input');
    filterOverlay.append(filterInput);

    expect(
      shouldStartPreviewViewportPan({
        button: 0,
        pointerType: 'mouse',
        target: icon,
      } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>),
    ).toBe(false);

    expect(
      shouldStartPreviewViewportPan({
        button: 0,
        pointerType: 'mouse',
        target: filterInput,
      } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>),
    ).toBe(false);

    expect(
      shouldStartPreviewViewportPan(
        {
          button: 0,
          pointerType: 'mouse',
          target: icon,
        } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>,
        { ignoreInteractiveTargets: true },
      ),
    ).toBe(true);
  });

  it('allows touch/pen drag pan when button is reported as -1', () => {
    const target = document.createElement('div');

    expect(
      shouldStartPreviewViewportPan({
        button: -1,
        pointerType: 'touch',
        target,
      } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>),
    ).toBe(true);
    expect(
      shouldStartPreviewViewportPan({
        button: -1,
        pointerType: 'pen',
        target,
      } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>),
    ).toBe(true);
  });

  it('can restrict pan to middle-mouse for interactive authoring canvases', () => {
    const target = document.createElement('div');

    expect(
      shouldStartPreviewViewportPan(
        {
          button: 0,
          pointerType: 'mouse',
          target,
        } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>,
        { enablePrimaryPointerPan: false },
      ),
    ).toBe(false);
    expect(
      shouldStartPreviewViewportPan(
        {
          button: 1,
          pointerType: 'mouse',
          target,
        } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>,
        { enablePrimaryPointerPan: false },
      ),
    ).toBe(true);
  });
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('usePreviewViewport mounted actions', () => {
  let root: Root | undefined;
  let container: HTMLDivElement;
  let host: HTMLDivElement;
  let result: UsePreviewViewportResult;
  let resize: ResizeObserverCallback;
  let rect: { left: number; top: number; width: number; height: number };
  let disconnect: ReturnType<typeof vi.fn>;

  function Probe(options: UsePreviewViewportOptions) {
    result = usePreviewViewport(options);
    return null;
  }

  async function renderHook(options: UsePreviewViewportOptions) {
    await act(async () => root!.render(createElement(Probe, options)));
  }

  async function mount(options: UsePreviewViewportOptions = {}) {
    await renderHook({ contentWidth: 4000, contentHeight: 2000, viewportPadding: 0, ...options });
    await act(async () => result.setViewportElement(host));
  }

  async function measure(width: number, height: number) {
    rect = { ...rect, width, height };
    await act(async () => resize([], {} as ResizeObserver));
  }

  async function wheel(deltaY: number, zoom = true) {
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: zoom,
      deltaX: zoom ? 0 : 10,
      deltaY,
      clientX: rect.left + rect.width / 2 + 40,
      clientY: rect.top + rect.height / 2 - 20,
    });
    await act(async () => host.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
  }

  beforeEach(() => {
    rect = { left: 13, top: 17, width: 200, height: 100 };
    disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    container = document.createElement('div');
    host = document.createElement('div');
    host.getBoundingClientRect = () => rect as DOMRect;
    document.body.append(container, host);
    root = createRoot(container);
  });

  afterEach(async () => {
    if (root) await act(async () => root!.unmount());
    container.remove();
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reaches exact actual size below the fit multiplier ceiling and keeps it across resize', async () => {
    await mount({ maxZoom: 6 });
    expect(result.effectiveZoom).toBe(0.05);
    expect(result.userZoom).toBe(1);
    await act(async () => result.zoomToActualSize());
    expect(result.effectiveZoom).toBe(1);
    expect(result.userZoom).toBe(20);
    expect(result.stageStyle.transform).toBe('translate(0px, 0px) scale(1)');

    await measure(800, 400);
    expect(result.effectiveZoom).toBe(1);
    expect(result.userZoom).toBe(5);
    await renderHook({ contentWidth: 8000, contentHeight: 4000, viewportPadding: 0 });
    expect(result.effectiveZoom).toBe(1);
    expect(result.userZoom).toBe(10);
    await measure(0, 0);
    expect(result.effectiveZoom).toBe(1);
    await measure(1600, 800);
    expect(result.effectiveZoom).toBe(1);
    expect(result.userZoom).toBe(5);
    await act(async () => result.resetView());
    expect(result.effectiveZoom).toBe(0.2);
    expect(result.userZoom).toBe(1);
    expect(result.stageStyle.transform).toBe('translate(0px, 0px) scale(0.2)');
  });

  it('keeps an initially hidden actual-size stage unpainted until measurement', async () => {
    rect = { ...rect, width: 0, height: 0 };
    await mount();
    await act(async () => result.zoomToActualSize({ x: 1800, y: 900 }));
    expect(result.effectiveZoom).toBe(1);
    expect(result.isViewportReady).toBe(false);
    expect(result.stageStyle.visibility).toBe('hidden');
    await measure(400, 200);
    expect(result.isViewportReady).toBe(true);
    expect(result.stageStyle.visibility).toBe('visible');
    expect(result.stageStyle.transform).toBe('translate(200px, 100px) scale(1)');
  });

  it('centers the requested content point once, preserves pan on resize and recenters on omission', async () => {
    await mount();
    await act(async () => result.zoomToActualSize({ x: 1234, y: 567 }));
    expect(result.stageStyle.transform).toBe('translate(766px, 433px) scale(1)');
    await measure(600, 300);
    await renderHook({ contentWidth: 8000, contentHeight: 4000, viewportPadding: 0 });
    expect(result.stageStyle.transform).toBe('translate(766px, 433px) scale(1)');
    await act(async () => result.zoomToActualSize());
    expect(result.stageStyle.transform).toBe('translate(0px, 0px) scale(1)');
  });

  it('rejects nonfinite content points without changing scale, pan or wheel mode', async () => {
    await mount();
    await wheel(20, false);
    const before = result.stageStyle.transform;
    for (const point of [
      { x: NaN, y: 0 },
      { x: 0, y: Infinity },
      { x: -Infinity, y: 0 },
    ]) {
      await act(async () => {
        expect(() => result.zoomToActualSize(point)).toThrow(RangeError);
      });
      expect(result.stageStyle.transform).toBe(before);
      expect(result.effectiveZoom).toBe(0.05);
    }
    await wheel(-100);
    expect(result.effectiveZoom).toBeCloseTo(0.065, 8);
  });

  it.each([undefined, NaN, Infinity, 0, -1])(
    'rejects centering with unavailable content dimensions (%s) before mutation',
    async (contentWidth) => {
      rect = { ...rect, width: 0, height: 0 };
      await mount({ contentWidth });
      const before = result.stageStyle.transform;
      await act(async () => {
        expect(() => result.zoomToActualSize({ x: 20, y: 30 })).toThrow(RangeError);
      });
      expect(result.stageStyle.transform).toBe(before);
      expect(result.effectiveZoom).toBe(1);
      await act(async () => result.zoomToActualSize());
      expect(result.stageStyle.transform).toBe('translate(0px, 0px) scale(1)');
    },
  );

  it('preserves legacy fit-relative wheel, cursor anchor, pan and reset', async () => {
    await mount();
    await wheel(-100);
    expect(result.userZoom).toBeCloseTo(1.3, 8);
    expect(result.effectiveZoom).toBeCloseTo(0.065, 8);
    expect(result.stageStyle.transform).toBe('translate(-12px, 6px) scale(0.065)');
    await wheel(20, false);
    expect(result.stageStyle.transform).toBe('translate(-20px, -10px) scale(0.065)');
    await wheel(-10000);
    expect(result.userZoom).toBe(6);
    expect(result.effectiveZoom).toBeCloseTo(0.3, 8);
    await wheel(10000);
    expect(result.userZoom).toBe(0.2);
    await act(async () => result.resetView());
    expect(result.stageStyle.transform).toBe('translate(0px, 0px) scale(0.05)');
  });

  it.each([
    [0.2, 6],
    [2, 6],
    [0.2, 0.8],
  ])(
    'keeps absolute wheel continuous and anchored with configured bounds %s..%s',
    async (minZoom, maxZoom) => {
      await mount({ minZoom, maxZoom });
      await act(async () => result.zoomToActualSize());
      await wheel(maxZoom < 1 ? 100 : -100);
      const nextZoom = maxZoom < 1 ? 0.7 : 1.3;
      expect(result.effectiveZoom).toBeCloseTo(nextZoom, 8);
      expect(result.userZoom).toBeCloseTo(nextZoom / 0.05, 8);
      const match = /^translate\(([-.\d]+)px, ([-.\d]+)px\)/u.exec(
        String(result.stageStyle.transform),
      )!;
      expect(Number(match[1])).toBeCloseTo(40 * (1 - nextZoom), 8);
      expect(Number(match[2])).toBeCloseTo(-20 * (1 - nextZoom), 8);
      await wheel(-10000);
      expect(result.effectiveZoom).toBe(Math.max(maxZoom, 1));
      await wheel(10000);
      expect(result.effectiveZoom).toBe(Math.min(minZoom, 1));
      await act(async () => result.resetView());
      expect(result.effectiveZoom).toBe(0.05);
      await wheel(-100);
      expect(result.effectiveZoom).toBeCloseTo(Math.max(minZoom, Math.min(maxZoom, 1.3)) * 0.05, 8);
    },
  );

  it('disconnects measurement and removes native event listeners on unmount', async () => {
    await mount();
    await act(async () => result.zoomToActualSize());
    const removeHost = vi.spyOn(host, 'removeEventListener');
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    await act(async () => root!.unmount());
    root = undefined;
    expect(disconnect).toHaveBeenCalledOnce();
    for (const event of ['pointerdown', 'mousedown', 'auxclick', 'wheel']) {
      expect(removeHost).toHaveBeenCalledWith(event, expect.any(Function), true);
    }
    for (const event of ['pointermove', 'pointerup', 'pointercancel']) {
      expect(removeWindow).toHaveBeenCalledWith(event, expect.any(Function));
    }
    const event = new WheelEvent('wheel', { cancelable: true, ctrlKey: true, deltaY: -100 });
    host.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
