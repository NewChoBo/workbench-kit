/** @vitest-environment jsdom */

import { act, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SplitView } from './SplitView';
import { Select } from '../../primitives/select/Select';
import { WorkbenchOverlaysProvider } from '../chrome/workbenchOverlaysContext';
import { WorkbenchModalPortal } from '../chrome/WorkbenchModalPortal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('SplitView', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.classList.remove(
      'ui-workbench-split-view-resizing',
      'ui-workbench-split-view-resizing--vertical',
    );
  });

  for (const orientation of ['horizontal', 'vertical'] as const) {
    for (const hiddenSide of ['primary', 'secondary'] as const) {
      it(`fills the remaining ${orientation} track when the ${hiddenSide} pane is hidden directly`, async () => {
        const container = document.createElement('div');
        document.body.append(container);
        const root = createRoot(container);
        const mounted = vi.fn();
        const resized = vi.fn();
        function StatefulPane({ name }: { name: string }) {
          const [count, setCount] = useState(0);
          useEffect(() => {
            mounted(name);
          }, [name]);
          return (
            <button onClick={() => setCount(count + 1)}>
              {name}:{count}
            </button>
          );
        }
        const render = async (hidden: boolean) => {
          await act(async () =>
            root.render(
              <SplitView
                orientation={orientation}
                primary={<StatefulPane name="Primary" />}
                secondary={<StatefulPane name="Secondary" />}
                primaryHidden={hiddenSide === 'primary' && hidden}
                secondaryHidden={hiddenSide === 'secondary' && hidden}
                primarySizePercent={40}
                onPrimarySizePercentChange={resized}
              />,
            ),
          );
        };
        await render(false);
        const split = container.querySelector<HTMLElement>('.ui-workbench-split-view')!;
        const primary = split.querySelector<HTMLElement>('.ui-workbench-split-view__primary')!;
        const secondary = split.querySelector<HTMLElement>('.ui-workbench-split-view__secondary')!;
        const separator = split.querySelector<HTMLElement>('[role="separator"]')!;
        const remaining = hiddenSide === 'primary' ? secondary : primary;
        const inactive = hiddenSide === 'primary' ? primary : secondary;
        const remainingButton = remaining.querySelector<HTMLButtonElement>('button')!;
        await act(async () => remainingButton.click());
        await render(true);
        // Existing collapse CSS is the shared geometry owner; direct props now select it.
        expect(split.classList.contains(`ui-workbench-split-view--${hiddenSide}-collapsed`)).toBe(
          true,
        );
        expect(split.dataset.orientation).toBe(orientation);
        expect(inactive.hidden).toBe(true);
        expect(inactive.hasAttribute('inert')).toBe(true);
        expect(remaining.hidden).toBe(false);
        expect(separator.hidden).toBe(true);
        expect(separator.hasAttribute('inert')).toBe(true);
        expect(separator.tabIndex).toBe(-1);
        expect(remaining.querySelector('button')).toBe(remainingButton);
        expect(remainingButton.textContent).toContain(':1');
        expect(mounted).toHaveBeenCalledTimes(2);
        expect(resized).not.toHaveBeenCalled();
        await render(false);
        expect(split.classList.contains(`ui-workbench-split-view--${hiddenSide}-collapsed`)).toBe(
          false,
        );
        expect(split.style.getPropertyValue('--ui-workbench-split-primary-size')).toBe('40%');
        expect(separator.hidden).toBe(false);
        expect(remaining.querySelector('button')).toBe(remainingButton);
        expect(mounted).toHaveBeenCalledTimes(2);
        await act(async () => root.unmount());
      });
    }
  }

  it.each([false, true])(
    'passes through omitted overlay ownership without reparenting (inherited=%s)',
    async (inherited) => {
      const container = document.createElement('div');
      const overlays = document.createElement('div');
      document.body.append(container, overlays);
      const root = createRoot(container);
      const render = async (size: number) => {
        const split = (
          <SplitView
            primary={
              <WorkbenchModalPortal>
                <div data-test-portal="passthrough">Portal content</div>
              </WorkbenchModalPortal>
            }
            secondary={<main>Editor</main>}
            primarySizePercent={size}
          />
        );
        await act(async () =>
          root.render(
            inherited ? (
              <WorkbenchOverlaysProvider container={overlays}>{split}</WorkbenchOverlaysProvider>
            ) : (
              split
            ),
          ),
        );
      };
      await render(40);
      const portal = document.body.querySelector('[data-test-portal="passthrough"]')!;
      expect(portal).not.toBeNull();
      expect(portal.parentElement).toBe(inherited ? overlays : document.body);
      await render(50);
      expect(document.body.querySelector('[data-test-portal="passthrough"]')).toBe(portal);
      expect(portal.parentElement).toBe(inherited ? overlays : document.body);
      expect(document.body.querySelector('.ui-workbench-pane-overlays')).toBeNull();
      await act(async () => root.unmount());
    },
  );

  it('preserves authored child identity when opt-in hidden props are added and omitted again', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const mounts = vi.fn();
    function Draft() {
      const [count, setCount] = useState(0);
      useEffect(() => {
        mounts();
      }, []);
      return <button onClick={() => setCount((value) => value + 1)}>Draft:{count}</button>;
    }
    const render = async (primaryHidden?: boolean) => {
      await act(async () =>
        root.render(
          <SplitView
            primaryHidden={primaryHidden}
            primary={<Draft />}
            secondary={<main>Editor</main>}
          />,
        ),
      );
    };
    await render();
    const draft = container.querySelector<HTMLButtonElement>('button')!;
    await act(async () => draft.click());
    await render(true);
    await render();
    expect(container.querySelector('button')).toBe(draft);
    expect(draft.textContent).toBe('Draft:1');
    expect(mounts).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-workbench-split-overlay-scope]')).toBeNull();
    expect(document.body.querySelector('.ui-workbench-pane-overlays')).toBeNull();
    await act(async () => root.unmount());
  });

  it('retains and suspends an open Select in a directly hidden standalone pane', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const changed = vi.fn();
    const geometry = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const width = this.classList.contains('ui-workbench-split-view') ? 800 : 160;
        const height = this.classList.contains('ui-workbench-split-view') ? 500 : 28;
        return {
          left: 0,
          top: 40,
          width,
          height,
          right: width,
          bottom: 40 + height,
          x: 0,
          y: 40,
          toJSON: () => ({}),
        };
      });
    const render = async (hidden: boolean) => {
      await act(async () =>
        root.render(
          <SplitView
            primary={
              <Select aria-label="Direct chooser" onChange={changed}>
                <option>Alpha</option>
                <option>Beta</option>
              </Select>
            }
            secondary={<button>Secondary</button>}
            primaryHidden={hidden}
          />,
        ),
      );
    };
    await render(false);
    await act(async () => container.querySelector<HTMLButtonElement>('[role="combobox"]')!.click());
    const listbox = document.body.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(listbox).not.toBeNull();
    expect(listbox.closest('.ui-workbench-split-view')).toBeNull();
    await render(true);
    expect(listbox.closest('[hidden][inert]')).not.toBeNull();
    const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    await act(async () => {
      window.dispatchEvent(escape);
      window.dispatchEvent(new Event('pointerdown'));
      window.dispatchEvent(new Event('resize'));
    });
    expect(escape.defaultPrevented).toBe(false);
    expect(changed).not.toHaveBeenCalled();
    await render(false);
    expect(document.body.querySelector('[role="listbox"]')).toBe(listbox);
    expect(listbox.closest('[hidden]')).toBeNull();
    await act(async () => root.unmount());
    expect(document.body.querySelector('[role="listbox"]')).toBeNull();
    expect(document.body.querySelector('.ui-workbench-pane-overlays')).toBeNull();
    geometry.mockRestore();
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
