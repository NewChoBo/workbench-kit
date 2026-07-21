/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { Modal } from './Modal';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('Modal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a workbench window with titlebar controls', () => {
    const markup = renderToStaticMarkup(
      <Modal title="Basic" onClose={() => undefined}>
        Content
      </Modal>,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('ui-modal__surface');
    expect(markup).toContain('ui-modal__titlebar-drag');
    expect(markup).toContain('ui-modal__body');
    expect(markup).not.toContain('ui-scroll-area--both');
    expect(markup).toContain('aria-label="Maximize modal"');
    expect(markup).toContain('ui-modal__resize-handle--se');
  });

  it('can opt modal body into shared scroll styling', () => {
    const markup = renderToStaticMarkup(
      <Modal title="Scrollable" bodyScroll="auto" onClose={() => undefined}>
        Content
      </Modal>,
    );

    expect(markup).toContain('ui-modal__body');
    expect(markup).toContain('ui-scroll-area--both');
    expect(markup).toContain('ui-scroll-area--stable-gutter');
    expect(markup).toContain('ui-workbench-scrollbar');
  });

  it('can start maximized and expose the restore control', () => {
    const markup = renderToStaticMarkup(
      <Modal title="Settings" defaultMaximized onClose={() => undefined}>
        Content
      </Modal>,
    );

    expect(markup).toContain('data-maximized="true"');
    expect(markup).toContain('aria-label="Restore modal"');
    expect(markup).toContain('codicon-chrome-restore');
  });

  it('moves from titlebar drag and toggles maximize/restore', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <Modal title="Settings" defaultHeight={300} defaultWidth={400} onClose={() => undefined}>
          Content
        </Modal>,
      );
    });

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement | null;
    const titlebarDrag = container.querySelector('.ui-modal__titlebar-drag') as HTMLElement | null;
    expect(dialog).not.toBeNull();
    expect(titlebarDrag).not.toBeNull();
    expect(dialog?.getAttribute('style')).toContain('left: 200px');
    expect(dialog?.getAttribute('style')).toContain('top: 150px');

    await act(async () => {
      titlebarDrag?.dispatchEvent(createPointerLikeEvent('pointerdown', 200, 120));
    });

    await act(async () => {
      window.dispatchEvent(createPointerLikeEvent('pointermove', 260, 160));
    });

    await act(async () => {
      window.dispatchEvent(createPointerLikeEvent('pointerup', 260, 160));
    });

    expect(dialog?.getAttribute('style')).toContain('left: 260px');
    expect(dialog?.getAttribute('style')).toContain('top: 190px');

    const maximizeButton = container.querySelector(
      'button[aria-label="Maximize modal"]',
    ) as HTMLButtonElement | null;
    expect(maximizeButton).not.toBeNull();

    await act(async () => {
      maximizeButton?.click();
    });

    expect(dialog?.dataset.maximized).toBe('true');
    expect(dialog?.getAttribute('style') ?? '').not.toContain('left:');
    const restoreButton = container.querySelector(
      'button[aria-label="Restore modal"]',
    ) as HTMLButtonElement | null;
    expect(restoreButton).not.toBeNull();

    await act(async () => {
      restoreButton?.click();
    });

    expect(dialog?.dataset.maximized).toBeUndefined();

    await act(async () => {
      root.unmount();
    });
  });

  it('keeps titlebar controls clickable', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });

    let closed = false;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <Modal
          title="Settings"
          defaultHeight={300}
          defaultWidth={400}
          onClose={() => {
            closed = true;
          }}
        >
          Content
        </Modal>,
      );
    });

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement | null;
    const maximizeButton = container.querySelector(
      'button[aria-label="Maximize modal"]',
    ) as HTMLButtonElement | null;
    const closeButton = container.querySelector(
      'button[aria-label="Close modal"]',
    ) as HTMLButtonElement | null;

    expect(dialog).not.toBeNull();
    expect(maximizeButton).not.toBeNull();
    expect(closeButton).not.toBeNull();

    await act(async () => {
      maximizeButton?.click();
    });

    expect(dialog?.dataset.maximized).toBe('true');

    await act(async () => {
      closeButton?.click();
    });

    expect(closed).toBe(true);

    await act(async () => {
      root.unmount();
    });
  });
});

function createPointerLikeEvent(
  type: string,
  clientX: number,
  clientY: number,
  target?: EventTarget,
): PointerEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX,
    clientY,
  }) as PointerEvent;

  Object.defineProperty(event, 'pointerId', { value: 1 });
  if (target) {
    Object.defineProperty(event, 'target', { value: target });
    Object.defineProperty(event, 'currentTarget', { value: target });
  }

  return event;
}
