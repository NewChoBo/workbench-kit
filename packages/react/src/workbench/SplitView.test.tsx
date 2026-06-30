/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SplitView } from './SplitView';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('SplitView', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('previews pointer resizing without committing parent state until release', async () => {
    const onPrimarySizePercentChange = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SplitView
          primary={<aside>Primary</aside>}
          primarySizePercent={20}
          secondary={<main>Secondary</main>}
          onPrimarySizePercentChange={onPrimarySizePercentChange}
        />,
      );
    });

    const splitView = container.querySelector('.ui-workbench-split-view') as HTMLElement;
    const separator = container.querySelector('.ui-workbench-split-view__separator') as HTMLElement;

    Object.defineProperty(splitView, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          bottom: 400,
          height: 400,
          left: 0,
          right: 1000,
          top: 0,
          width: 1000,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    });
    Object.defineProperty(separator, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(separator, 'hasPointerCapture', {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(separator, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });

    await act(async () => {
      separator.dispatchEvent(createPointerLikeEvent('pointerdown', 200, 0));
    });
    await act(async () => {
      separator.dispatchEvent(createPointerLikeEvent('pointermove', 350, 0));
    });

    expect(onPrimarySizePercentChange).not.toHaveBeenCalled();

    await act(async () => {
      separator.dispatchEvent(createPointerLikeEvent('pointerup', 350, 0));
    });

    expect(onPrimarySizePercentChange).toHaveBeenCalledTimes(1);
    expect(onPrimarySizePercentChange).toHaveBeenCalledWith(35);
    expect(splitView.style.getPropertyValue('--ui-workbench-split-primary-size')).toBe('35%');
    expect(separator.getAttribute('aria-valuenow')).toBe('35');

    await act(async () => {
      root.unmount();
    });
  });
});

function createPointerLikeEvent(type: string, clientX: number, clientY: number): PointerEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX,
    clientY,
  }) as PointerEvent;

  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event;
}
