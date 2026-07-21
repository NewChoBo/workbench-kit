/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SplitView } from './SplitView';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('SplitView', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.classList.remove(
      'ui-workbench-split-view-resizing',
      'ui-workbench-split-view-resizing--vertical',
    );
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

    expect(splitView.classList.contains('is-dragging')).toBe(true);
    expect(document.documentElement.classList.contains('ui-workbench-split-view-resizing')).toBe(
      true,
    );

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
    expect(splitView.classList.contains('is-dragging')).toBe(false);
    expect(document.documentElement.classList.contains('ui-workbench-split-view-resizing')).toBe(
      false,
    );

    await act(async () => {
      root.unmount();
    });
  });

  it('clears resize drag state when unmounted during a drag', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SplitView
          orientation="vertical"
          primary={<aside>Primary</aside>}
          primarySizePercent={20}
          secondary={<main>Secondary</main>}
        />,
      );
    });

    const separator = container.querySelector('.ui-workbench-split-view__separator') as HTMLElement;
    Object.defineProperty(separator, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });

    await act(async () => {
      separator.dispatchEvent(createPointerLikeEvent('pointerdown', 0, 200));
    });

    expect(document.documentElement.classList.contains('ui-workbench-split-view-resizing')).toBe(
      true,
    );
    expect(
      document.documentElement.classList.contains('ui-workbench-split-view-resizing--vertical'),
    ).toBe(true);

    await act(async () => {
      root.unmount();
    });

    expect(document.documentElement.classList.contains('ui-workbench-split-view-resizing')).toBe(
      false,
    );
    expect(
      document.documentElement.classList.contains('ui-workbench-split-view-resizing--vertical'),
    ).toBe(false);
  });

  it('commits pointer resizing in pixels without changing stored size on window resize', async () => {
    const onPrimarySizePxChange = vi.fn();
    const onPrimarySizePxPreviewChange = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SplitView
          primary={<aside>Primary</aside>}
          primarySizePx={260}
          primarySizeUnit="pixels"
          secondary={<main>Secondary</main>}
          onPrimarySizePxChange={onPrimarySizePxChange}
          onPrimarySizePxPreviewChange={onPrimarySizePxPreviewChange}
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

    expect(splitView.getAttribute('data-primary-size-unit')).toBe('pixels');
    expect(splitView.style.getPropertyValue('--ui-workbench-split-primary-size')).toBe('260px');
    expect(separator.getAttribute('aria-valuenow')).toBe('260');

    await act(async () => {
      separator.dispatchEvent(createPointerLikeEvent('pointerdown', 260, 0));
    });

    await act(async () => {
      separator.dispatchEvent(createPointerLikeEvent('pointermove', 320, 0));
    });

    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });

    expect(onPrimarySizePxChange).not.toHaveBeenCalled();
    expect(splitView.style.getPropertyValue('--ui-workbench-split-primary-size')).toBe('320px');
    expect(onPrimarySizePxPreviewChange).toHaveBeenCalledWith(320);

    // Parent re-render with the old controlled size must not snap the drag preview back.
    await act(async () => {
      root.render(
        <SplitView
          primary={<aside>Primary</aside>}
          primarySizePx={260}
          primarySizeUnit="pixels"
          secondary={<main>Secondary</main>}
          onPrimarySizePxChange={onPrimarySizePxChange}
          onPrimarySizePxPreviewChange={onPrimarySizePxPreviewChange}
        />,
      );
    });

    expect(splitView.style.getPropertyValue('--ui-workbench-split-primary-size')).toBe('320px');
    expect(separator.getAttribute('aria-valuenow')).toBe('320');

    await act(async () => {
      separator.dispatchEvent(createPointerLikeEvent('pointerup', 320, 0));
    });

    expect(onPrimarySizePxChange).toHaveBeenCalledTimes(1);
    expect(onPrimarySizePxChange).toHaveBeenCalledWith(320);
    expect(splitView.style.getPropertyValue('--ui-workbench-split-primary-size')).toBe('320px');
    expect(separator.getAttribute('aria-valuenow')).toBe('320');

    await act(async () => {
      root.unmount();
    });
  });

  it('sizes the secondary track in secondary-fixed mode without waiting on container measure', async () => {
    const onSecondarySizePxChange = vi.fn();
    const onSecondarySizePxPreviewChange = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SplitView
          layoutMode="secondary-fixed"
          maxSecondarySizePx={400}
          minPrimarySizePx={200}
          minSecondarySizePx={140}
          orientation="vertical"
          primary={<aside>Primary</aside>}
          secondary={<main>Secondary</main>}
          secondarySizePx={200}
          onSecondarySizePxChange={onSecondarySizePxChange}
          onSecondarySizePxPreviewChange={onSecondarySizePxPreviewChange}
        />,
      );
    });

    const splitView = container.querySelector('.ui-workbench-split-view') as HTMLElement;
    const separator = container.querySelector('.ui-workbench-split-view__separator') as HTMLElement;

    expect(splitView.getAttribute('data-layout-mode')).toBe('secondary-fixed');
    expect(splitView.style.getPropertyValue('--ui-workbench-split-secondary-size')).toBe('200px');
    expect(splitView.style.getPropertyValue('--ui-workbench-split-min-primary-size')).toBe('200px');
    expect(separator.getAttribute('aria-valuenow')).toBe('200');

    Object.defineProperty(splitView, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          bottom: 600,
          height: 600,
          left: 0,
          right: 800,
          top: 0,
          width: 800,
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

    // Separator at y=360 → secondary = 600 - 1 - 360 = 239 → clamped by drag resolve.
    await act(async () => {
      separator.dispatchEvent(createPointerLikeEvent('pointerdown', 0, 400));
    });
    await act(async () => {
      separator.dispatchEvent(createPointerLikeEvent('pointermove', 0, 360));
    });
    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });

    expect(onSecondarySizePxChange).not.toHaveBeenCalled();
    expect(splitView.style.getPropertyValue('--ui-workbench-split-secondary-size')).toBe('239px');
    expect(onSecondarySizePxPreviewChange).toHaveBeenCalledWith(239);

    await act(async () => {
      separator.dispatchEvent(createPointerLikeEvent('pointerup', 0, 360));
    });

    expect(onSecondarySizePxChange).toHaveBeenCalledTimes(1);
    expect(onSecondarySizePxChange).toHaveBeenCalledWith(239);

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
