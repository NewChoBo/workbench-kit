/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useContextMenuState } from './useContextMenuState';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  host?.remove();
  host = null;
});

function mountHookHarness() {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);

  let api: ReturnType<typeof useContextMenuState<string>> | null = null;

  function Harness() {
    api = useContextMenuState<string>();
    return (
      <div
        data-state={api.state ? `${api.state.target}:${api.state.x}:${api.state.y}` : 'closed'}
      />
    );
  }

  act(() => {
    root?.render(<Harness />);
  });

  if (api === null) {
    throw new Error('Hook harness failed to mount');
  }

  return {
    getStateLabel: () => host?.querySelector('[data-state]')?.getAttribute('data-state') ?? '',
    api: () => {
      if (api === null) {
        throw new Error('Hook API unavailable');
      }
      return api;
    },
    rerender: () => {
      act(() => {
        root?.render(<Harness />);
      });
    },
  };
}

describe('useContextMenuState', () => {
  it('opens from a pointer event and stores target coordinates', () => {
    const harness = mountHookHarness();
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      clientX: 42,
      clientY: 84,
    };

    act(() => {
      harness.api().open(event, 'item-a');
    });
    harness.rerender();

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(harness.getStateLabel()).toBe('item-a:42:84');
  });

  it('opens at an explicit position and closes', () => {
    const harness = mountHookHarness();

    act(() => {
      harness.api().openAt({ x: 10, y: 20 }, 'overflow');
    });
    harness.rerender();
    expect(harness.getStateLabel()).toBe('overflow:10:20');

    act(() => {
      harness.api().close();
    });
    harness.rerender();
    expect(harness.getStateLabel()).toBe('closed');
  });
});
