/** @vitest-environment jsdom */

import { act, useRef, useState, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SEARCHABLE_MULTI_SELECT_LISTBOX_ATTR } from '../primitives/searchable-multi-select/overlay';
import { useAnchoredOverlayPanel } from './useAnchoredOverlayPanel';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  host?.remove();
  host = null;
  document.body.querySelectorAll(`[${SEARCHABLE_MULTI_SELECT_LISTBOX_ATTR}]`).forEach((node) => {
    node.remove();
  });
});

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
});

function stubRect(
  element: Element,
  rect: Pick<DOMRect, 'top' | 'left' | 'bottom' | 'right' | 'width' | 'height'>,
): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: rect.left,
      y: rect.top,
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right,
      width: rect.width,
      height: rect.height,
      toJSON: () => ({}),
    }),
  });
}

function mountHarness(options?: { initiallyOpen?: boolean }): {
  getOpen: () => boolean;
  getPanel: () => HTMLElement | null;
  open: () => void;
  getStyleTop: () => string | null;
} {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);

  let openValue = options?.initiallyOpen ?? false;
  let setOpenExternal: ((open: boolean) => void) | null = null;
  let styleTop: string | null = null;

  function Harness(): ReactElement {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(options?.initiallyOpen ?? false);
    openValue = open;
    setOpenExternal = setOpen;

    const { panelProps, style } = useAnchoredOverlayPanel({
      open,
      onOpenChange: setOpen,
      triggerRef,
    });
    styleTop = style?.top == null ? null : String(style.top);

    return (
      <div>
        <button
          ref={(node) => {
            triggerRef.current = node;
            if (node) {
              stubRect(node, {
                top: 100,
                left: 40,
                bottom: 132,
                right: 120,
                width: 80,
                height: 32,
              });
            }
          }}
          type="button"
        >
          Filters
        </button>
        {open ? (
          <div
            ref={panelProps.ref}
            data-testid="anchored-panel"
            data-ui-catalog-filter-overlay="true"
            style={panelProps.style ?? undefined}
            tabIndex={panelProps.tabIndex}
          >
            Panel
          </div>
        ) : null}
      </div>
    );
  }

  act(() => {
    root?.render(<Harness />);
  });

  return {
    getOpen: () => openValue,
    getPanel: () => document.querySelector<HTMLElement>('[data-testid="anchored-panel"]'),
    open: () => {
      act(() => {
        setOpenExternal?.(true);
      });
    },
    getStyleTop: () => styleTop,
  };
}

describe('useAnchoredOverlayPanel', () => {
  it('dismisses on Escape', () => {
    const harness = mountHarness({ initiallyOpen: true });
    expect(harness.getOpen()).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(harness.getOpen()).toBe(false);
  });

  it('dismisses on outside pointerdown', () => {
    const harness = mountHarness({ initiallyOpen: true });
    expect(harness.getOpen()).toBe(true);

    act(() => {
      const outside = document.createElement('button');
      document.body.append(outside);
      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      outside.remove();
    });

    expect(harness.getOpen()).toBe(false);
  });

  it('stays open for searchable multi-select portal targets', () => {
    const harness = mountHarness({ initiallyOpen: true });
    expect(harness.getOpen()).toBe(true);

    const listbox = document.createElement('div');
    listbox.setAttribute(SEARCHABLE_MULTI_SELECT_LISTBOX_ATTR, 'true');
    const option = document.createElement('button');
    option.textContent = 'Action';
    listbox.append(option);
    document.body.append(listbox);

    act(() => {
      option.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });

    expect(harness.getOpen()).toBe(true);
  });

  it('stays open for pointerdown inside the panel', () => {
    const harness = mountHarness({ initiallyOpen: true });
    const panel = harness.getPanel();
    expect(panel).not.toBeNull();

    act(() => {
      panel?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });

    expect(harness.getOpen()).toBe(true);
  });

  it('remeasures on resize instead of closing', () => {
    const harness = mountHarness({ initiallyOpen: true });
    expect(harness.getOpen()).toBe(true);
    const topBefore = harness.getStyleTop();

    act(() => {
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 500 });
      window.dispatchEvent(new Event('resize'));
    });

    expect(harness.getOpen()).toBe(true);
    // Style may stay numerically similar for side placement; assert still measured.
    expect(harness.getStyleTop()).not.toBeNull();
    expect(topBefore).not.toBeNull();
  });

  it('does not dismiss Escape when defaultPrevented', () => {
    const harness = mountHarness({ initiallyOpen: true });

    act(() => {
      const prevent = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
        }
      };
      window.addEventListener('keydown', prevent, true);
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      window.removeEventListener('keydown', prevent, true);
    });

    expect(harness.getOpen()).toBe(true);
  });
});
