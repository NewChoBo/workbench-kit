/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkbenchFitPreview } from './WorkbenchFitPreview';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let observed: Element[];
let resize: ResizeObserverCallback;
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  observed = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }
      observe(element: Element) {
        observed.push(element);
      }
      disconnect() {
        observed = [];
      }
    },
  );
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function measure(width: number, height: number, stageWidth = 608, stageHeight = 368) {
  await act(async () =>
    resize(
      observed.map((target) => ({
        target,
        contentRect: target.classList.contains('ui-workbench-fit-preview__stage')
          ? { width: stageWidth, height: stageHeight }
          : { width, height },
      })) as ResizeObserverEntry[],
      {} as ResizeObserver,
    ),
  );
}
const stage = () => container.querySelector<HTMLElement>('.ui-workbench-fit-preview__stage')!;
const summary = () => container.querySelector<HTMLElement>('[data-fit-state]')!;

async function mount(width = 608, height = 368, label: string | undefined = 'Saved content') {
  await act(async () =>
    root.render(
      <WorkbenchFitPreview
        contentWidth={width}
        contentHeight={height}
        label={label}
        fallback="Unavailable"
      >
        <button>Child action</button>
      </WorkbenchFitPreview>,
    ),
  );
}

describe('WorkbenchFitPreview passive layout', () => {
  it('waits for untransformed content boxes, fits uniformly and retains child identity', async () => {
    await mount();
    const child = container.querySelector('button');
    expect(summary().dataset.fitState).toBe('pending');
    expect(stage().style.visibility).toBe('hidden');
    expect(summary().getAttribute('role')).toBe('img');
    expect(summary().getAttribute('aria-label')).toBe('Saved content');
    expect(stage().hasAttribute('inert')).toBe(true);
    expect(stage().getAttribute('aria-hidden')).toBe('true');
    await measure(64, 44);
    expect(summary().dataset.fitState).toBe('ready');
    expect(stage().style.transform).toBe(`translate(-50%, -50%) scale(${64 / 608})`);
    await measure(200, 100);
    expect(stage().style.transform).toBe(`translate(-50%, -50%) scale(${100 / 368})`);
    expect(container.querySelector('button')).toBe(child);
    await measure(0, 0, 0, 0);
    expect(summary().dataset.fitState).toBe('pending');
    expect(stage().style.visibility).toBe('hidden');
    await measure(1000, 1000);
    expect(stage().style.transform).toBe('translate(-50%, -50%) scale(1)');
    expect(container.querySelector('button')).toBe(child);
  });

  it('does not claim wheel/pointer defaults and stays decorative without a label', async () => {
    await mount(608, 368, '');
    await measure(64, 44);
    expect(summary().hasAttribute('role')).toBe(false);
    expect(summary().getAttribute('aria-hidden')).toBe('true');
    expect(summary().hasAttribute('tabindex')).toBe(false);
    for (const type of ['wheel', 'pointerdown', 'mousedown', 'auxclick']) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      expect(stage().dispatchEvent(event)).toBe(true);
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it.each([0, -1, NaN, Infinity])(
    'rejects invalid extent %s with inert fallback',
    async (value) => {
      await mount(value, 100);
      expect(summary().dataset.fitState).toBe('unrenderable');
      expect(stage().style.visibility).toBe('hidden');
      expect(container.querySelector('.ui-workbench-fit-preview__fallback')?.textContent).toBe(
        'Unavailable',
      );
      expect(
        container.querySelector('.ui-workbench-fit-preview__fallback')?.hasAttribute('inert'),
      ).toBe(true);
    },
  );

  it('allows sub-five-percent fit and rejects a browser-clamped logical box', async () => {
    await mount(10000, 4000);
    await measure(64, 44, 10000, 4000);
    expect(stage().style.transform).toBe('translate(-50%, -50%) scale(0.0064)');
    await mount(1e20, 4000);
    expect(stage().style.visibility).toBe('hidden');
    await measure(64, 44, 33554428, 4000);
    expect(summary().dataset.fitState).toBe('unrenderable');
  });

  it('rejects zero, invalid measured dimensions and scale underflow', async () => {
    await mount();
    await measure(64, 44, 0, 368);
    expect(summary().dataset.fitState).toBe('unrenderable');
    await measure(Infinity, 44);
    expect(summary().dataset.fitState).toBe('unrenderable');
    await mount(Number.MAX_VALUE, 1);
    await measure(Number.MIN_VALUE, 1, Number.MAX_VALUE, 1);
    expect(summary().dataset.fitState).toBe('unrenderable');
  });
});
