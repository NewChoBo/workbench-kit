/** @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

const testGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('Modal viewport ownership', () => {
  let container: HTMLDivElement;
  let root: Root;
  let stylesheet: HTMLStyleElement;
  let hostWidth: number;
  let hostHeight: number;
  let contained: boolean;
  let observations: Map<object, () => void>;

  beforeEach(() => {
    hostWidth = 1280;
    hostHeight = 720;
    contained = false;
    observations = new Map();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private callback: () => void) {}
        observe(target: Element) {
          expect(target).toBe(container);
          observations.set(this, this.callback);
        }
        disconnect() {
          observations.delete(this);
        }
      },
    );
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 720 });
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { get: () => hostWidth });
    Object.defineProperty(container, 'clientHeight', { get: () => hostHeight });
    document.body.append(container);
    stylesheet = document.createElement('style');
    stylesheet.textContent = readFileSync(resolve(import.meta.dirname, 'modal.css'), 'utf8');
    document.head.append(stylesheet);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    expect(observations.size).toBe(0);
    container.remove();
    stylesheet.remove();
    vi.unstubAllGlobals();
  });

  async function mount(inContainer = false, maximized = false) {
    contained = inContainer;
    if (contained) container.className = 'ide-workbench-overlays';
    const inputRef = createRef<HTMLInputElement>();
    await act(async () => {
      root.render(
        <Modal
          title="Viewport fixture"
          defaultWidth={1120}
          defaultHeight={640}
          defaultMaximized={maximized}
          initialFocusRef={inputRef}
          onClose={() => undefined}
          onSubmit={(event) => event.preventDefault()}
        >
          <input ref={inputRef} name="draft" defaultValue="Initial" />
        </Modal>,
      );
    });
    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });
    return {
      dialog: container.querySelector<HTMLFormElement>('[role="dialog"]')!,
      input: inputRef.current!,
    };
  }
  function resize(width: number, height: number) {
    act(() => {
      if (contained) {
        hostWidth = width;
        hostHeight = height;
        expect(observations.size).toBe(1);
        for (const notify of observations.values()) notify();
      } else {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
        window.dispatchEvent(new Event('resize'));
      }
    });
  }
  function bounds(dialog: HTMLElement) {
    return {
      x: Number.parseFloat(dialog.style.left),
      y: Number.parseFloat(dialog.style.top),
      width: Number.parseFloat(dialog.style.width),
      height: Number.parseFloat(dialog.style.height),
    };
  }
  function expectFits(dialog: HTMLElement, width: number, height: number) {
    const frame = bounds(dialog);
    expect(getComputedStyle(dialog).boxSizing).toBe('border-box');
    expect(frame.x).toBeGreaterThanOrEqual(0);
    expect(frame.y).toBeGreaterThanOrEqual(0);
    expect(frame.width).toBeGreaterThan(0);
    expect(frame.height).toBeGreaterThan(0);
    expect(frame.x + frame.width).toBeLessThanOrEqual(width);
    expect(frame.y + frame.height).toBeLessThanOrEqual(height);
  }
  function click(label: string) {
    const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    expect(button).not.toBeNull();
    act(() => button!.click());
  }
  function pointer(target: EventTarget, type: string, x: number, y: number) {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: x,
      clientY: y,
    });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    act(() => target.dispatchEvent(event));
  }

  it.each(['viewport', 'contained'] as const)(
    'fits initial %s dimensions below the preferred and minimum size',
    async (host) => {
      if (host === 'contained') {
        hostWidth = 240;
        hostHeight = 140;
      } else resize(240, 140);
      const { dialog } = await mount(host === 'contained');
      expect(bounds(dialog)).toEqual({ x: 0, y: 0, width: 240, height: 140 });
      expectFits(dialog, 240, 140);
    },
  );

  it('shrinks the viewport frame from 1120 to 430 without replacing focused form state', async () => {
    const { dialog, input } = await mount();
    expect(bounds(dialog)).toEqual({ x: 80, y: 40, width: 1120, height: 640 });
    input.value = 'Uncommitted draft';
    input.setSelectionRange(2, 8);
    input.focus();
    resize(430, 900);
    expect(bounds(dialog)).toEqual({ x: 0, y: 40, width: 430, height: 640 });
    expectFits(dialog, 430, 900);
    expect(container.querySelector('[role="dialog"]')).toBe(dialog);
    expect(container.querySelector('input')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(8);
    expect(new FormData(dialog).get('draft')).toBe('Uncommitted draft');
  });

  it('fits a shrinking contained host and retains the smaller size after expansion', async () => {
    const { dialog } = await mount(true);
    expect(dialog.dataset.contained).toBe('true');
    resize(430, 180);
    expect(window.innerWidth).toBe(1280);
    expect(bounds(dialog)).toEqual({ x: 0, y: 0, width: 430, height: 180 });
    expectFits(dialog, 430, 180);
    resize(1280, 720);
    expect(bounds(dialog)).toEqual({ x: 0, y: 0, width: 430, height: 180 });
  });

  it('fits restored maximized bounds to the current contained host', async () => {
    const { dialog, input } = await mount(true);
    input.value = 'Retained draft';
    click('Maximize modal');
    expect(dialog.dataset.maximized).toBe('true');
    resize(430, 180);
    click('Restore modal');
    expect(dialog.dataset.maximized).toBeUndefined();
    expect(bounds(dialog)).toEqual({ x: 0, y: 0, width: 430, height: 180 });
    expectFits(dialog, 430, 180);
    expect(container.querySelector('input')).toBe(input);
    expect(input.value).toBe('Retained draft');
    resize(1280, 720);
    click('Maximize modal');
    click('Restore modal');
    expect(bounds(dialog)).toEqual({ x: 0, y: 0, width: 430, height: 180 });
  });

  it('fits a default-maximized frame when it first restores into a small viewport', async () => {
    resize(240, 140);
    const { dialog } = await mount(false, true);
    expect(dialog.dataset.maximized).toBe('true');
    click('Restore modal');
    expect(bounds(dialog)).toEqual({ x: 0, y: 0, width: 240, height: 140 });
    expectFits(dialog, 240, 140);
  });

  it.each(['viewport', 'contained'] as const)(
    'ignores zero-size %s observations and recovers on a positive size',
    async (host) => {
      const { dialog } = await mount(host === 'contained');
      resize(430, 180);
      const fitted = bounds(dialog);
      resize(0, 0);
      expect(bounds(dialog)).toEqual(fitted);
      resize(0, 600);
      expect(bounds(dialog)).toEqual(fitted);
      resize(900, 0);
      expect(bounds(dialog)).toEqual(fitted);
      resize(900, 600);
      expect(bounds(dialog)).toEqual(fitted);
      resize(320, 120);
      expect(bounds(dialog)).toEqual({ x: 0, y: 0, width: 320, height: 120 });
      expectFits(dialog, 320, 120);
    },
  );

  it('recovers preferred dimensions when a contained host initially measures zero', async () => {
    hostWidth = 0;
    hostHeight = 0;
    const { dialog } = await mount(true);
    resize(1280, 720);
    expect(bounds(dialog).width).toBe(1120);
    expect(bounds(dialog).height).toBe(640);
    expectFits(dialog, 1280, 720);
  });

  it('ends a captured drag on viewport shrink and allows later position-only dragging', async () => {
    const { dialog } = await mount();
    const drag = container.querySelector<HTMLElement>('.ui-modal__titlebar-drag')!;
    pointer(drag, 'pointerdown', 100, 100);
    resize(430, 900);
    const fitted = bounds(dialog);
    expect(fitted.width).toBe(430);
    pointer(window, 'pointermove', 180, 150);
    expect(bounds(dialog)).toEqual(fitted);
    expect(document.body.style.cursor).not.toBe('move');
    resize(900, 900);
    pointer(drag, 'pointerdown', 100, 100);
    pointer(window, 'pointermove', 150, 120);
    pointer(window, 'pointerup', 150, 120);
    expect(bounds(dialog)).toEqual({ x: 50, y: 60, width: 430, height: 640 });
  });

  it('ends a captured resize on host shrink and permits later manual resizing', async () => {
    const { dialog } = await mount(true);
    const resizeHandle = container.querySelector<HTMLElement>('.ui-modal__resize-handle--e')!;
    pointer(resizeHandle, 'pointerdown', 1200, 400);
    resize(430, 180);
    const fitted = bounds(dialog);
    expect(fitted).toEqual({ x: 0, y: 0, width: 430, height: 180 });
    pointer(window, 'pointermove', 1280, 480);
    expect(bounds(dialog)).toEqual(fitted);
    expect(document.body.style.userSelect).not.toBe('none');
    resize(1280, 720);
    pointer(resizeHandle, 'pointerdown', 430, 100);
    pointer(window, 'pointermove', 530, 100);
    pointer(window, 'pointerup', 530, 100);
    expect(bounds(dialog)).toEqual({ x: 0, y: 0, width: 530, height: 200 });
  });
});
